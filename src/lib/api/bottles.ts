import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseReady } from "@/lib/supabase/anon";
import { isSafeText } from "./moderation";
import { GUEST_ID, SYSTEM_ID } from "./sailor";
import { readStorage, writeStorage, STORAGE } from "@/lib/storage";
import { localDate } from "@/lib/time";
import { pickRandom } from "@/lib/random";
import {
  BOTTLE_POOL_MAX,
  BOTTLE_TEXT_MAX,
  BOTTLE_TEXT_MIN,
  LAUNCH_LIMIT,
  PICK_LIMIT,
  REPLIES_MAX,
  REPORTS_MAX,
} from "@/lib/bottle/limits";
import type {
  Bottle,
  DailyLimits,
  LaunchResult,
  PickResult,
  Reply,
  ReplyResult,
  TrackSnapshot,
} from "@/types/social";

/**
 * 纸船漂流查询层（FR-7）：统一接口，isSupabaseReady() 分支
 * - 真实模式：调用 Supabase RPC（launch_bottle / pick_bottle / reply_bottle / fetch_inbox …）
 * - 本地模拟：localStorage 模拟池（冷启动预热瓶 + 限额 + 回信），全流程本地可玩
 * 行为契约（限额/防重复拾取/回信可见性）与 archive/docs/ARCHITECTURE.md §5 一致。
 */

/** 系统预热瓶（冷启动内容投放，署名「星海信使」；与 supabase/seed.sql 文案一致） */
const SYSTEM_BOTTLES: Omit<Bottle, "id" | "createdAt" | "pickedBy" | "repliedAt" | "readAt" | "status">[] = [
  {
    authorId: SYSTEM_ID,
    text: "今晚的风很适合漂流。耳机里放一首没听过的歌，把心事交给星海。",
    track: { t: "信风", tag: "后摇", s: "一支你没听过的乐队 · 后摇", cover: "/images/cover-anime-1.png" },
    bottleStyle: "paper",
    anonMark: "星海信使·SEED",
    isSystem: true,
  },
  {
    authorId: SYSTEM_ID,
    text: "第 1001 个失眠的夜晚。歌单翻到底，还是回到了第一首。有人和我一样吗。",
    track: { t: "凌晨三点半的港", tag: "爵士嘻哈", s: "爵士嘻哈 · 失眠人士精选", cover: "/images/cover-anime-2.png" },
    bottleStyle: "paper",
    anonMark: "星海信使·SEED",
    isSystem: true,
  },
  {
    authorId: SYSTEM_ID,
    text: "刚下夜班。这座城市睡了一半，醒着一半。我把耳机调大声了一点。",
    track: { t: "晚风告别式", tag: "环境电子", s: "环境电子 · 深夜电台", cover: "/images/cover-anime-4.png" },
    bottleStyle: "paper",
    anonMark: "星海信使·SEED",
    isSystem: true,
  },
  {
    authorId: SYSTEM_ID,
    text: "和朋友走散了。约好在这里放一艘纸船，她说看到就会明白。",
    track: { t: "雨季漂流记", tag: "氛围", s: "氛围 · 下雨天限定", cover: "/images/cover-anime-3.png" },
    bottleStyle: "paper",
    anonMark: "星海信使·SEED",
    isSystem: true,
  },
  {
    authorId: SYSTEM_ID,
    text: "把暗恋藏进一首歌里。如果三年后还记得，我就回来捡这艘船。",
    track: { t: "信风", tag: "后摇", s: "一支你没听过的乐队 · 后摇", cover: "/images/cover-anime-1.png" },
    bottleStyle: "paper",
    anonMark: "星海信使·SEED",
    isSystem: true,
  },
  {
    authorId: SYSTEM_ID,
    text: "考试周第四天。凌晨三点，窗外有鸟在叫。今晚的歌很轻，刚好盖过焦虑。",
    track: { t: "凌晨三点半的港", tag: "爵士嘻哈", s: "爵士嘻哈 · 失眠人士精选", cover: "/images/cover-anime-2.png" },
    bottleStyle: "paper",
    anonMark: "星海信使·SEED",
    isSystem: true,
  },
];

