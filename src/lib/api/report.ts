import { readDailyActivity, readStats } from "@/lib/api/sailor";
import { readPool } from "@/lib/api/bottles";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseReady } from "@/lib/supabase/anon";
import { TRACKS } from "@/data/tracks";

/**
 * 星海周报统计（FR-13）：
 * - 本地模拟：聚合 localStorage（drift-daily-activity / drift-stats / 瓶池）
 * - 真实模式：action_logs 聚合 RPC（004/005 迁移 get_weekly_report），失败回退本地
 */

export interface WeeklyReport {
  /** 本周（近 7 天，含今天）行为统计 */
  week: {
    launched: number;
    picked: number;
    replied: number;
    listens: number;
  };
  /** 热门航线 top3（歌曲 + 播放次数） */
  topTracks: { trackId: string; count: number }[];
  /** 收听星图：近 7 天 [{date, count}] */
  listenDays: { date: string; count: number }[];
  /** 本周启航的瓶子（含被拾状态） */
  bottles: {
    id: string;
    text: string;
    trackName: string;
    picked: boolean;
    replied: boolean;
  }[];
  /** 是否有任何数据（空态判断） */
  hasData: boolean;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 瓶文截断（列表展示统一 30 字，本地/真实两路径共用） */
function truncateBottleText(text: string): string {
  return text.length > 30 ? `${text.slice(0, 30)}…` : text;
}

/** 计算本周周报（数据从 V2.0 起累积） */
export function computeWeeklyReport(): WeeklyReport {
  const stats = readStats();
  const daily = readDailyActivity();
  const pool = readPool();

  // 近 7 天日期集合（含今天）
  const weekDates = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i));
  const weekSet = new Set(weekDates);

  const week = { launched: 0, picked: 0, replied: 0, listens: 0 };
  for (const d of daily) {
    if (!weekSet.has(d.date)) continue;
    week.launched += d.launched;
    week.picked += d.picked;
    week.replied += d.replied;
    week.listens += d.listenCount;
  }

  // 热门航线：按播放次数排序 top3
  const topTracks = Object.entries(stats.trackCounts)
    .map(([trackId, count]) => ({ trackId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // 收听星图：近 7 天（缺的日期补 0）
  const listenDays = weekDates.map((date) => ({
    date,
    count: stats.listenByDay[date] ?? 0,
  }));

  // 本周启航的瓶子（近 7 天创建且为本人——本地模拟池中 authorId 为本地的瓶子）
  const weekStart = Date.now() - 7 * 24 * 3600 * 1000;
  const bottles = pool
    .filter((b) => b.createdAt >= weekStart)
    .map((b) => ({
      id: b.id,
      text: truncateBottleText(b.text),
      trackName: b.track.t,
      picked: b.pickedBy !== null,
      replied: b.repliedAt !== null,
    }));

  const hasData =
    week.launched + week.picked + week.replied + week.listens +
    topTracks.length + bottles.length >
    0;

  return { week, topTracks, listenDays, bottles, hasData };
}

/** 真实模式 get_weekly_report 返回行（snake_case jsonb）→ WeeklyReport（camelCase） */
function mapWeeklyReportRow(row: unknown): WeeklyReport {
  const r = (row ?? {}) as Record<string, unknown>;
  const summary = (r.summary ?? {}) as Record<string, unknown>;
  const topTracks = (Array.isArray(r.top_tracks) ? r.top_tracks : []) as {
    track_id?: unknown;
    cnt?: unknown;
  }[];
  const listenDays = (Array.isArray(r.listen_days) ? r.listen_days : []) as {
    day?: unknown;
    cnt?: unknown;
  }[];
  const bottles = (Array.isArray(r.bottles) ? r.bottles : []) as {
    id?: unknown;
    text?: unknown;
    track_name?: unknown;
    picked?: unknown;
    replied?: unknown;
  }[];

  const num = (v: unknown): number => (typeof v === "number" ? v : 0);
  const str = (v: unknown): string => (typeof v === "string" ? v : "");

  const week = {
    launched: num(summary.launched),
    picked: num(summary.picked),
    replied: num(summary.replied),
    listens: num(summary.listens),
  };
  const mappedTopTracks = topTracks
    .map((t) => ({ trackId: str(t.track_id), count: num(t.cnt) }))
    .filter((t) => t.trackId !== "");
  const mappedListenDays = listenDays.map((d) => ({
    date: str(d.day),
    count: num(d.cnt),
  }));
  const mappedBottles = bottles.map((b) => ({
    id: str(b.id),
    text: truncateBottleText(str(b.text)),
    trackName: str(b.track_name),
    picked: b.picked === true,
    replied: b.replied === true,
  }));

  const hasData =
    week.launched + week.picked + week.replied + week.listens +
    mappedTopTracks.length + mappedBottles.length >
    0;

  return {
    week,
    topTracks: mappedTopTracks,
    listenDays: mappedListenDays,
    bottles: mappedBottles,
    hasData,
  };
}

/**
 * 本周周报（真实模式走 get_weekly_report RPC，失败/未配置回退本地聚合）
 * 异步：调用方在 effect 中消费（SSR 空态安全，水合后更新）
 */
export async function fetchWeeklyReport(): Promise<WeeklyReport> {
  if (!isSupabaseReady()) return computeWeeklyReport();
  const sb = getSupabase();
  if (!sb) return computeWeeklyReport();
  const { data, error } = await sb.rpc("get_weekly_report");
  if (error || !data) return computeWeeklyReport();
  return mapWeeklyReportRow(data);
}

/** 按 trackId 取歌曲名（热门航线展示） */
export function trackNameOf(trackId: string): string {
  return TRACKS.find((t) => t.id === trackId)?.t ?? trackId;
}
