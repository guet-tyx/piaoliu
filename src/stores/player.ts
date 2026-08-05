import { create } from "zustand";
import type { Track } from "@/types/music";
import { TRACKS } from "@/data/tracks";
import { FM_POOL_SIZE } from "@/data/channels";
import { recommendBatch, type FmState } from "@/lib/recommend/fmEngine";

/** 播放模式：顺序循环（默认）/ 单曲循环 / 随机播放 */
export type PlayMode = "order" | "loop" | "shuffle";

/** 当前队列来源（决定「第 X/Y 站」文案与上下文返回） */
export type PlaySource =
  | { type: "library" }
  | { type: "playlist"; id: string }
  | { type: "channel"; id: string }
  | { type: "colisten" };

/**
 * 播放器状态中枢
 * UI 层只读（仅调用 actions）；<audio> 的驱动与进度回写由 useAudioPlayer hook 负责。
 * tracks 语义 =「当前播放队列」（歌单/频道/全部曲目），P1-05 起替代硬编码 TRACKS。
 */
interface PlayerState {
  /** 当前播放队列 */
  tracks: Track[];
  /** 当前曲目下标 */
  currentIndex: number;
  /** 播放中 */
  isPlaying: boolean;
  /** 已收藏曲目 id 集合（FR-4，按曲目粒度） */
  likedIds: string[];
  /** 已收藏歌单 id 集合（P1-03，歌单粒度） */
  likedPlaylistIds: string[];
  /** 当前队列来源（决定上下文语义） */
  source: PlaySource;
  /** 当前频道 id（source.type === "channel" 时有值；P1-05） */
  channelId: string | null;
  /** FM 已听曲目 id（听完/跳过都算，推荐引擎输入；P2-03） */
  fmPlayedIds: string[];
  /** FM 已推荐曲目 id（避免重复推荐；P2-03） */
  fmRecommendedIds: string[];
  /** 定时关闭到期时间戳（ms；null=未设置；P2-04） */
  sleepDeadline: number | null;
  /** 定时关闭模式：after=倒计时结束 / track=当前曲目结束（P2-04） */
  sleepMode: "after" | "track" | null;
  /** 主持人气泡开关（P3-01，仿 danmakuOn 持久化） */
  hostBubbleOn: boolean;
  /** 主持人语音开关（TTS：主持人台词语音播报，PRD 需求② §2.4） */
  hostVoiceOn: boolean;
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