/* ---------- 本地模拟存储（统一走 src/lib/storage.ts 工具） ---------- */

function genId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readPool(): Bottle[] {
  const pool = readStorage<Bottle[]>(STORAGE.bottlesPool, []);
  if (pool.length > 0) return pool;
  // 首次：植入系统预热瓶
  const now = Date.now();
  const seeded: Bottle[] = SYSTEM_BOTTLES.map((b, i) => ({
    ...b,
    id: `sys-${i + 1}`,
    status: "drifting",
    pickedBy: null,
    repliedAt: null,
    readAt: null,
    createdAt: now - i * 60_000, // 错峰投递时间
  }));
  writeStorage(STORAGE.bottlesPool, seeded);
  return seeded;
}

function writePool(pool: Bottle[]) {
  // 存储上限：保留最近 N 艘（防 localStorage 无限增长；最旧的系统预热瓶可被裁剪）
  writeStorage(
    STORAGE.bottlesPool,
    pool.length > BOTTLE_POOL_MAX ? pool.slice(-BOTTLE_POOL_MAX) : pool,
  );
}

function readLimits(): DailyLimits {
  const today = localDate();
  const l = readStorage<DailyLimits>(STORAGE.limits, { date: today, launched: 0, picked: 0 });
  return l.date === today ? l : { date: today, launched: 0, picked: 0 };
}

function writeLimits(l: DailyLimits) {
  writeStorage(STORAGE.limits, l);
}

function readReplies(): Reply[] {
  return readStorage<Reply[]>(STORAGE.replies, []);
}

/** 今日限额快照（UI 提示「今日可投 1 / 可拾 3」；真实模式由服务端 RPC 权威统计） */
export async function getDailyLimits(): Promise<DailyLimits> {
  if (!isSupabaseReady()) return readLimits();
  const sb = getSupabase();
  if (!sb) return { date: localDate(), launched: 0, picked: 0 };
  const { data } = await sb.rpc("get_daily_limits");
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    date: localDate(),
    launched: typeof r.launched === "number" ? r.launched : 0,
    picked: typeof r.picked === "number" ? r.picked : 0,
  };
}

/* ---------- 公开接口 ---------- */

/** 投瓶（FR-7）：限每日 1 个；内容 10-200 字 + 绑定当前播放歌曲快照；style 为瓶面样式（默认纸船，活动期间传限定样式） */
export async function launchBottle(
  text: string,
  track: TrackSnapshot,
  style?: string,
): Promise<LaunchResult> {
  const trimmed = text.trim();
  if (trimmed.length < BOTTLE_TEXT_MIN) return { ok: false, reason: "too-short" };
  if (trimmed.length > BOTTLE_TEXT_MAX) return { ok: false, reason: "too-long" };
  if (!isSafeText(trimmed).ok) return { ok: false, reason: "bad-word" };

  if (!isSupabaseReady()) {
    const limits = readLimits();
    if (limits.launched >= LAUNCH_LIMIT) return { ok: false, reason: "limit" };
    const bottle: Bottle = {
      id: genId(),
      authorId: GUEST_ID,
      text: trimmed,
      track,
      bottleStyle: style ?? "paper",
      anonMark: "你的纸船", // 展示用占位，实际代号由船员证提供
      status: "drifting",
      pickedBy: null,
      isSystem: false,
      createdAt: Date.now(),
      repliedAt: null,
      readAt: null,
    };
    const pool = readPool();
    pool.push(bottle);
    writePool(pool);
    writeLimits({ ...limits, launched: limits.launched + 1 });
    return { ok: true, bottle };
  }

  const sb = getSupabase();
  if (!sb) return { ok: false, reason: "offline" };
  const { data, error } = await sb.rpc("launch_bottle", {
    p_text: trimmed,
    p_track: track,
    p_style: style ?? "paper",
  });
  if (error || !data) {
    return { ok: false, reason: reasonOf(error, "offline") } as LaunchResult;
  }
  return { ok: true, bottle: mapBottleRow(data) };
}

