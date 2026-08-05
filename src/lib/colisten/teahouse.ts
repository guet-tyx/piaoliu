/**
 * P3 A-02 星海茶话会调度（客户端）：
 * - getTeahouseFor(now)：活动窗口判定（每周三/五/六/日 22:00-00:00），房间 id 固定 `chat-party-{epochWeek}`
 * - buildTeahousePlaylist(roleId)：主持频道曲目池 + 近期热门兜底（15-20 首，覆盖 2 小时）
 * - ensureTeahouseRoom(info)：惰性建房（hostId = "ghost-host" 标记 AI 主持，createdBy 署名角色），
 *   列表页/入口进入时首次访问自动创建（同 quests 惰性重置模式，非后台定时器）
 * - isTeahouseRoom(room)：房间是否为茶话会 AI 主持房
 */

import { TEAHOUSE_SCHEDULE } from "@/data/teahouse-lines";
import { CHANNELS } from "@/data/channels";
import { TRACKS } from "@/data/tracks";
import { personaOf } from "@/data/chat-personas";
import { ROLE_COLOR } from "@/data/roles";
import { makeGhosts, ROOM_LIST_MAX } from "@/lib/api/colisten";
import { isSupabaseReady } from "@/lib/supabase/anon";
import { readStorage, writeStorage, STORAGE } from "@/lib/storage";
import type { CoListenRoom } from "@/types/colisten";
import type { TrackSnapshot } from "@/types/social";

/** AI 主持标记：茶话会房间的宿主会话 id（与真实 peer 区分，永不离开、不被接管） */
export const TEAHOUSE_HOST_ID = "ghost-host";

/** 茶话会歌单规模（文档：约 15-20 首覆盖 2 小时） */
const PLAYLIST_TARGET = 16;
const PLAYLIST_MAX = 20;

export interface TeahouseInfo {
  roleId: string;
  roleName: string;
  roleAvatar: string;
  /** 房间 id：chat-party-{epochWeek}（每周固定，周内复用） */
  roomId: string;
  theme: string;
  startAt: number;
  endAt: number;
}

/** 角色主持区的一条旁白（组件间共享结构） */
export interface HostLine {
  key: string;
  roleId: string;
  text: string;
}

/** 主持人信息速览（主持区 UI 用） */
export interface HostBrief {
  roleId: string;
  name: string;
  avatar: string;
  color: string;
}

/**
 * 当前是否为茶话会活动窗口。
 * 返回 null = 非活动时间（入口不显示，文档：非茶话会时间该入口不显示）。
 */
export function getTeahouseFor(now: Date = new Date()): TeahouseInfo | null {
  const slot = TEAHOUSE_SCHEDULE.find((s) => s.weekday === now.getDay());
  if (!slot) return null;
  const start = new Date(now);
  start.setHours(slot.startHour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + slot.durationHour);
  if (now < start || now >= end) return null;

  const persona = personaOf(slot.roleId);
  return {
    roleId: slot.roleId,
    roleName: persona.name,
    roleAvatar: persona.avatar,
    roomId: `chat-party-${epochWeek(now)}`,
    theme: slot.theme,
    startAt: start.getTime(),
    endAt: end.getTime(),
  };
}

/** 主持人信息（茶话会房间内渲染主持区用） */
export function teahouseHostBrief(roleId: string): HostBrief {
  const p = personaOf(roleId);
  return { roleId, name: p.name, avatar: p.avatar, color: ROLE_COLOR[roleId] ?? "#FB7299" };
}

/** 茶话会歌单：主持频道曲目池 + 曲库兜底补足（15-20 首） */
export function buildTeahousePlaylist(roleId: string): TrackSnapshot[] {
  const channel = CHANNELS.find((c) => c.host === roleId);
  const ids = channel?.trackIds ?? [];
  const picks: TrackSnapshot[] = [];
  const added = new Set<string>();
  for (const id of ids) {
    const t = TRACKS.find((x) => x.id === id);
    if (t && !added.has(t.t)) {
      added.add(t.t);
      picks.push(snap(t));
    }
  }
  // 兜底：补足到目标规模（曲库顺序即近期的热度近似）
  for (const t of TRACKS) {
    if (picks.length >= PLAYLIST_TARGET || picks.length >= PLAYLIST_MAX) break;
    if (added.has(t.t)) continue;
    added.add(t.t);
    picks.push(snap(t));
  }
  return picks.slice(0, PLAYLIST_MAX);
}

/**
 * 惰性建房：活动窗口内首次访问入口/列表页时创建茶话会房间（幂等，已存在直接复用）。
 * 真实模式（Supabase）RPC 未扩展茶话会字段，返回 null → 入口点击降级提示（本地模式完整可用）。
 */
export async function ensureTeahouseRoom(info: TeahouseInfo): Promise<CoListenRoom | null> {
  if (isSupabaseReady()) return null;

  const rooms = readStorage<CoListenRoom[]>(STORAGE.colistenRooms, []);
  const existing = rooms.find((r) => r.id === info.roomId);
  if (existing) return existing;

  const playlist = buildTeahousePlaylist(info.roleId);
  const room: CoListenRoom = {
    id: info.roomId,
    title: `🌟 星海茶话会 · ${info.roleName}主持`,
    startTrack: playlist[0],
    playlist,
    createdBy: `星海信使 · ${info.roleName}`,
    hostId: TEAHOUSE_HOST_ID,
    hostRole: info.roleId,
    createdAt: info.startAt,
    lastActiveAt: Date.now(),
    ghosts: makeGhosts(),
  };
  writeStorage(STORAGE.colistenRooms, [...rooms, room].slice(-ROOM_LIST_MAX));
  return room;
}

/** 是否茶话会 AI 主持房间（房间组件据此切换主持模式） */
export function isTeahouseRoom(room: Pick<CoListenRoom, "hostId">): boolean {
  return room.hostId === TEAHOUSE_HOST_ID;
}

function snap(t: (typeof TRACKS)[number]): TrackSnapshot {
  return { id: t.id, t: t.t, tag: t.tag, s: t.s, cover: t.cover };
}

/** 自然周序号（房间 id 固定：chat-party-{epochWeek}，同一周复用同一房间） */
function epochWeek(d: Date): number {
  return Math.floor(d.getTime() / (7 * 24 * 3_600_000));
}