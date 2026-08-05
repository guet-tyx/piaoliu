import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseReady } from "@/lib/supabase/anon";
import { fetchPublicBottles, mapBottleRow } from "./bottles";
import { fetchCommentsByAuthor, mapCommentRow } from "./comments";
import { getFollows } from "./social";
import { getOrCreateSailor } from "./sailor";
import { titleOf } from "@/data/collection";
import type { Bottle, SailorFootprint, SongComment } from "@/types/social";

/**
 * 船客足迹查询层（P1 F-03）：
 * 按匿名代号聚合公开漂流瓶 + 听歌感想 + 总赞；档案信息（等级/称号/注册时间）
 * 无船员证记录时按内容量推导；本地模式粉丝/关注数无多用户数据示 0。
 */

/** P0 时代占位符代号（排行榜/足迹聚合时过滤，避免全部归并到假代号下） */
export const PLACEHOLDER_MARKS = new Set(["你的纸船", "回信的船客"]);

/** 推导等级：公开内容每 2 条升 1 级（1 级起，封顶 10） */
export function deriveLevel(contentCount: number): number {
  return Math.min(10, 1 + Math.floor(contentCount / 2));
}

/** 本地模式聚合（localStorage 数据源） */
async function aggregateLocal(mark: string): Promise<SailorFootprint | null> {
  const me = await getOrCreateSailor();
  const bottles = (await fetchPublicBottles()).filter(
    (b) => b.anonMark === mark && !PLACEHOLDER_MARKS.has(b.anonMark),
  );
  const comments = (await fetchCommentsByAuthor(mark)).filter(
    (c) => !PLACEHOLDER_MARKS.has(c.anonMark),
  );
  const contentCount = bottles.length + comments.length;
  if (contentCount === 0) return null; // 星海里没有这个船客

  const follows = await getFollows();
  const totalLikes =
    bottles.reduce((sum, b) => sum + b.likedBy.length, 0) +
    comments.reduce((sum, c) => sum + c.likedBy.length, 0);
  const firstAt = [...bottles, ...comments].reduce(
    (min, x) => Math.min(min, x.createdAt),
    Date.now(),
  );
  const level = deriveLevel(contentCount);

  return {
    sailor: { anonMark: mark, level, title: titleOf(level), badges: [], createdAt: firstAt },
    stats: {
      totalLikes,
      bottlesCount: bottles.length,
      commentsCount: comments.length,
      followerCount: 0,
      followingCount: 0,
    },
    bottles,
    comments,
    isFollowing: follows.some((f) => f.followedMark === mark),
    isSelf: me?.anonMark === mark,
  };
}

/** 船客足迹（不存在（无任何公开内容）返回 null） */
export async function fetchSailorFootprint(mark: string): Promise<SailorFootprint | null> {
  if (!isSupabaseReady()) return aggregateLocal(mark);

  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.rpc("fetch_sailor_footprint", { p_mark: mark });
  const r = (data ?? {}) as Record<string, unknown>;
  if (r.exists !== true) return null;

  const me = await getOrCreateSailor();
  const follows = await getFollows();
  const bottles = (Array.isArray(r.bottles) ? r.bottles : []).map(mapBottleRow);
  const comments = (Array.isArray(r.comments) ? r.comments : []).map(mapCommentRow);
  const contentCount = bottles.length + comments.length;
  const sailorRow = r.sailor as Record<string, unknown> | null;
  const level =
    sailorRow && typeof sailorRow.level === "number"
      ? sailorRow.level
      : deriveLevel(contentCount);
  const parseTs = (v: unknown): number => (typeof v === "string" ? Date.parse(v) : Date.now());

  return {
    sailor: {
      anonMark: mark,
      level,
      title: titleOf(level),
      badges: Array.isArray(sailorRow?.badges)
        ? (sailorRow.badges as unknown[]).filter((x): x is string => typeof x === "string")
        : [],
      createdAt:
        typeof sailorRow?.created_at === "string"
          ? Date.parse(sailorRow.created_at as string)
          : parseTs(r.first_seen_at),
    },
    stats: {
      totalLikes: typeof r.total_likes === "number" ? r.total_likes : 0,
      bottlesCount: bottles.length,
      commentsCount: comments.length,
      followerCount: typeof r.follower_count === "number" ? r.follower_count : 0,
      followingCount: 0, // 关注列表仅本人可见
    },
    bottles,
    comments,
    isFollowing: follows.some((f) => f.followedMark === mark),
    isSelf: me?.anonMark === mark,
  };
}

/** 导出类型便于页面使用 */
export type { Bottle, SongComment };