/** 拾瓶（FR-7）：限每日 3 个；随机漂向的瓶子，原子 claim 防重复拾取 */
export async function pickBottle(): Promise<PickResult> {
  if (!isSupabaseReady()) {
    const limits = readLimits();
    if (limits.picked >= PICK_LIMIT) return { ok: false, reason: "limit" };
    const pool = readPool();
    const candidates = pool.filter(
      (b) => b.status === "drifting" && b.authorId !== GUEST_ID,
    );
    if (candidates.length === 0) return { ok: false, reason: "empty" };
    const picked = pickRandom(candidates) ?? candidates[0];
    picked.status = "picked";
    picked.pickedBy = GUEST_ID;
    writePool(pool);
    writeLimits({ ...limits, picked: limits.picked + 1 });
    return { ok: true, bottle: picked };
  }

  const sb = getSupabase();
  if (!sb) return { ok: false, reason: "offline" };
  const { data, error } = await sb.rpc("pick_bottle");
  if (error) return { ok: false, reason: reasonOf(error, "offline") } as PickResult;
  if (!data) return { ok: false, reason: "empty" };
  return { ok: true, bottle: mapBottleRow(data) };
}

/** 回信（FR-7）：仅拾瓶人可回；沿原航线靠岸，仅原投瓶人可见 */
export async function replyBottle(bottleId: string, text: string): Promise<ReplyResult> {
  const trimmed = text.trim();
  if (trimmed.length < BOTTLE_TEXT_MIN) return { ok: false, reason: "too-short" };
  if (trimmed.length > BOTTLE_TEXT_MAX) return { ok: false, reason: "too-long" };
  if (!isSafeText(trimmed).ok) return { ok: false, reason: "bad-word" };

  if (!isSupabaseReady()) {
    const pool = readPool();
    const bottle = pool.find((b) => b.id === bottleId);
    if (!bottle || bottle.pickedBy !== GUEST_ID) return { ok: false, reason: "forbidden" };
    if (bottle.repliedAt !== null) return { ok: false, reason: "limit" };
    const reply: Reply = {
      id: genId(),
      bottleId,
      anonMark: "回信的船客", // 展示用占位
      text: trimmed,
      createdAt: Date.now(),
    };
    const replies = readReplies();
    replies.push(reply);
    // 存储上限：保留最近 N 封回信
    writeStorage(STORAGE.replies, replies.length > REPLIES_MAX ? replies.slice(-REPLIES_MAX) : replies);
    bottle.status = "replied";
    bottle.repliedAt = Date.now();
    writePool(pool);
    return { ok: true, reply };
  }

  const sb = getSupabase();
  if (!sb) return { ok: false, reason: "offline" };
  const { data, error } = await sb.rpc("reply_bottle", { p_bottle_id: bottleId, p_text: trimmed });
  if (error) return { ok: false, reason: reasonOf(error, "offline") } as ReplyResult;
  return { ok: true, reply: mapReplyRow(data) };
}

/** 收件箱（星海来讯）：本人发起且已有回信的瓶子 + 回信列表 */
export async function fetchInbox(): Promise<{ bottle: Bottle; replies: Reply[] }[]> {
  if (!isSupabaseReady()) {
    const pool = readPool();
    const replies = readReplies();
    return pool
      .filter((b) => b.authorId === GUEST_ID && b.repliedAt !== null)
      .map((bottle) => ({
        bottle,
        replies: replies.filter((r) => r.bottleId === bottle.id),
      }));
  }

  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.rpc("fetch_inbox");
  if (error || !data) return [];
  return (data as { bottle: unknown; replies: unknown[] }[]).map((row) => ({
    bottle: mapBottleRow(row.bottle),
    replies: (row.replies as unknown[]).map(mapReplyRow),
  }));
}

