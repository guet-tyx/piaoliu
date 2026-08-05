import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseReady } from "@/lib/supabase/anon";
import { randomAnonMark } from "@/data/anon-marks";
import { isSafeText } from "@/lib/api/moderation";
import { readStorage, writeStorage, STORAGE } from "@/lib/storage";
import { localDate } from "@/lib/time";
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

/** 键名统一走 src/lib/storage.ts 注册表（键集中声明，杜绝散落字面量） */
const SAILOR_KEY = STORAGE.sailor;
/** 行为统计（徽章判定/羁绊数据源；真实模式由 action_logs 聚合） */
const STATS_KEY = STORAGE.stats;
/** 按天行为活动（V2.0 周报「本周」统计源） */
const DAILY_KEY = STORAGE.dailyActivity;
/** 找回码映射（本地模拟；真实模式以 recovery_hash 服务端校验） */
const RECOVERY_KEY = STORAGE.recovery;
/** 每日一次的行为去重记录（航行 1 天/听歌 3 首等） */
const DAILY_BOND_KEY = STORAGE.bondDaily;

interface SailorStatsState extends SailorStats {
  /** 每首歌播放次数（V2.0 周报热门航线源） */
  trackCounts: Record<string, number>;
  /** 按天播放次数（V2.0 周报收听星图源） */
  listenByDay: Record<string, number>;
  /** 最近一次行为时间戳 */
  updatedAt: number;
}

/* ---------- 本地存储（统一 readStorage/writeStorage） ---------- */

function readLocal(): Sailor | null {
  const s = readStorage<Sailor>(SAILOR_KEY, null, (v): boolean => {
    if (typeof v !== "object" || v === null) return false;
    return typeof (v as { anonMark?: unknown }).anonMark === "string";
  });
  if (!s) return null;
  // 兼容旧数据（V1.2 新增字段缺省）
  s.bottleStyle = s.bottleStyle ?? "paper";
  s.bondValue = s.bondValue ?? 0;
  s.level = s.level ?? levelOfBond(s.bondValue ?? 0);
  s.nickname = s.nickname ?? null;
  s.badges = s.badges ?? [];
  return s;
}

function writeLocal(s: Sailor) {
  writeStorage(SAILOR_KEY, s);
}

/** 本地游客船员证（同步版，供 UI 初始渲染兜底） */
export function getLocalSailorSync(): Sailor | null {
  return readLocal();
}

/** Supabase sailors 行（snake_case）→ 本地模型（camelCase）；RPC 返回类型宽，逐字段安全转换 */
export function mapSailorRow(row: unknown): Sailor | null {
  const r = (row ?? {}) as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  return {
    id: r.id,
    anonMark: typeof r.anon_mark === "string" ? r.anon_mark : "匿名船客",
    bottleStyle: typeof r.bottle_style === "string" ? r.bottle_style : "paper",
    nickname: (r.nickname as string | null) ?? null,
    bondValue: typeof r.bond_value === "number" ? r.bond_value : 0,
    level: typeof r.level === "number" ? r.level : 1,
    badges: Array.isArray(r.badges) ? (r.badges as string[]) : [],
    createdAt: typeof r.created_at === "string" ? Date.parse(r.created_at) : Date.now(),
  };
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
  return mapSailorRow(row);
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
  const raw = readStorage<Partial<SailorStatsState>>(STATS_KEY, {});
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
  writeStorage(STATS_KEY, s);
}

/** 按天活动记录（周报「本周」聚合源） */
export function readDailyActivity(): DailyActivity[] {
  return readStorage<DailyActivity[]>(DAILY_KEY, []);
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
  writeStorage(DAILY_KEY, next.slice(-60));
}

/** 行为计数（投瓶/拾瓶/回信），返回最新统计 */
export function bumpStat(kind: "launched" | "picked" | "replied"): SailorStatsState {
  const stats = readStats();
  stats[kind] += 1;
  stats.updatedAt = Date.now();
  writeStats(stats);
  // 真实模式：周报聚合已由服务端 action_logs 承担，本地日活不再累积（徽章判定仍读本地 stats）
  if (!isSupabaseReady()) bumpDaily(kind);
  return stats;
}

