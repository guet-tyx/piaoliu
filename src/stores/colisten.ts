import { create } from "zustand";
import {
  buildColistenPlaylist,
  createCoListenRoom,
  fetchCoListenRooms,
} from "@/lib/api/colisten";
import { getTeahouseFor, type TeahouseInfo } from "@/lib/colisten/teahouse";
import type { CoListenRoom } from "@/types/colisten";
import type { TrackSnapshot } from "@/types/social";

/**
 * 星海共听状态（P2）：
 * 房间列表（fetch/create）跨页面共享；单房间运行时逻辑在房间页组件内
 * （频道订阅 + 播放同步 + 弹幕 + 投票）。
 */
interface ColistenListState {
  /** 活跃房间（最近 30 分钟有活跃） */
  rooms: CoListenRoom[];
  loading: boolean;
  refresh: () => Promise<void>;
  /** 创建房间（以 song 为起点，自动生成推荐歌单）并返回 roomId；失败返回 null */
  create: (track: TrackSnapshot) => Promise<string | null>;
  /** P3 A-02 星海茶话会：当前活动窗口信息（非活动时间为 null） */
  teahouse: TeahouseInfo | null;
  /** 刷新茶话会窗口状态（列表页挂载时调用；SSR 空态安全） */
  refreshTeahouse: () => void;
}

export const useColistenStore = create<ColistenListState>()((set, get) => ({
  rooms: [],
  loading: false,
  teahouse: null,

  refresh: async () => {
    set({ loading: true });
    const rooms = await fetchCoListenRooms();
    set({ rooms, loading: false });
  },

  create: async (track) => {
    const playlist = buildColistenPlaylist(track);
    const room = await createCoListenRoom(track, playlist);
    if (!room) return null;
    set({ rooms: [room, ...get().rooms] });
    return room.id;
  },

  refreshTeahouse: () => {
    set({ teahouse: getTeahouseFor() });
  },
}));