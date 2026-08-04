import { usePlayerStore, type PlayMode } from "@/stores/player";
import { CHANNELS } from "@/data/channels";
import { readStorage, writeStorage, STORAGE } from "@/lib/storage";

/**
 * 播放器状态持久化（V2.7 从 useAudioPlayer 拆出）：
 * - restorePlayerState：从 localStorage 恢复 UI 状态（不自动播放，防浏览器拦截）；
 * - bindPlayerPersistence：订阅变更写回（仅持久化字段变化时写入，避免 setProgress 高频触发）。
 * 任意页面可挂载（首页 PlayerSection / 聊天页 usePlayerPersistence），
 * 解决聊天页整页刷新后频道上下文丢失、频道联动开场白失效的问题。
 */

const PLAY_MODES: PlayMode[] = ["order", "loop", "shuffle"];

/** 恢复播放器 UI 状态（drift-player-state + 曲目/歌单收藏）；isPlaying 强制 false */
export function restorePlayerState(): void {
  const state = readStorage<Record<string, unknown>>(STORAGE.playerState, null);
  if (state) {
    const { tracks: list } = usePlayerStore.getState();
    const patch: {
      currentIndex?: number;
      volume?: number;
      muted?: boolean;
      playMode?: PlayMode;
      danmakuOn?: boolean;
      hostBubbleOn?: boolean;
      hostVoiceOn?: boolean;
      channelId?: string;
    } = {};
    if (
      typeof state.currentIndex === "number" &&
      state.currentIndex >= 0 &&
      state.currentIndex < list.length
    ) {
      patch.currentIndex = state.currentIndex;
    }
    if (
      typeof state.volume === "number" &&
      state.volume >= 0 &&
      state.volume <= 1
    ) {
      patch.volume = state.volume;
    }
    if (typeof state.muted === "boolean") patch.muted = state.muted;
    if (
      typeof state.playMode === "string" &&
      PLAY_MODES.includes(state.playMode as PlayMode)
    ) {
      patch.playMode = state.playMode as PlayMode;
    }
    if (typeof state.danmakuOn === "boolean") patch.danmakuOn = state.danmakuOn;
    if (typeof state.hostBubbleOn === "boolean") patch.hostBubbleOn = state.hostBubbleOn;
    if (typeof state.hostVoiceOn === "boolean") patch.hostVoiceOn = state.hostVoiceOn;
    // V2.7：频道 id 持久化（刷新后频道上下文 / 聊天空态「频道联动」开场白生效）；
    // 仅接受已知频道 id，避免旧数据漂移
    if (typeof state.channelId === "string" && CHANNELS.some((c) => c.id === state.channelId)) {
      patch.channelId = state.channelId;
    }
    // 只恢复 UI 状态；isPlaying 强制 false，避免浏览器拦截自动播放
    usePlayerStore.setState({
      ...patch,
      // 频道恢复时同步 source（PlayerSection 的「第 X/Y 站」与 FM 逻辑按 channelId 走，保持一致）
      ...(patch.channelId ? { source: { type: "channel" as const, id: patch.channelId } } : {}),
      isPlaying: false,
    });
  }
  const fav = readStorage<unknown>(STORAGE.favorites, null);
  if (Array.isArray(fav)) {
    usePlayerStore.setState({
      likedIds: fav.filter((x): x is string => typeof x === "string"),
    });
  }
  const plFav = readStorage<unknown>(STORAGE.favPlaylists, null);
  if (Array.isArray(plFav)) {
    usePlayerStore.setState({
      likedPlaylistIds: plFav.filter((x): x is string => typeof x === "string"),
    });
  }
}

/** 订阅播放器变更写回 localStorage；返回取消函数（effect cleanup 用） */
export function bindPlayerPersistence(): () => void {
  const unsubscribe = usePlayerStore.subscribe((state, prev) => {
    // 仅持久化字段变化时写入（避免 setProgress 高频触发）
    if (
      state.currentIndex === prev.currentIndex &&
      state.isPlaying === prev.isPlaying &&
      state.volume === prev.volume &&
      state.muted === prev.muted &&
      state.playMode === prev.playMode &&
      state.danmakuOn === prev.danmakuOn &&
      state.hostBubbleOn === prev.hostBubbleOn &&
      state.hostVoiceOn === prev.hostVoiceOn &&
      state.channelId === prev.channelId
    ) {
      return;
    }
    writeStorage(STORAGE.playerState, {
      currentIndex: state.currentIndex,
      isPlaying: state.isPlaying,
      volume: state.volume,
      muted: state.muted,
      playMode: state.playMode,
      danmakuOn: state.danmakuOn,
      hostBubbleOn: state.hostBubbleOn,
      hostVoiceOn: state.hostVoiceOn,
      channelId: state.channelId,
    });
  });
  const unsubscribeFav = usePlayerStore.subscribe((state, prev) => {
    if (state.likedIds === prev.likedIds) return;
    writeStorage(STORAGE.favorites, state.likedIds);
  });
  const unsubscribePlFav = usePlayerStore.subscribe((state, prev) => {
    if (state.likedPlaylistIds === prev.likedPlaylistIds) return;
    writeStorage(STORAGE.favPlaylists, state.likedPlaylistIds);
  });
  return () => {
    unsubscribe();
    unsubscribeFav();
    unsubscribePlFav();
  };
}