  /** 跳转并播放队列内指定下标（取模） */
  playIndex: (index: number) => void;
  /** 播放/暂停切换 */
  toggle: () => void;
  /** 下一首（循环；随机模式下随机换一首） */
  next: () => void;
  /** 上一首（循环） */
  prev: () => void;
  /** 替换队列并从第 0 首播放（歌单/频道共用入口） */
  playQueue: (tracks: Track[], source: PlaySource) => void;
  /** 从队列中某一首开始播放（歌单详情点单曲时用） */
  playQueueAt: (tracks: Track[], source: PlaySource, index: number) => void;
  /** 切换频道（P1-05）：替换队列 + 记录 channelId，从第 0 首开始 */
  switchChannel: (channelId: string, tracks: Track[]) => void;
  /** FM 追加一批推荐（私人 FM 播完末尾时由 next 内部调用） */
  fmAppend: (count?: number) => void;
  /** 设置定时关闭（P2-04）：mode=after 需传 minutes；track 模式由曲目结束触发 */
  setSleepTimer: (mode: "after" | "track", minutes?: number) => void;
  /** 取消定时关闭 */
  clearSleepTimer: () => void;
  /** 收藏切换（按曲目 id） */
  toggleLike: (id: string) => void;
  /** 歌单收藏切换（按歌单 id） */
  togglePlaylistLike: (id: string) => void;
  /** 弹幕开关切换 */
  toggleDanmaku: () => void;
  /** 主持人气泡开关切换（P3-01） */
  toggleHostBubble: () => void;
  /** 主持人语音开关切换（TTS） */
  toggleHostVoice: () => void;
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

export const usePlayerStore = create<PlayerState>()((set, get) => ({
  tracks: TRACKS,
  currentIndex: 0,
  isPlaying: false,
  likedIds: [],
  likedPlaylistIds: [],
  source: { type: "library" },
  channelId: null,
  fmPlayedIds: [],
  fmRecommendedIds: [],
  sleepDeadline: null,
  sleepMode: null,
  hostBubbleOn: true,
  hostVoiceOn: true,
  danmakuOn: true,
  volume: 1,
  muted: false,
  playMode: "order",
  currentTime: 0,
  duration: 0,
  progress: 0,
  seekTarget: null,
  failed: false,

  playIndex: (index) =>
    set((s) => {
      const { length } = s.tracks;
      if (length === 0) return {};
      return {
        currentIndex: ((index % length) + length) % length,
        isPlaying: true,
      };
    }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
  next: () =>
    set((s) => {
      const { length } = s.tracks;
      if (length === 0) return {};
      // P2-03：私人 FM 播到队列末尾 → 追加推荐一批（不绕回），「已听过」计入推荐引擎
      if (s.channelId === "ch-fm" && s.currentIndex >= length - 1) {
        const appended = buildFmBatch(get());
        // 曲库全部推荐过（appended 为空）→ 停留末尾，避免越界；重置推荐池由 UI 提示
        if (appended.tracks.length === 0) {
          return {
            fmPlayedIds: [...s.fmPlayedIds, s.tracks[s.currentIndex].id],
            isPlaying: false,
          };
        }
        return {
          tracks: [...s.tracks, ...appended.tracks],
          fmPlayedIds: [...s.fmPlayedIds, s.tracks[s.currentIndex].id],
          fmRecommendedIds: [...appended.next.recommendedIds],
          currentIndex: s.currentIndex + 1,
          isPlaying: true,
        };
      }
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
    set((s) => {
      const { length } = s.tracks;
      if (length === 0) return {};
      return { currentIndex: (s.currentIndex - 1 + length) % length };
    }),
  // 替换队列：从第 0 首开始，切到「顺序」保证歌单/频道按序播放
  playQueue: (tracks, source) =>
    set({
      tracks,
      source,
      channelId: source.type === "channel" ? source.id : null,
      currentIndex: 0,
      isPlaying: true,
      playMode: "order",
    }),
  playQueueAt: (tracks, source, index) =>
    set({
      tracks,
      source,
      channelId: source.type === "channel" ? source.id : null,
      currentIndex: ((index % tracks.length) + tracks.length) % tracks.length,
      isPlaying: true,
      playMode: "order",
    }),
  switchChannel: (channelId, tracks) =>
    set({
      tracks,
      source: { type: "channel", id: channelId },
      channelId,
      currentIndex: 0,
      isPlaying: true,
      playMode: "order",
    }),
  fmAppend: (count = 5) =>
    set((s) => {
      if (s.channelId !== "ch-fm") return {};
      const appended = buildFmBatch(get());
      return {
        tracks: [...s.tracks, ...appended.tracks.slice(0, count)],
        fmRecommendedIds: [...appended.next.recommendedIds],
      };
    }),
  setSleepTimer: (mode, minutes) => {
    if (mode === "after") {
      const m = Math.min(120, Math.max(1, minutes ?? 30));
      set({ sleepMode: "after", sleepDeadline: Date.now() + m * 60 * 1000 });
    } else {
      set({ sleepMode: "track", sleepDeadline: null });
    }
  },
  clearSleepTimer: () => set({ sleepMode: null, sleepDeadline: null }),
  toggleLike: (id) =>
    set((s) => ({
      likedIds: s.likedIds.includes(id)
        ? s.likedIds.filter((x) => x !== id)
        : [...s.likedIds, id],
    })),
  togglePlaylistLike: (id) =>
    set((s) => ({
      likedPlaylistIds: s.likedPlaylistIds.includes(id)
        ? s.likedPlaylistIds.filter((x) => x !== id)
        : [...s.likedPlaylistIds, id],
    })),
  toggleDanmaku: () => set((s) => ({ danmakuOn: !s.danmakuOn })),
  toggleHostBubble: () => set((s) => ({ hostBubbleOn: !s.hostBubbleOn })),
  toggleHostVoice: () => set((s) => ({ hostVoiceOn: !s.hostVoiceOn })),
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

/**
 * 私人 FM 初始队列（P2-03）：由推荐引擎生成（未听过优先/同 tag 加权），
 * 生成结果回写 fmRecommendedIds，避免后续批次重复。
 */
export function buildFmQueue(): Track[] {
  const s = usePlayerStore.getState();
  const { tracks, next } = buildFmBatch(s);
  // 已推荐曲目回写 store（切进 FM 频道时调用，确保 next 追加不重复）
  usePlayerStore.setState({ fmRecommendedIds: next.recommendedIds });
  return tracks;
}

/** 基于当前 FM 状态生成一批推荐（供切频道 / next 末尾追加 / fmAppend 共用） */
function buildFmBatch(state: {
  fmPlayedIds: string[];
  fmRecommendedIds: string[];
  likedIds: string[];
}): { tracks: Track[]; next: FmState } {
  const fmState: FmState = {
    recommendedIds: state.fmRecommendedIds,
    likedIds: state.likedIds,
    recentIds: [],
    playedIds: state.fmPlayedIds,
  };
  return recommendBatch(fmState, TRACKS, FM_POOL_SIZE);
}