/** 星海来讯已读 */
export async function markInboxRead(bottleId: string): Promise<void> {
  if (!isSupabaseReady()) {
    const pool = readPool();
    const bottle = pool.find((b) => b.id === bottleId);
    if (bottle) {
      bottle.readAt = Date.now();
      writePool(pool);
    }
    return;
  }
  const sb = getSupabase();
  if (!sb) return;
  await sb.rpc("mark_inbox_read", { p_bottle_id: bottleId });
}

/** 举报（NFR-1 治理入口；V1.2 支持瓶子与回信两类目标） */
export async function reportBottle(
  targetId: string,
  reason: string,
  targetType: "bottle" | "reply" = "bottle",
): Promise<boolean> {
  if (!isSupabaseReady()) {
    const reports = readStorage<
      { id: string; targetType: string; targetId: string; reason: string; at: number }[]
    >(STORAGE.reports, []);
    reports.push({ id: genId(), targetType, targetId, reason, at: Date.now() });
    // 存储上限：保留最近 N 条举报记录
    writeStorage(
      STORAGE.reports,
      reports.length > REPORTS_MAX ? reports.slice(-REPORTS_MAX) : reports,
    );
    return true;
  }
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.rpc("report_content", {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reason: reason,
  });
  return !error;
}

/** RPC 抛出的错误 message → 业务 reason（服务端 raise 文案见 001/002 迁移；恢复本地路径已有的区分能力） */
type FailReason =
  | "limit"
  | "bad-word"
  | "too-short"
  | "too-long"
  | "forbidden"
  | "empty"
  | "offline";

function reasonOf(error: { message?: string } | null, fallback: FailReason): FailReason {
  const m = error?.message ?? "";
  if (m.includes("limit reached")) return "limit";
  if (m.includes("bad word")) return "bad-word";
  if (m.includes("forbidden")) return "forbidden";
  if (m.includes("already replied")) return "limit";
  if (m.includes("text length")) return "too-short";
  return fallback;
}

/** Supabase 回信行（snake_case）→ 本地模型（camelCase） */
function mapReplyRow(row: unknown): Reply {
  const r = (row ?? {}) as Record<string, unknown>;
  const parseTs = (v: unknown): number | null =>
    typeof v === "string" ? Date.parse(v) : null;
  return {
    id: typeof r.id === "string" ? r.id : "",
    bottleId: typeof r.bottle_id === "string" ? r.bottle_id : "",
    anonMark: typeof r.anon_mark === "string" ? r.anon_mark : "匿名船客",
    text: typeof r.text === "string" ? r.text : "",
    createdAt: parseTs(r.created_at) ?? Date.now(),
  };
}

/** Supabase 行（snake_case）→ 本地模型（camelCase）；RPC 返回类型宽，逐字段安全转换 */
function mapBottleRow(row: unknown): Bottle {
  const r = (row ?? {}) as Record<string, unknown>;
  const track = (r.track_snapshot ?? {}) as TrackSnapshot;
  const parseTs = (v: unknown): number | null =>
    typeof v === "string" ? Date.parse(v) : null;
  return {
    id: typeof r.id === "string" ? r.id : "",
    authorId: typeof r.author_id === "string" ? r.author_id : "",
    text: typeof r.text === "string" ? r.text : "",
    track: {
      t: typeof track.t === "string" ? track.t : "",
      tag: typeof track.tag === "string" ? track.tag : "",
      s: typeof track.s === "string" ? track.s : "",
      cover: typeof track.cover === "string" ? track.cover : "",
    },
    bottleStyle: typeof r.bottle_style === "string" ? r.bottle_style : "paper",
    anonMark: typeof r.anon_mark === "string" ? r.anon_mark : "匿名船客",
    status: (r.status as Bottle["status"]) ?? "drifting",
    pickedBy: typeof r.picked_by === "string" ? r.picked_by : null,
    isSystem: r.is_system === true,
    createdAt: parseTs(r.created_at) ?? Date.now(),
    repliedAt: parseTs(r.replied_at),
    readAt: parseTs(r.read_at),
  };
}
