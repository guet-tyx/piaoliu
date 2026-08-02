import { create } from "zustand";
import type { Track } from "@/types/music";
import { TRACKS } from "@/data/tracks";

/** 播放模式：顺序循环（默认）/ 单曲循环 / 随机播放 */
export type PlayMode = "order" | "loop" | "shuffle";

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
  /** 已收藏曲目 id 集合（FR-4，按曲目粒度） */
  likedIds: string[];
  /** 弹幕开关（FR-5，真实控制弹幕层显隐） */
  danmakuOn: boolean;
  /** 音量 0-1（FR-2） */
  volume: number;
  /** 静音（FR-2） */
  muted: boolean;
  /** 播放模式（FR-3） */
  playMode: PlayMode;
  /** 当前播放进度（秒） */
  currentTime: number;
  /** 当前曲目总时长（秒），未载入时为 0 */
  duration: number;
  /** 进度百分比 0-100 */
  progress: number;
  /** 拖动进度条的瞬态目标（FR-1，由 useAudioPlayer 消费后归零） */
  seekTarget: number | null;
  /** 全部音频源加载失败（UI 播放键显示 !） */
  failed: boolean;

  /** 跳转并播放指定曲目（循环取模） */
  playTrack: (index: number) => void;
  /** 播放/暂停切换 */
  toggle: () => void;
  /** 下一首（循环；随机模式下随机换一首） */
  next: () => void;
  /** 上一首（循环） */
  prev: () => void;
  /** 收藏切换（按曲目 id） */
  toggleLike: (id: string) => void;
  /** 弹幕开关切换 */
  toggleDanmaku: () => void;
  /** 进度条拖动跳转（播放不中断） */
  seekTo: (seconds: number) => void;
  /** 音量设置 0-1 */
  setVolume: (volume: number) => void;
  /** 静音切换 */
  toggleMute: () => void;
  /** 播放模式循环切换：顺序 → 单曲 → 随机 → 顺序 */
  cyclePlayMode: () => void;
  /** 由 useAudioPlayer 回写播放进度 */
  setProgress: (currentTime: number, duration: number) => void;
  /** 多源加载失败标记 */
  setFailed: (failed: boolean) => void;
}

export const usePlayerStore = create<PlayerState>()((set) => ({
  tracks: TRACKS,
  currentIndex: 0,
  isPlaying: false,
  likedIds: [],
  danmakuOn: true,
  volume: 1,
  muted: false,
  playMode: "order",
  currentTime: 0,
  duration: 0,
  progress: 0,
  seekTarget: null,
  failed: false,

  playTrack: (index) =>
    set({
      currentIndex: ((index % TRACKS.length) + TRACKS.length) % TRACKS.length,
      isPlaying: true,
    }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
  next: () =>
    set((s) => {
      const { length } = s.tracks;
      if (length === 0) return {};
      if (s.playMode === "shuffle") {
        // 随机换一首（不与当前重复；运行期随机，非渲染期，无水合问题）
        let nextIndex = Math.floor(Math.random() * length);
        if (length > 1 && nextIndex === s.currentIndex) {
          nextIndex = (nextIndex + 1) % length;
        }
        return { currentIndex: nextIndex };
      }
      return { currentIndex: (s.currentIndex + 1) % length };
    }),
  prev: () =>
    set((s) => ({
      currentIndex: (s.currentIndex - 1 + s.tracks.length) % s.tracks.length,
    })),
  toggleLike: (id) =>
    set((s) => ({
      likedIds: s.likedIds.includes(id)
        ? s.likedIds.filter((x) => x !== id)
        : [...s.likedIds, id],
    })),
  toggleDanmaku: () => set((s) => ({ danmakuOn: !s.danmakuOn })),
  seekTo: (seconds) =>
    set((s) => ({
      currentTime: seconds,
      seekTarget: seconds,
      progress: s.duration > 0 ? (seconds / s.duration) * 100 : 0,
    })),
  setVolume: (volume) =>
    set({ volume: Math.min(1, Math.max(0, volume)) }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  cyclePlayMode: () =>
    set((s) => ({
      playMode:
        s.playMode === "order" ? "loop" : s.playMode === "loop" ? "shuffle" : "order",
    })),
  setProgress: (currentTime, duration) =>
    set({
      currentTime,
      duration,
      progress: duration > 0 ? (currentTime / duration) * 100 : 0,
    }),
  setFailed: (failed) => set({ failed }),
}));
