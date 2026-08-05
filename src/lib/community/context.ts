/**
 * P3 A-03/A-04 社区上下文组装（客户端）：
 * - A-03：从本地社区数据统计「星海近况」（热门话题/热门歌曲/高赞瓶/最热闹共听房间），
 *   按角色性格筛选匹配话题，组装 ≤200 字注入文本；10 分钟缓存（drift-community-cache）。
 * - A-04：同时挑选「被该角色关注的用户瓶子」生成提及注入（每瓶最多 1 次，3 天时效）。
 * 注意：route.ts 是服务端读不到 localStorage，故由聊天 store 在客户端计算后随请求携带，
 * 服务端仅做长度与中文守卫后注入 system prompt。
 */

import { readStorage, writeStorage, STORAGE } from "@/lib/storage";
import { readPool } from "@/lib/api/bottles";
import { dayStart } from "@/lib/time";
import { pickRandom } from "@/lib/random";
import { TOPICS } from "@/data/topics";
import { COMMUNITY_COMMENTS } from "@/data/community-comments";
import { personaOf } from "@/data/chat-personas";
import { pickBottleToMention } from "./bottleWatch";
import type { CoListenRoom } from "@/types/colisten";

/** 社区上下文缓存时长（文档：每 10 分钟刷新一次） */
export const COMMUNITY_CACHE_MS = 10 * 60_000;
/** 注入文本长度上限（文档：不超过 200 字，避免挤占对话上下文） */
export const COMMUNITY_MAX_LEN = 200;
/** 共听房间「活跃」判定（与列表页 30 分钟自动解散一致） */
const ROOM_ACTIVE_MS = 30 * 60_000;
/** 「人多」判定：本地房间 = 4 幽灵 + 自己 ≥ 5（文档：该房间在线人数 ≥ 5） */
const ROOM_LIVELY_MIN = 5;
/** 高赞瓶阈值（文档：该瓶子点赞数 ≥ 10） */
const HOT_BOTTLE_LIKE_MIN = 10;
/** 话题热门阈值（文档：该话题当天瓶子数 ≥ 3） */
const HOT_TOPIC_MIN = 3;

/** 3 天提起时效（与 bottleWatch 常量一致） */

interface CommunityCache {
  at: number;
  ctx: Record<string, string>;
}

/** 角色适合聊的话题（文档 A-03 性格匹配表；不匹配的话题不注入） */
const ROLE_TOPICS: Record<string, string[]> = {
  sio: ["insomnia", "night_radio"],
  lumen: ["study"],
  soku: ["postrock", "jp_morning"],
  yoe: ["mood"],
};

export interface CommunityPayload {
  /** P3 A-03 星海近况注入文本（空串 = 暂无社区内容，不注入） */
  communityContext: string;
  /** P3 A-04 被关注瓶子提及注入文本（空串 = 无可提及的瓶，不注入） */
  bottleMention: string;
}

/**
 * 组装单轮聊天请求携带的社区注入（SSR / 隐私模式一律返回空，不注入）。
 * 只在真实调用（streamFromApi）时消费 A-04 提及标记——本地降级路径不消费。
 */
export function buildCommunityPayload(roleId: string): CommunityPayload {
  if (typeof localStorage === "undefined") {
    // SSR 安全：服务端无 localStorage，不注入
    return { communityContext: "", bottleMention: "" };
  }
  return {
    communityContext: buildCommunityContext(roleId),
    bottleMention: buildBottleMention(roleId),
  };
}

