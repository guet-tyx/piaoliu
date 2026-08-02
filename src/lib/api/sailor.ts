import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseReady } from "@/lib/supabase/anon";
import { randomAnonMark } from "@/data/anon-marks";
import { isSafeText } from "@/lib/api/moderation";
import {
  levelOfBond,
  pendingBadges,
  type SailorStats,
} from "@/data/collection";
import type { Sailor } from "@/types/social";

/** 本地游客 id（本地模拟池的身份标识） */
export const GUEST_ID = "local-guest";
/** 系统预热瓶署名（冷启动内容投放） */
export const SYSTEM_ID = "system";

const SAILOR_KEY = "drift-sailor";
/** 行为统计（徽章判定/羁绊数据源；真实模式由 action_logs 聚合） */
const STATS_KEY = "drift-stats";
/** 找回码映射（本地模拟；真实模式以 recovery_hash 服务端校验） */
const RECOVERY_KEY = "drift-recovery";
/** 每日一次的行为去重记录（航行 1 天/听歌 3 首等） */
const DAILY_BOND_KEY = "drift-bond-daily";

export interface SailorStatsState extends SailorStats {
  /** 最近一次启航日期 YYYY-MM-DD（投瓶每日限 1，统计按次即可） */
  updatedAt: number;
}

/* ---------- 本地存储工具 ---------- */

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 隐私模式等场景忽略写入失败
  }
}

