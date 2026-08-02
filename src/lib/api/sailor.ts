import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseReady } from "@/lib/supabase/anon";
import { randomAnonMark } from "@/data/anon-marks";
import { isSafeText } from "@/lib/api/moderation";
import {
  levelOfBond,
  pendingBadges,
  type SailorStats,
} from "@/data/collection";
import type { DailyActivity, Sailor } from "@/types/social";

/** 本地游客 id（本地模拟池的身份标识） */
export const GUEST_ID = "local-guest";
/** 系统预热瓶署名（冷启动内容投放） */
export const SYSTEM_ID = "system";

const SAILOR_KEY = "drift-sailor";
/** 行为统计（徽章判定/羁绊数据源；真实模式由 action_logs 聚合） */
const STATS_KEY = "drift-stats";
/** 按天行为活动（V2.0 周报「本周」统计源） */
const DAILY_KEY = "drift-daily-activity";
/** 找回码映射（本地模拟；真实模式以 recovery_hash 服务端校验） */
const RECOVERY_KEY = "drift-recovery";
/** 每日一次的行为去重记录（航行 1 天/听歌 3 首等） */
const DAILY_BOND_KEY = "drift-bond-daily";

interface SailorStatsState extends SailorStats {
  /** 每首歌播放次数（V2.0 周报热门航线源） */
  trackCounts: Record<string, number>;
  /** 按天播放次数（V2.0 周报收听星图源） */
  listenByDay: Record<string, number>;
  /** 最近一次行为时间戳 */
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

type RenameResult =
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
  // 兼容旧结构（V2.0 前无 trackCounts/listenByDay）：缺省字段合并默认值
  const raw = readJson<Partial<SailorStatsState>>(STATS_KEY, {});
  return {
    launched: raw.launched ?? 0,
    picked: raw.picked ?? 0,
    replied: raw.replied ?? 0,
    listenStreak: raw.listenStreak ?? 0,
    maxListenStreak: raw.maxListenStreak ?? 0,
    trackCounts: raw.trackCounts ?? {},
    listenByDay: raw.listenByDay ?? {},
    updatedAt: raw.updatedAt ?? 0,
  };
}

function writeStats(s: SailorStatsState) {
  writeJson(STATS_KEY, s);
}

/** 按天活动记录（周报「本周」聚合源） */
export function readDailyActivity(): DailyActivity[] {
  return readJson<DailyActivity[]>(DAILY_KEY, []);
}

function bumpDaily(kind: "launched" | "picked" | "replied" | "listen") {
  const today = localDate();
  const list = readDailyActivity();
  const existing = list.find((d) => d.date === today);
  const cur = existing ?? {
    date: today,
    launched: 0,
    picked: 0,
    replied: 0,
    listenCount: 0,
  };
  if (kind === "launched") cur.launched += 1;
  else if (kind === "picked") cur.picked += 1;
  else if (kind === "replied") cur.replied += 1;
  else cur.listenCount += 1;
  // 今天已有条目则更新，否则追加新条目（首写不丢失）
  const next = existing
    ? list.map((d) => (d.date === today ? cur : d))
    : [...list, cur];
  // 只保留最近 60 天（防无限增长）
  writeJson(DAILY_KEY, next.slice(-60));
}

/** 行为计数（投瓶/拾瓶/回信），返回最新统计 */
export function bumpStat(kind: "launched" | "picked" | "replied"): SailorStatsState {
  const stats = readStats();
  stats[kind] += 1;
  stats.updatedAt = Date.now();
  writeStats(stats);
  bumpDaily(kind);
  return stats;
}

/** 听歌记录（周报源 + 连续计数）：trackCounts/listenByDay 与羁绊 listen3 解耦，每次切歌记录 */
export function pushListen(trackId: string): SailorStatsState {
  const stats = readStats();
  stats.listenStreak += 1;
  if (stats.listenStreak > stats.maxListenStreak) {
    stats.maxListenStreak = stats.listenStreak;
  }
  stats.trackCounts[trackId] = (stats.trackCounts[trackId] ?? 0) + 1;
  const today = localDate();
  stats.listenByDay[today] = (stats.listenByDay[today] ?? 0) + 1;
  stats.updatedAt = Date.now();
  writeStats(stats);
  bumpDaily("listen");
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

interface RecoveryRecord {
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

type ClaimResult =
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
