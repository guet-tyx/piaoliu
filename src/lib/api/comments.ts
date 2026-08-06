import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseReady } from "@/lib/supabase/anon";
import { isSafeText } from "./moderation";
import { getOrCreateSailor } from "./sailor";
import { readStorage, writeStorage, STORAGE } from "@/lib/storage";
import type { SongComment } from "@/types/social";

/**
 * 歌曲留言墙查询层（P1 F-02）：
 * 10-100 字匿名感想；发布后不可编辑/删除；同曲 5 分钟限频；点赞按 anonMark 去重。
 * 本地 drift-song-comments / drift-comment-cooldown，真实模式 song_comments 表 RPC。
 */

/** 感想字数限制 */
export const COMMENT_TEXT_MIN = 10;
export const COMMENT_TEXT_MAX = 100;
/** 同曲发布限频（5 分钟） */
export const COMMENT_COOLDOWN_MS = 5 * 60_000;
/** 本地存储上限（保留最近 N 条） */
export const COMMENTS_MAX = 500;

/** 爬取热评种子（public/data/crawled-comments.json 的评论条目） */
interface CrawledSeedComment {
  text: string;
  liked: number;
}

/** 种子热评作者名池（与 scripts/gen-crawled-data.mjs 一致） */
const SEED_AUTHORS = [
  "星海旅人", "拾星者", "晚风收藏家", "深夜电台客", "纸船水手",
  "流星观测员", "潮汐听客", "灯塔守夜人", "云间漫步者", "拂晓诗人",
];
/** 种子评论时间基准：5 天前起算；池内序号越小越新（热评排最前） */
const SEED_EPOCH = () => Date.now() - 5 * 24 * 3_600_000;
const SEED_STEP_MS = 60_000;
/** 序号 → 时间偏移上限（保证热评 i=0 最新、池尾最旧） */
const SEED_MAX_INDEX = 100;

/** 种子缓存（模块级：全站只 fetch 一次；加载失败静默降级为空） */
let seedCache: Record<string, CrawledSeedComment[]> | null = null;

async function loadCrawledSeeds(): Promise<Record<string, CrawledSeedComment[]>> {
  if (seedCache) return seedCache;
  try {
    const res = await fetch("/data/crawled-comments.json");
    if (!res.ok) return (seedCache = {});
    seedCache = (await res.json()) as Record<string, CrawledSeedComment[]>;
  } catch {
    seedCache = {};
  }
  return seedCache;
}

/** 种子评论 → SongComment（只读静态层，不写 localStorage） */
function toSeedComment(
  trackId: string,
  seed: CrawledSeedComment,
  i: number,
): SongComment {
  return {
    id: `seed-${trackId}-${i}`,
    trackId,
    text: seed.text,
    anonMark: SEED_AUTHORS[i % SEED_AUTHORS.length],
    source: "direct",
    likedBy: [],
    hotLikes: seed.liked,
    createdAt: SEED_EPOCH() + (SEED_MAX_INDEX - i) * SEED_STEP_MS,
  };
}

export type CommentResult =
  | { ok: true; comment: SongComment }
  | { ok: false; reason: "too-short" | "too-long" | "bad-word" | "cooldown" | "offline" };

function genId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readComments(): SongComment[] {
  const raw = readStorage<SongComment[]>(STORAGE.songComments, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (c): c is SongComment =>
      typeof c === "object" &&
      c !== null &&
      typeof c.id === "string" &&
      typeof c.trackId === "string",
  );
}

