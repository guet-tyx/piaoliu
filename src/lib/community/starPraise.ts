/**
 * P3 A-01 角色星海赞判定（客户端）：
 * - 条件优先级：B（曲风∈角色主持频道，80%）> C（话题匹配角色，60%）> A（赞≥5 优质，30%）> D（1 小时内新瓶，20%）
 * - 30 分钟缓存（drift-star-praise-cache）：页面刷新不重复判定，判定结果稳定
 * - 每角色每日上限 20（drift-star-praise-daily），跨天惰性重置（同 quests 模式）
 * - 「已看」记录（drift-star-praise-seen）：滑入动画只播一次
 */

import { readStorage, writeStorage, STORAGE } from "@/lib/storage";
import { localDate } from "@/lib/time";
import { STAR_PRAISE_ROLES, type StarPraiseRole } from "@/data/star-praise";
import type { Bottle } from "@/types/social";

/** 星海赞判定缓存：bottleId → 点赞角色列表（有序，展示按此顺序） */
interface StarPraiseCache {
  cacheAt: number;
  praised: Record<string, string[]>;
}

/** 每角色每日点赞计数（上限 20，防溢出） */
interface StarPraiseDaily {
  date: string;
  count: Record<string, number>;
}

/** 判定缓存时长（文档：避免每次刷新都重新计算） */
export const STAR_PRAISE_CACHE_MS = 30 * 60_000;
/** 每角色每日点赞上限（文档业务规则） */
export const STAR_PRAISE_DAILY_MAX = 20;
/** 已看记录上限（只保留最近 200 条，防无限增长） */
const SEEN_MAX = 200;

/** 某瓶的某角色赞是否已看过（动画只播一次） */
export function isStarPraiseSeen(bottleId: string, roleId: string): boolean {
  const seen = readStorage<string[]>(STORAGE.starPraiseSeen, []);
  return seen.includes(`${bottleId}:${roleId}`);
}

/** 标记该赞已看 */
export function markStarPraiseSeen(bottleId: string, roleId: string): void {
  const seen = readStorage<string[]>(STORAGE.starPraiseSeen, []);
  const key = `${bottleId}:${roleId}`;
  if (!seen.includes(key)) {
    writeStorage(STORAGE.starPraiseSeen, [...seen.slice(-SEEN_MAX), key]);
  }
}

/**
 * 对公开瓶池执行星海赞判定，返回 bottleId → 点赞角色列表。
 * 30 分钟缓存内直接复用；过期后全量重算（缓存期内的新赞/新瓶下一轮生效）。
 */
export function ensureStarPraises(pool: Bottle[]): Record<string, string[]> {
  // SSR 安全：判定只发生在客户端（localStorage 数据源；Node 侧无 localStorage 直接返回空）
  if (typeof localStorage === "undefined") return {};

  const now = Date.now();
  const cache = readStorage<StarPraiseCache>(STORAGE.starPraiseCache, { cacheAt: 0, praised: {} });
  if (cache.cacheAt > 0 && now - cache.cacheAt < STAR_PRAISE_CACHE_MS) {
    return cache.praised;
  }

  const today = localDate();
  const daily = readStorage<StarPraiseDaily>(STORAGE.starPraiseDaily, { date: today, count: {} });
  // 跨天惰性重置（同 quests 的 syncQuest 模式）
  const count = daily.date === today ? { ...daily.count } : {};

  const praised: Record<string, string[]> = {};
  for (const b of pool) {
    if (!b.isPublic) continue;
    const hits: string[] = [];
    for (const role of STAR_PRAISE_ROLES) {
      if ((count[role.roleId] ?? 0) >= STAR_PRAISE_DAILY_MAX) continue; // 每日上限
      if (!tryPraise(role, b)) continue;
      hits.push(role.roleId);
      count[role.roleId] = (count[role.roleId] ?? 0) + 1;
    }
    if (hits.length > 0) praised[b.id] = hits;
  }

  writeStorage(STORAGE.starPraiseDaily, { date: today, count });
  writeStorage(STORAGE.starPraiseCache, { cacheAt: now, praised });
  return praised;
}

/** 单角色对单瓶的判定：按优先级 B > C > A > D，首个命中条件按对应概率触发 */
function tryPraise(role: StarPraiseRole, bottle: Bottle): boolean {
  // 条件 B：瓶子的歌属于角色主持频道曲风（固定 80%）
  if (role.styles.includes(bottle.track.tag)) return Math.random() < 0.8;
  // 条件 C：瓶子话题标签匹配角色性格（固定 60%）
  if (bottle.topic && role.topics.includes(bottle.topic)) return Math.random() < 0.6;
  // 条件 A：点赞数 ≥ 5 的优质内容（随机 30%）
  if (bottle.likedBy.length >= 5) return Math.random() < 0.3;
  // 条件 D：新瓶发布 1 小时内（随机 20%）
  if (now() - bottle.createdAt < 3_600_000) return Math.random() < 0.2;
  return false;
}

function now(): number {
  return Date.now();
}