function localDate(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/* ---------- 船员证 ---------- */

function readLocal(): Sailor | null {
  try {
    const raw = localStorage.getItem(SAILOR_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Sailor;
    if (typeof s.anonMark !== "string") return null;
    // 兼容旧数据（V1.2 新增字段缺省）
    s.bottleStyle = s.bottleStyle ?? "paper";
    s.bondValue = s.bondValue ?? 0;
    s.level = s.level ?? levelOfBond(s.bondValue ?? 0);
    s.nickname = s.nickname ?? null;
    s.badges = s.badges ?? [];
    return s;
  } catch {
    return null;
  }
}

function writeLocal(s: Sailor) {
  writeJson(SAILOR_KEY, s);
}

/** 本地游客船员证（同步版，供 UI 初始渲染兜底） */
export function getLocalSailorSync(): Sailor | null {
  return readLocal();
}

/** 获取（或创建）星尘船员证（FR-9）：本地模拟 / 真实 RPC */
export async function getOrCreateSailor(): Promise<Sailor | null> {
  if (!isSupabaseReady()) {
    const existing = readLocal();
    if (existing) return existing;
    const sailor: Sailor = {
      id: GUEST_ID,
      anonMark: randomAnonMark(),
      bottleStyle: "paper",
      nickname: null,
      bondValue: 0,
      level: 1,
      badges: [],
      createdAt: Date.now(),
    };
    writeLocal(sailor);
    return sailor;
  }

  const sb = getSupabase();
  if (!sb) return null;
  const { data: row, error } = await sb.rpc("get_or_create_sailor");
  if (error || !row) return null;
  const r = (row ?? {}) as Record<string, unknown>;
  return {
    id: typeof r.id === "string" ? r.id : "",
    anonMark: typeof r.anon_mark === "string" ? r.anon_mark : "匿名船客",
    bottleStyle: typeof r.bottle_style === "string" ? r.bottle_style : "paper",
    nickname: (r.nickname as string | null) ?? null,
    bondValue: typeof r.bond_value === "number" ? r.bond_value : 0,
    level: typeof r.level === "number" ? r.level : 1,
    badges: Array.isArray(r.badges) ? (r.badges as string[]) : [],
    createdAt: typeof r.created_at === "string" ? Date.parse(r.created_at) : Date.now(),
  };
}

/* ---------- 昵称（FR-9.1：1-12 字 + 敏感词过滤） ---------- */

export type RenameResult =
  | { ok: true; sailor: Sailor }
  | { ok: false; reason: "length" | "bad-word" | "offline" };

export async function updateNickname(nickname: string): Promise<RenameResult> {
  const trimmed = nickname.trim();
  if (trimmed.length < 1 || trimmed.length > 12) return { ok: false, reason: "length" };
  if (!isSafeText(trimmed).ok) return { ok: false, reason: "bad-word" };

  if (!isSupabaseReady()) {
    const sailor = readLocal();
    if (!sailor) return { ok: false, reason: "offline" };
    sailor.nickname = trimmed;
    writeLocal(sailor);
    return { ok: true, sailor };
  }

  const sb = getSupabase();
  if (!sb) return { ok: false, reason: "offline" };
  const { data: row, error } = await sb.rpc("update_nickname", { p_nickname: trimmed });
  if (error || !row) return { ok: false, reason: "offline" };
  const sailor = readLocal() ?? (await getOrCreateSailor());
  if (sailor) {
    sailor.nickname = trimmed;
    writeLocal(sailor);
    return { ok: true, sailor };
  }
  return { ok: false, reason: "offline" };
}

/* ---------- 行为统计（drift-stats） ---------- */

export function readStats(): SailorStatsState {
  return readJson<SailorStatsState>(STATS_KEY, {
    launched: 0,
    picked: 0,
    replied: 0,
    listenStreak: 0,
    maxListenStreak: 0,
    updatedAt: 0,
  });
}

function writeStats(s: SailorStatsState) {
  writeJson(STATS_KEY, s);
}

/** 行为计数（投瓶/拾瓶/回信），返回最新统计 */
export function bumpStat(kind: "launched" | "picked" | "replied"): SailorStatsState {
  const stats = readStats();
  stats[kind] += 1;
  stats.updatedAt = Date.now();
  writeStats(stats);
  return stats;
}

/** 连续听歌推进（听歌 3 首触发 listen_3）：返回最新统计 */
export function pushListenStreak(): SailorStatsState {
  const stats = readStats();
  stats.listenStreak += 1;
  if (stats.listenStreak > stats.maxListenStreak) {
    stats.maxListenStreak = stats.listenStreak;
  }
  stats.updatedAt = Date.now();
  writeStats(stats);
  return stats;
}

/** 听歌中断（暂停超过窗口/切歌间隔） */
export function resetListenStreak(): SailorStatsState {
  const stats = readStats();
  stats.listenStreak = 0;
  writeStats(stats);
  return stats;
}

/** 徽章达成判定：返回本次新解锁的徽章 */
export function checkBadges(stats: SailorStats, unlocked: string[]): string[] {
  return pendingBadges(stats, unlocked).map((b) => b.id);
}

/* ---------- 羁绊（FR-8.3：航行 1 天 +1 / 投瓶 +1 / 回信 +1 / 拾瓶 +1） ---------- */

export type BondKind = "daily" | "launch" | "pick" | "reply" | "listen";

/**
 * 羁绊 +1 并重算等级；oncePerDay 的行为（航行/听歌 3 首）每日限一次。
 * 返回更新后的船员证（null 表示无船员证）
 */
export async function earnBond(kind: BondKind, oncePerDay = false): Promise<Sailor | null> {
  if (!isSupabaseReady()) {
    const sailor = readLocal();
    if (!sailor) return null;
    if (oncePerDay) {
      const daily = readJson<Record<string, string>>(DAILY_BOND_KEY, {});
      const today = localDate();
      if (daily[kind] === today) return sailor;
      daily[kind] = today;
      writeJson(DAILY_BOND_KEY, daily);
    }
    sailor.bondValue += 1;
    sailor.level = levelOfBond(sailor.bondValue);
    writeLocal(sailor);
    return sailor;
  }

  const sb = getSupabase();
  if (!sb) return null;
  const { data: row, error } = await sb.rpc("earn_bond", { p_kind: kind });
  if (error || !row) return null;
  const sailor = readLocal();
  if (sailor) {
    const r = row as Record<string, unknown>;
    sailor.bondValue = typeof r.bond_value === "number" ? r.bond_value : sailor.bondValue;
    sailor.level = typeof r.level === "number" ? r.level : sailor.level;
    writeLocal(sailor);
  }
  return sailor ?? null;
}

/* ---------- 跨设备找回（FR-9.3 渐进：本地模拟可演示；真实模式联调后生效） ---------- */

export interface RecoveryRecord {
  code: string;
  sailor: Sailor;
  createdAt: number;
}

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去易混淆字符
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

/** 生成找回码（本地模拟：码 ↔ 船员证快照映射；真实模式仅返回码，哈希存服务端） */
export function genRecoveryCode(): string | null {
  const sailor = readLocal();
  if (!sailor) return null;
  const code = genCode();
  const record: RecoveryRecord = { code, sailor: { ...sailor }, createdAt: Date.now() };
  const records = readJson<RecoveryRecord[]>(RECOVERY_KEY, []);
  records.push(record);
  writeJson(RECOVERY_KEY, records);
  return code;
}

export type ClaimResult =
  | { ok: true; sailor: Sailor }
  | { ok: false; reason: "invalid" | "offline" };

/** 输入找回码恢复船员证（本地模拟：命中映射即恢复；真实模式走 claim_recovery RPC） */
export async function claimRecoveryCode(code: string): Promise<ClaimResult> {
  const normalized = code.trim().toUpperCase();
  if (!isSupabaseReady()) {
    const records = readJson<RecoveryRecord[]>(RECOVERY_KEY, []);
    const hit = records.find((r) => r.code === normalized);
    if (!hit) return { ok: false, reason: "invalid" };
    const sailor: Sailor = { ...hit.sailor, id: GUEST_ID, badges: [...hit.sailor.badges] };
    writeLocal(sailor);
    return { ok: true, sailor };
  }
  // 真实模式：claim_recovery RPC 联调后启用（002_collection.sql 注释预留）
  return { ok: false, reason: "offline" };
}

/** 当前找回码（展示用） */
export function getRecoveryCodes(): RecoveryRecord[] {
  return readJson<RecoveryRecord[]>(RECOVERY_KEY, []);
}
