import { readDailyActivity, readStats } from "@/lib/api/sailor";
import { readPool } from "@/lib/api/bottles";
import { TRACKS } from "@/data/tracks";

/**
 * 星海周报统计（FR-13）：本地模拟聚合
 * - 个人航行小结：本周投/拾/回信/听歌（drift-daily-activity 近 7 天）
 * - 热门航线：每首歌播放次数 top3（drift-stats.trackCounts）
 * - 收听星图：近 7 天播放分布（drift-stats.listenByDay）
 * - 热漂瓶子：本周启航的瓶子 + 被拾状态（瓶池）
 * 真实模式由 action_logs 聚合 RPC（004 迁移预留）
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
      text: b.text.length > 30 ? `${b.text.slice(0, 30)}…` : b.text,
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

/** 按 trackId 取歌曲名（热门航线展示） */
export function trackNameOf(trackId: string): string {
  return TRACKS.find((t) => t.id === trackId)?.t ?? trackId;
}