/** 听歌记录（周报源 + 连续计数）：trackCounts/listenByDay 与羁绊 listen3 解耦，每次切歌记录 */
export function pushListen(trackId: string): SailorStatsState {
  const stats = readStats();
  stats.listenStreak += 1;
  if (stats.listenStreak > stats.maxListenStreak) {
    stats.maxListenStreak = stats.listenStreak;
  }
  if (!isSupabaseReady()) {
    // 真实模式：周报收听数据由 record_listen RPC 写服务端，本地 trackCounts/listenByDay 不再累积
    stats.trackCounts[trackId] = (stats.trackCounts[trackId] ?? 0) + 1;
    const today = localDate();
    stats.listenByDay[today] = (stats.listenByDay[today] ?? 0) + 1;
  }
  stats.updatedAt = Date.now();
  writeStats(stats);
  if (!isSupabaseReady()) bumpDaily("listen");
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
      const daily = readStorage<Record<string, string>>(DAILY_BOND_KEY, {});
      const today = localDate();
      if (daily[kind] === today) return sailor;
      daily[kind] = today;
      writeStorage(DAILY_BOND_KEY, daily);
    }
    sailor.bondValue += 1;
    sailor.level = levelOfBond(sailor.bondValue);
    writeLocal(sailor);
    return sailor;
  }

  const sb = getSupabase();
  if (!sb) return null;
  // 真实模式：p_once_per_day 由服务端按 action_logs 去重（每日每种限一次）
  const { data: row, error } = await sb.rpc("earn_bond", {
    p_kind: kind,
    p_once_per_day: oncePerDay,
  });
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

/** 生成找回码（本地模拟：码 ↔ 船员证快照映射；真实模式：RPC 存 bcrypt 哈希，返回明文码给用户） */
export async function genRecoveryCode(): Promise<string | null> {
  if (!isSupabaseReady()) {
    const sailor = readLocal();
    if (!sailor) return null;
    const code = genCode();
    const record: RecoveryRecord = { code, sailor: { ...sailor }, createdAt: Date.now() };
    const records = readStorage<RecoveryRecord[]>(RECOVERY_KEY, []);
    records.push(record);
    // 找回码快照只保留最近 3 份（防无限增长；真实模式服务端只存最新哈希）
    writeStorage(RECOVERY_KEY, records.slice(-3));
    return code;
  }
  const sb = getSupabase();
  if (!sb) return null;
  const code = genCode();
  const { error } = await sb.rpc("set_recovery_code", { p_code: code });
  if (error) return null;
  return code;
}

type ClaimResult =
  | { ok: true; sailor: Sailor }
  | { ok: false; reason: "invalid" | "offline" };

/** 输入找回码恢复船员证（本地模拟：命中映射即恢复；真实模式走 claim_recovery RPC，单次有效） */
export async function claimRecoveryCode(code: string): Promise<ClaimResult> {
  const normalized = code.trim().toUpperCase();
  if (!isSupabaseReady()) {
    const records = readStorage<RecoveryRecord[]>(RECOVERY_KEY, []);
    const hit = records.find((r) => r.code === normalized);
    if (!hit) return { ok: false, reason: "invalid" };
    const sailor: Sailor = { ...hit.sailor, id: GUEST_ID, badges: [...hit.sailor.badges] };
    writeLocal(sailor);
    return { ok: true, sailor };
  }
  // 真实模式：claim_recovery RPC（bcrypt 校验 + 行转移 + 单次有效）
  const sb = getSupabase();
  if (!sb) return { ok: false, reason: "offline" };
  const { data, error } = await sb.rpc("claim_recovery", { p_code: normalized });
  if (error || !data) return { ok: false, reason: "invalid" };
  const sailor = mapSailorRow(data);
  if (!sailor) return { ok: false, reason: "invalid" };
  writeLocal(sailor);
  return { ok: true, sailor };
}
