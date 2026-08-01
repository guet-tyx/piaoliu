import { create } from "zustand";
import type { Track } from "@/types/music";
import { TRACKS } from "@/data/tracks";

/**
 * 播放器状态（骨架）
 * 当前只管理 UI 状态与切歌逻辑；<audio> 播放、进度同步在播放器组件接入
 */
interface PlayerState {
  /** 播放列表 */
  tracks: Track[];
  /** 当前曲目下标 */
  currentIndex: number;
  /** 播放中 */
  isPlaying: boolean;
  /** 已收藏 */
  isLiked: boolean;
  /** 弹幕开关 */
  danmakuOn: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  toggleLike: () => void;
  toggleDanmaku: () => void;
}

export const usePlayerStore = create<PlayerState>()((set) => ({
  tracks: TRACKS,
  currentIndex: 0,
  isPlaying: false,
  isLiked: false,
  danmakuOn: true,
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
  next: () =>
    set((s) => ({ currentIndex: (s.currentIndex + 1) % s.tracks.length })),
  prev: () =>
    set((s) => ({
      currentIndex: (s.currentIndex - 1 + s.tracks.length) % s.tracks.length,
    })),
  toggleLike: () => set((s) => ({ isLiked: !s.isLiked })),
  toggleDanmaku: () => set((s) => ({ danmakuOn: !s.danmakuOn })),
}));