/** 发布感想（F-02）：字数 + 敏感词 + 同曲 5 分钟限频 */
export async function postComment(
  trackId: string,
  text: string,
  source: "bottle" | "direct" = "direct",
  bottleId?: string,
): Promise<CommentResult> {
  const trimmed = text.trim();
  if (trimmed.length < COMMENT_TEXT_MIN) return { ok: false, reason: "too-short" };
  if (trimmed.length > COMMENT_TEXT_MAX) return { ok: false, reason: "too-long" };
  if (!isSafeText(trimmed).ok) return { ok: false, reason: "bad-word" };

  if (!isSupabaseReady()) {
    const cooldown = readStorage<Record<string, number>>(STORAGE.commentCooldown, {});
    const last = cooldown[trackId];
    if (last && Date.now() - last < COMMENT_COOLDOWN_MS) {
      return { ok: false, reason: "cooldown" };
    }
    const sailor = await getOrCreateSailor();
    const comment: SongComment = {
      id: genId(),
      trackId,
      text: trimmed,
      anonMark: sailor?.anonMark ?? "匿名船客",
      source,
      bottleId,
      likedBy: [],
      createdAt: Date.now(),
    };
    const comments = readComments();
    comments.push(comment);
    writeStorage(
      STORAGE.songComments,
      comments.length > COMMENTS_MAX ? comments.slice(-COMMENTS_MAX) : comments,
    );
    cooldown[trackId] = Date.now();
    writeStorage(STORAGE.commentCooldown, cooldown);
    return { ok: true, comment };
  }

  const sb = getSupabase();
  if (!sb) return { ok: false, reason: "offline" };
  const { data, error } = await sb.rpc("post_comment", {
    p_track_id: trackId,
    p_text: trimmed,
    p_source: source,
    p_bottle_id: bottleId ?? null,
  });
  if (error) {
    const m = error.message ?? "";
    if (m.includes("cooldown")) return { ok: false, reason: "cooldown" };
    if (m.includes("bad word")) return { ok: false, reason: "bad-word" };
    if (m.includes("text length")) return { ok: false, reason: "too-short" };
    return { ok: false, reason: "offline" };
  }
  return { ok: true, comment: mapCommentRow(data) };
}

/** 某首歌的留言（时间倒序）：本地模式 = 爬取热评种子（只读）+ 用户发布 */
export async function fetchComments(trackId: string): Promise<SongComment[]> {
  if (!isSupabaseReady()) {
    const local = readComments()
      .filter((c) => c.trackId === trackId)
      .sort((a, b) => b.createdAt - a.createdAt);
    const seeds = await loadCrawledSeeds();
    const seedList = (seeds[trackId] ?? []).map((s, i) => toSeedComment(trackId, s, i));
    // 种子 + 本地合并，按 createdAt 倒序（热评种子时间基准早于用户新评论）
    return [...seedList, ...local].sort((a, b) => b.createdAt - a.createdAt);
  }
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.rpc("fetch_comments", { p_track_id: trackId });
  return Array.isArray(data) ? data.map(mapCommentRow) : [];
}

/** 某船客发布的所有感想（足迹页用） */
export async function fetchCommentsByAuthor(mark: string): Promise<SongComment[]> {
  if (!isSupabaseReady()) {
    return readComments()
      .filter((c) => c.anonMark === mark)
      .sort((a, b) => b.createdAt - a.createdAt);
  }
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.rpc("fetch_comments_by_author", { p_mark: mark });
  return Array.isArray(data) ? data.map(mapCommentRow) : [];
}

/** 点赞/取消点赞感想（按 anonMark 去重） */
export async function toggleCommentLike(
  commentId: string,
): Promise<{ ok: boolean; liked: boolean }> {
  if (!isSupabaseReady()) {
    const sailor = await getOrCreateSailor();
    if (!sailor) return { ok: false, liked: false };
    const mark = sailor.anonMark;
    const comments = readComments();
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return { ok: false, liked: false };
    const has = comment.likedBy.includes(mark);
    comment.likedBy = has
      ? comment.likedBy.filter((m) => m !== mark)
      : [...comment.likedBy, mark];
    writeStorage(STORAGE.songComments, comments);
    return { ok: true, liked: !has };
  }

  const sb = getSupabase();
  if (!sb) return { ok: false, liked: false };
  const { data, error } = await sb.rpc("toggle_comment_like", {
    p_comment_id: commentId,
  });
  const r = (data ?? {}) as { liked?: boolean };
  if (error) return { ok: false, liked: false };
  return { ok: true, liked: r.liked === true };
}

/** Supabase 行（snake_case）→ 本地模型 */
export function mapCommentRow(row: unknown): SongComment {
  const r = (row ?? {}) as Record<string, unknown>;
  const parseTs = (v: unknown): number =>
    typeof v === "string" ? Date.parse(v) : Date.now();
  return {
    id: typeof r.id === "string" ? r.id : "",
    trackId: typeof r.track_id === "string" ? r.track_id : "",
    text: typeof r.text === "string" ? r.text : "",
    anonMark: typeof r.anon_mark === "string" ? r.anon_mark : "匿名船客",
    source: r.source === "bottle" ? "bottle" : "direct",
    bottleId: typeof r.bottle_id === "string" ? r.bottle_id : undefined,
    likedBy: Array.isArray(r.likes)
      ? (r.likes as unknown[]).filter((x): x is string => typeof x === "string")
      : [],
    hotLikes: typeof r.hot_likes === "number" ? r.hot_likes : undefined,
    createdAt: parseTs(r.created_at),
  };
}