/**
 * P3 A-04 「让角色看你的船」判定（客户端）：
 * - 投瓶勾选后由话题/曲风自动匹配角色（复用 A-01 映射：失眠夜→汐、自习→流明、后摇→朔空、心情→悠；兜底汐）
 * - 角色在聊天时最多提起每个被关注的瓶子 1 次（drift-bottle-watch-mentioned 去重）
 * - 瓶子投出 3 天内的才有机会被提起（超过时效不再提起）
 */

import { GUEST_ID } from "@/lib/api/sailor";
import { readPool } from "@/lib/api/bottles";
import { readStorage, writeStorage, STORAGE } from "@/lib/storage";
import { pickRandom } from "@/lib/random";
import { roleOfTopic, roleOfTrackTag } from "@/data/star-praise";
import { BOTTLE_COMMENTS } from "@/data/bottle-comments";
import type { Bottle } from "@/types/social";

/** 被关注瓶子的提起时效（3 天） */
const WATCH_WINDOW_MS = 3 * 24 * 3_600_000;
/** 注入的瓶中信摘录长度上限 */
const EXCERPT_MAX = 40;
/** 已提及记录上限 */
const MENTIONED_MAX = 100;

/** 正式判定：瓶子 → 关注它的角色（话题优先，其次歌曲曲风，兜底汐） */
export function watchRoleFor(bottle: Pick<Bottle, "topic" | "track">): string {
  return roleOfTopic(bottle.topic) ?? roleOfTrackTag(bottle.track.tag) ?? "sio";
}

/** 投瓶表单实时预览：当前话题 + 绑定的歌曲曲风 → 角色（无匹配返回 null，UI 兜底汐） */
export function watchRolePreview(topic: string | null, tag: string | undefined | null): string | null {
  return roleOfTopic(topic) ?? roleOfTrackTag(tag);
}

/**
 * 挑选本轮要在聊天气提起的被关注瓶子（无则返回 null）。
 * 一旦挑选即标记「已提及」，同一瓶子本会话不再提起（每轮聊天请求消费至多 1 个）。
 * 注意：若该轮请求最终降级为本地回复，标记同样被消费——属可接受的边界（后续轮次仍可再提其他瓶）。
 */
export function pickBottleToMention(
  roleId: string,
): { bottleId: string; excerpt: string; comment: string } | null {
  if (typeof localStorage === "undefined") return null; // SSR 安全（Node 侧无 localStorage）
  const pool = readPool();
  const mentioned = new Set(readStorage<string[]>(STORAGE.bottleWatchMentioned, []));
  const now = Date.now();
  const candidates = pool.filter(
    (b) =>
      b.authorId === GUEST_ID &&
      b.watchedBy === roleId &&
      now - b.createdAt <= WATCH_WINDOW_MS &&
      !mentioned.has(b.id),
  );
  // 取最近投的
  candidates.sort((a, b) => b.createdAt - a.createdAt);
  const bottle = candidates[0];
  if (!bottle) return null;

  const comments = BOTTLE_COMMENTS[roleId] ?? [];
  const excerpt = bottle.text.trim().slice(0, EXCERPT_MAX);
  markMentioned(bottle.id);
  return {
    bottleId: bottle.id,
    excerpt,
    comment: pickRandom(comments) ?? "",
  };
}

/** 同瓶最多被提及 1 次 */
function markMentioned(bottleId: string): void {
  const mentioned = readStorage<string[]>(STORAGE.bottleWatchMentioned, []);
  if (!mentioned.includes(bottleId)) {
    writeStorage(STORAGE.bottleWatchMentioned, [...mentioned.slice(-MENTIONED_MAX), bottleId]);
  }
}