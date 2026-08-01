import { create } from "zustand";
import type { Track } from "@/types/music";
import { TRACKS } from "@/data/tracks";

/**
 * 播放器状态中枢
 * UI 层只读（仅调用 actions）；<audio> 的驱动与进度回写由 useAudioPlayer hook 负责
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
  /** 当前播放进度（秒） */
  currentTime: number;
  /** 当前曲目总时长（秒），未载入时为 0 */
  duration: number;
  /** 进度百分比 0-100 */
  progress: number;
  /** 全部音频源加载失败（UI 播放键显示 !） */
  failed: boolean;

  /** 跳转并播放指定曲目（循环取模） */
  playTrack: (index: number) => void;
  /** 播放/暂停切换 */
  toggle: () => void;
  /** 下一首（循环） */
  next: () => void;
  /** 上一首（循环） */
  prev: () => void;
  /** 收藏切换 */
  toggleLike: () => void;
  /** 弹幕开关切换 */
  toggleDanmaku: () => void;
  /** 由 useAudioPlayer 回写播放进度 */
  setProgress: (currentTime: number, duration: number) => void;
  /** 多源加载失败标记 */
  setFailed: (failed: boolean) => void;
}

export const usePlayerStore = create<PlayerState>()((set) => ({
  tracks: TRACKS,
  currentIndex: 0,
  isPlaying: false,
  isLiked: false,
  danmakuOn: true,
  currentTime: 0,
  duration: 0,
  progress: 0,
  failed: false,

  playTrack: (index) =>
    set({
      currentIndex: ((index % TRACKS.length) + TRACKS.length) % TRACKS.length,
      isPlaying: true,
    }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
  next: () =>
    set((s) => ({ currentIndex: (s.currentIndex + 1) % s.tracks.length })),
  prev: () =>
    set((s) => ({
      currentIndex: (s.currentIndex - 1 + s.tracks.length) % s.tracks.length,
    })),
  toggleLike: () => set((s) => ({ isLiked: !s.isLiked })),
  toggleDanmaku: () => set((s) => ({ danmakuOn: !s.danmakuOn })),
  setProgress: (currentTime, duration) =>
    set({
      currentTime,
      duration,
      progress: duration > 0 ? (currentTime / duration) * 100 : 0,
    }),
  setFailed: (failed) => set({ failed }),
}));
