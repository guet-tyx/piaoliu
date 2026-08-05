import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseReady } from "@/lib/supabase/anon";
import { readStorage, STORAGE } from "@/lib/storage";
import { weekStart } from "@/lib/time";
import { titleOf } from "@/data/collection";
import { PLACEHOLDER_MARKS } from "./footprint";
import type { Bottle, Reply, SongComment, TrackSnapshot } from "@/types/social";

/**
 * 漂流排行榜查询层（P1 F-06）：
 * 今日热榜（24h 公开瓶按点赞）/ 本周船客（积分：公开投瓶×3 + 回信×2 + 感想×1 + 获赞×1）/
 * 星海金句（累计点赞 Top10）。真实模式走 fetch_leaderboard RPC。
 */

export interface HotTodayEntry {
  rank: number;
  bottle: Bottle;
  likes: number;
}
export interface WeeklySailorEntry {
  rank: number;
  anonMark: string;
  title: string;
  score: number;
}
export interface GoldenQuoteEntry {
  rank: number;
  bottle: Bottle;
  likes: number;
}

const TOP_N = 10;
const HOUR = 3_600_000;

/** 积分 → 近似称号级别（本地推导：每 10 分升 1 级，与足迹内容推导口径一致） */
export function scoreToTitle(score: number): string {
  return titleOf(Math.min(10, 1 + Math.floor(score / 10)));
}

/** 今日热榜：24 小时内公开瓶按点赞降序（同赞先达到者在前），Top10 */
export async function fetchHotToday(): Promise<HotTodayEntry[]> {
  if (!isSupabaseReady()) {
    const pool = readStorage<Bottle[]>(STORAGE.bottlesPool, []);
    const cutoff = Date.now() - 24 * HOUR;
    const list = pool
      .filter(
        (b) =>
          b.isPublic &&
          b.createdAt >= cutoff &&
          !PLACEHOLDER_MARKS.has(b.anonMark),
      )
      .map((b) => ({ bottle: b, likes: b.likedBy.length }))
      .sort((a, b) => b.likes - a.likes || a.bottle.createdAt - b.bottle.createdAt)
      .slice(0, TOP_N);
    return list.map((e, i) => ({ rank: i + 1, ...e }));
  }
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.rpc("fetch_leaderboard", { p_kind: "hot_today" });
  return Array.isArray(data)
    ? data.map((r, i) => ({ rank: i + 1, bottle: mapLbBottle(r), likes: likeCount(r) }))
    : [];
}

/** 本周船客：周一 00:00 起按活跃积分 Top10 */
export async function fetchWeeklySailors(): Promise<WeeklySailorEntry[]> {
  if (!isSupabaseReady()) {
    const ws = weekStart();
    const pool = readStorage<Bottle[]>(STORAGE.bottlesPool, []);
    const replies = readStorage<Reply[]>(STORAGE.replies, []);
    const comments = readStorage<SongComment[]>(STORAGE.songComments, []);

    const scores = new Map<string, number>();
    const add = (mark: string, pts: number) => {
      if (!mark || PLACEHOLDER_MARKS.has(mark)) return;
      scores.set(mark, (scores.get(mark) ?? 0) + pts);
    };
    for (const b of pool) {
      if (b.isPublic && b.createdAt >= ws) add(b.anonMark, 3);
    }
    for (const r of replies) {
      if (r.createdAt >= ws) add(r.anonMark, 2);
    }
    for (const c of comments) {
      if (c.createdAt >= ws) add(c.anonMark, 1 + c.likedBy.length);
    }
    return [...scores.entries()]
      .map(([anonMark, score]) => ({ anonMark, score, title: scoreToTitle(score) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_N)
      .map((e, i) => ({ rank: i + 1, ...e }));
  }
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.rpc("fetch_leaderboard", { p_kind: "weekly_sailors" });
  return Array.isArray(data)
    ? data
        .map((r, i) => {
          const rec = (r ?? {}) as Record<string, unknown>;
          const score = typeof rec.score === "number" ? rec.score : 0;
          return {
            rank: i + 1,
            anonMark: typeof rec.anon_mark === "string" ? rec.anon_mark : "匿名船客",
            title: scoreToTitle(score),
            score,
          };
        })
        .slice(0, TOP_N)
    : [];
}

/** 星海金句：累计点赞 Top10（完整瓶中信） */
export async function fetchGoldenQuotes(): Promise<GoldenQuoteEntry[]> {
  if (!isSupabaseReady()) {
    const pool = readStorage<Bottle[]>(STORAGE.bottlesPool, []);
    const list = pool
      .filter((b) => b.isPublic && !PLACEHOLDER_MARKS.has(b.anonMark))
      .map((b) => ({ bottle: b, likes: b.likedBy.length }))
      .sort((a, b) => b.likes - a.likes || a.bottle.createdAt - b.bottle.createdAt)
      .slice(0, TOP_N);
    return list.map((e, i) => ({ rank: i + 1, ...e }));
  }
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.rpc("fetch_leaderboard", { p_kind: "golden_quotes" });
  return Array.isArray(data)
    ? data.map((r, i) => ({ rank: i + 1, bottle: mapLbBottle(r), likes: likeCount(r) }))
    : [];
}

function likeCount(r: unknown): number {
  const likes = (r as Record<string, unknown>)?.likes;
  return Array.isArray(likes) ? likes.length : 0;
}

/** leaderboard RPC 返回的扁平行 → Bottle（缺失字段兜底） */
function mapLbBottle(row: unknown): Bottle {
  const r = (row ?? {}) as Record<string, unknown>;
  const track = (r.track ?? {}) as TrackSnapshot;
  return {
    id: typeof r.id === "string" ? r.id : "",
    authorId: "",
    text: typeof r.text === "string" ? r.text : "",
    track: {
      t: typeof track.t === "string" ? track.t : "",
      tag: typeof track.tag === "string" ? track.tag : "",
      s: typeof track.s === "string" ? track.s : "",
      cover: typeof track.cover === "string" ? track.cover : "",
    },
    bottleStyle: "paper",
    anonMark: typeof r.anon_mark === "string" ? r.anon_mark : "匿名船客",
    status: "drifting",
    pickedBy: null,
    isSystem: false,
    isPublic: true,
    likedBy: Array.isArray(r.likes)
      ? (r.likes as unknown[]).filter((x): x is string => typeof x === "string")
      : [],
    createdAt: typeof r.created_at === "string" ? Date.parse(r.created_at) : Date.now(),
    repliedAt: null,
    readAt: null,
  };
}