import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseReady } from "@/lib/supabase/anon";
import { getOrCreateSailor } from "./sailor";
import { readStorage, writeStorage, STORAGE } from "@/lib/storage";
import { TRACKS } from "@/data/tracks";
import type { TrackSnapshot } from "@/types/social";
import type { CoListenRoom, GhostSailor } from "@/types/colisten";

/**
 * 星海共听房间查询层（P2）：
 * 本地：drift-colisten-rooms（幽灵成员在创建时生成）
 * 真实：rooms 表 RPC（create/fetch/touch）
 * 播放同步/弹幕/投票/presence 走 Realtime broadcast（stores/colisten.ts）。
 */

export type { GhostSailor };

/** 本地房间数上限（超限清理最旧） */
export const ROOM_LIST_MAX = 20;

function genId(): string {
  return `cr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readRooms(): CoListenRoom[] {
  const raw = readStorage<CoListenRoom[]>(STORAGE.colistenRooms, []);
  return Array.isArray(raw)
    ? raw.filter(
        (r): r is CoListenRoom =>
          typeof r === "object" && r !== null && typeof r.id === "string",
      )
    : [];
}

function writeRooms(rooms: CoListenRoom[]) {
  writeStorage(
    STORAGE.colistenRooms,
    rooms.length > ROOM_LIST_MAX ? rooms.slice(-ROOM_LIST_MAX) : rooms,
  );
}

/**
 * 幽灵成员（本地演示多人共听；真实模式无）：
 * 创建房间时注入 3-4 位匿名船客，参与弹幕与投票演示。
 */
export function makeGhosts(count = 4): GhostSailor[] {
  const marks = ["纸鹤水手", "薄雾领航", "星尘游民", "晚风灯塔", "弦外之音"];
  const ghosts: GhostSailor[] = [];
  for (let i = 0; i < count; i++) {
    const name = marks[i % marks.length];
    const code = Math.random().toString(36).slice(2, 6).toUpperCase();
    ghosts.push({ peerId: `ghost-${i + 1}`, anonMark: `${name}·${code}` });
  }
  return ghosts;
}

/**
 * 推荐共听歌单：以起点歌曲同风格（tag/mood 任一匹配）扩列 5-10 首，
 * 不足时兜底补足至 5 首。
 */
export function buildColistenPlaylist(start: TrackSnapshot): TrackSnapshot[] {
  const origin = start.id ? TRACKS.find((t) => t.id === start.id) : undefined;
  const byName = origin ?? (start.t ? TRACKS.find((t) => t.t === start.t) : undefined);
  const pool = TRACKS.filter((t) => {
    if (byName) {
      if (t.id === byName.id) return false;
      if (t.tag === byName.tag || t.mood.some((m) => byName.mood.includes(m))) return true;
    }
    return false;
  });
  let picks = pool.slice(0, 10).map((t) => snap(t));
  // 全量兜底：不够 5 首时用全景曲库补（排除起点自身）
  if (picks.length < 5) {
    const excluded = new Set([start.t, ...picks.map((p) => p.t)]);
    for (const t of TRACKS) {
      if (picks.length >= 5) break;
      if (excluded.has(t.t)) continue;
      picks.push(snap(t));
    }
  }
  if (picks.length === 0) picks = [start];
  return picks.slice(0, 10);
}

function snap(t: (typeof TRACKS)[number]): TrackSnapshot {
  return { id: t.id, t: t.t, tag: t.tag, s: t.s, cover: t.cover };
}

/** 创建房间（本地：写 localStorage + 幽灵注入；真实：create_colisten_room RPC） */
export async function createCoListenRoom(
  track: TrackSnapshot,
  playlist: TrackSnapshot[],
  opts: { ghosts?: boolean } = {},
): Promise<CoListenRoom | null> {
  const sailor = await getOrCreateSailor();
  const room: CoListenRoom = {
    id: genId(),
    title: `星海共听 · ${track.t}`,
    startTrack: track,
    playlist: playlist.length > 0 ? playlist : [track],
    createdBy: sailor?.anonMark ?? "匿名船客",
    hostId: getPeerSeed(),
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  };

  if (!isSupabaseReady()) {
    // 幽灵成员（仅本地演示多人；真实房间不注入）
    room.ghosts = opts.ghosts === false ? [] : makeGhosts();
    const rooms = readRooms();
    rooms.push(room);
    writeRooms(rooms);
    return room;
  }

  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("create_colisten_room", {
    p_id: room.id,
    p_track: track as unknown as Record<string, unknown>,
    p_playlist: playlist as unknown as Record<string, unknown>[],
    p_title: room.title,
  });
  if (error || !data) return null;
  return room;
}

/** 活跃房间列表（按最近活跃/在线人数降序；本地含幽灵） */
export async function fetchCoListenRooms(): Promise<CoListenRoom[]> {
  if (!isSupabaseReady()) {
    const cutoff = Date.now() - 30 * 60_000; // 30 分钟无人自动解散
    return readRooms()
      .filter((r) => r.lastActiveAt >= cutoff)
      .sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  }
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.rpc("fetch_colisten_rooms");
  return Array.isArray(data)
    ? data.map(mapRoomRow).filter((r): r is CoListenRoom => r !== null)
    : [];
}

/** 取单个房间 */
export async function fetchCoListenRoom(roomId: string): Promise<CoListenRoom | null> {
  const rooms = await fetchCoListenRooms();
  return rooms.find((r) => r.id === roomId) ?? null;
}

/** 房间心跳（自动解散依据；本地写 lastActiveAt，真实 touch RPC） */
export async function touchCoListenRoom(roomId: string): Promise<void> {
  if (!isSupabaseReady()) {
    const rooms = readRooms();
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    room.lastActiveAt = Date.now();
    writeRooms(rooms);
    return;
  }
  const sb = getSupabase();
  if (!sb) return;
  await sb.rpc("touch_colisten_room", { p_id: roomId });
}

/** 会话种子（本地房间 hostId；与全局弹幕 peerId 同源，保证单标签页身份一致） */
let peerSeed = "";
function getPeerSeed(): string {
  if (!peerSeed) peerSeed = `p-${Math.random().toString(36).slice(2, 8)}`;
  return peerSeed;
}

/** Supabase 行 → 本地模型 */
function mapRoomRow(row: unknown): CoListenRoom | null {
  const r = (row ?? {}) as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  const track = (r.start_track ?? {}) as TrackSnapshot;
  return {
    id: r.id,
    title: typeof r.title === "string" ? r.title : "星海共听",
    startTrack: {
      t: typeof track.t === "string" ? track.t : "",
      tag: typeof track.tag === "string" ? track.tag : "",
      s: typeof track.s === "string" ? track.s : "",
      cover: typeof track.cover === "string" ? track.cover : "",
    },
    playlist: Array.isArray(r.playlist)
      ? (r.playlist as TrackSnapshot[])
      : [{ ...(r.start_track as TrackSnapshot) }],
    createdBy: typeof r.created_by === "string" ? r.created_by : "匿名船客",
    hostId: typeof r.host_id === "string" ? r.host_id : "",
    createdAt: typeof r.created_at === "string" ? Date.parse(r.created_at) : Date.now(),
    lastActiveAt: typeof r.last_active_at === "string" ? Date.parse(r.last_active_at) : Date.now(),
  };
}