/** A-03 星海近况（10 分钟缓存 + 角色性格筛选） */
function buildCommunityContext(roleId: string): string {
  const cache = readStorage<CommunityCache>(STORAGE.communityCache, { at: 0, ctx: {} });
  if (cache.at > 0 && Date.now() - cache.at < COMMUNITY_CACHE_MS) {
    return cache.ctx[roleId] ?? "";
  }

  const pool = readPool().filter((b) => b.isPublic);
  const day0 = dayStart();
  const recent = pool.filter((b) => b.createdAt >= day0);

  // 1. 今日热门话题（≥3 艘，按角色性格过滤）
  const topicCount = new Map<string, number>();
  for (const b of recent) {
    if (b.topic) topicCount.set(b.topic, (topicCount.get(b.topic) ?? 0) + 1);
  }
  const allowed = ROLE_TOPICS[roleId] ?? [];
  const hotTopics = [...topicCount.entries()]
    .filter(([id, n]) => n >= HOT_TOPIC_MIN && allowed.includes(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  // 2. 今日热门歌曲（被提及次数最多，取 ≥2 次避免噪音）
  const songCount = new Map<string, number>();
  for (const b of recent) {
    if (b.track.t) songCount.set(b.track.t, (songCount.get(b.track.t) ?? 0) + 1);
  }
  const hotSong = [...songCount.entries()].sort((a, b) => b[1] - a[1])[0];

  // 3. 高赞瓶（点赞 ≥ 10，取赞数最高）
  const hotBottle = [...pool]
    .filter((b) => b.likedBy.length >= HOT_BOTTLE_LIKE_MIN)
    .sort((a, b) => b.likedBy.length - a.likedBy.length)[0];

  // 4. 最活跃共听房间（本地 ≥5 人 = 4 幽灵 + 自己）
  const rooms = readStorage<CoListenRoom[]>(STORAGE.colistenRooms, []);
  const activeRoom = rooms
    .filter((r) => Date.now() - r.lastActiveAt <= ROOM_ACTIVE_MS)
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0];
  const roomOnline = activeRoom ? (activeRoom.ghosts?.length ?? 0) + 1 : 0;

  const lines: string[] = [];
  if (hotTopics.length > 0) {
    const names = hotTopics.map(([id, n]) => `${topicNameOf(id)}（${n}艘）`).join("、");
    lines.push(`- 广场上热门话题：${names}`);
  }
  if (hotSong && hotSong[1] >= 2) {
    lines.push(`- 今日最受欢迎的歌曲：${hotSong[0]}`);
  }
  if (hotBottle) {
    lines.push(`- 有一艘高赞的船写着「${hotBottle.text.trim().slice(0, 20)}…」`);
  }
  if (activeRoom && roomOnline >= ROOM_LIVELY_MIN) {
    lines.push(`- 共听房间里最热闹的：${activeRoom.title}（${roomOnline}人在听）`);
  }

  let ctx = "";
  if (lines.length > 0) {
    // 角色也在关注：白名单评价一句（文案「{角色名}也在关注」）
    const comment = pickRandom(COMMUNITY_COMMENTS[roleId] ?? []) ?? "";
    const name = personaOf(roleId).name;
    lines.push(`- ${name}也在关注：${comment}`);
    ctx = `\n\n## 星海近况\n${lines.join("\n")}`;
  }
  if (ctx.length > COMMUNITY_MAX_LEN) {
    ctx = ctx.slice(0, COMMUNITY_MAX_LEN);
  }

  writeStorage(STORAGE.communityCache, { at: Date.now(), ctx: { ...cache.ctx, [roleId]: ctx } });
  return ctx;
}

/** A-04 被关注瓶子提及（不缓存：每轮消费至多 1 次，随即标记） */
function buildBottleMention(roleId: string): string {
  const hit = pickBottleToMention(roleId);
  if (!hit) return "";
  const note =
    `\n\n## 用户投的瓶子（角色关注）\n` +
    `- 你关注了用户的这艘船：「${hit.excerpt}」\n` +
    `- 如果用户没有主动提起，你可以自然地提及它，措辞参考：「你上次投的那艘船，我看到了。${hit.comment}」`;
  return note.length > COMMUNITY_MAX_LEN ? note.slice(0, COMMUNITY_MAX_LEN) : note;
}

/** 话题 id → 展示名（未知兜底原 id） */
function topicNameOf(id: string): string {
  return TOPICS.find((t) => t.id === id)?.name ?? id;
}