"use client";

import { useEffect, useRef } from "react";
import type { Track } from "@/types/music";
import { usePlayerStore, type PlayMode } from "@/stores/player";

/**
 * useAudioPlayer：连接 Zustand 播放器状态与原生 <audio> 的桥梁。
 * - currentIndex 变化 → 加载新曲目（多源降级），保持播放态
 * - isPlaying 变化 → play() / pause()
 * - seekTarget 变化 → 进度条拖动跳转（FR-1，播放不中断）
 * - volume / muted 变化 → 同步 audio.volume（FR-2）
 * - timeupdate / loadedmetadata → 回写进度到 store
 * - ended → 按播放模式分派（FR-3）：loop 本曲重播 / shuffle·order 走 store.next()
 * - error → 切换下一个音频源，全部失败则置 failed
 * - 持久化：drift-player-state（v2：曲目/播放态/音量/静音/模式/弹幕开关）+ drift-favorites
 * 所有事件监听在 cleanup 中移除（pause + 全量 removeEventListener + unsubscribe），
 * StrictMode 双挂载下也安全，避免内存泄漏。
 */
export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** 当前曲目引用（error 监听读取，避免闭包过期） */
  const trackRef = useRef<Track | null>(null);
  /** 当前尝试的音频源下标（多源降级指针） */
  const sourceIndexRef = useRef(0);

  const tracks = usePlayerStore((s) => s.tracks);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const seekTarget = usePlayerStore((s) => s.seekTarget);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);

  // 同步当前曲目引用（effect 内写 ref，避免 react-hooks/refs 告警；error 监听不闭包过期）
  useEffect(() => {
    trackRef.current = tracks[currentIndex] ?? null;
  }, [currentIndex, tracks]);

  // 挂载：创建 audio 元素并绑定事件
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audioRef.current = audio;

    const onTimeUpdate = () =>
      usePlayerStore.getState().setProgress(audio.currentTime, audio.duration);
    const onLoadedMetadata = () =>
      usePlayerStore.getState().setProgress(audio.currentTime, audio.duration);
    /** 播放结束：单曲循环 → 本曲重播；P2-04「当前曲目结束」定时 → 暂停并清除；
     *  否则走 next()（随机模式在 store 内处理；FM 播完末尾由 store 追加推荐） */
    const onEnded = () => {
      const { playMode, sleepMode } = usePlayerStore.getState();
      // P2-04：定时关闭「当前曲目结束时」→ 播完这首就停
      if (sleepMode === "track") {
        audio.pause();
        usePlayerStore.setState({ isPlaying: false, sleepMode: null, sleepDeadline: null });
        return;
      }
      if (playMode === "loop") {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      usePlayerStore.getState().next();
    };
    /** 多源降级：当前源失败 → 尝试下一个；全部失败 → failed */
    const onError = () => {
      const track = trackRef.current;
      if (!track) return;
      const nextSource = sourceIndexRef.current + 1;
      if (nextSource < track.src.length) {
        sourceIndexRef.current = nextSource;
        audio.src = track.src[nextSource];
        if (usePlayerStore.getState().isPlaying) {
          audio.play().catch(() => {});
        }
      } else {
        usePlayerStore.getState().setFailed(true);
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audioRef.current = null;
    };
  }, []);

  // 切歌：重置进度与降级指针，加载新音源（保持播放态）
  useEffect(() => {
    const audio = audioRef.current;
    const track = trackRef.current;
    if (!audio || !track) return;
    usePlayerStore.getState().setProgress(0, 0);
    usePlayerStore.getState().setFailed(false);
    sourceIndexRef.current = 0;
    audio.src = track.src[0] ?? "";
    if (usePlayerStore.getState().isPlaying) {
      audio.play().catch(() => {});
    }
  }, [currentIndex, tracks]);

  // 播放/暂停
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      // autoplay 策略拒绝时静默（用户点击触发则正常播放）
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // FR-1：消费进度条拖动目标（元数据未载入或超出时长时忽略）
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || seekTarget === null) return;
    if (audio.duration > 0 && seekTarget <= audio.duration) {
      audio.currentTime = seekTarget;
    }
    usePlayerStore.setState({ seekTarget: null });
  }, [seekTarget]);

  // FR-2：音量/静音同步
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // 播放状态持久化：挂载后恢复（不自动播放），变更时写回 localStorage
  useEffect(() => {
    const KEY = "drift-player-state";
    const FAV_KEY = "drift-favorites";
    const PLAY_MODES: PlayMode[] = ["order", "loop", "shuffle"];
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          currentIndex?: unknown;
          volume?: unknown;
          muted?: unknown;
          playMode?: unknown;
          danmakuOn?: unknown;
          hostBubbleOn?: unknown;
          hostVoiceOn?: unknown;
        };
        const { tracks: list } = usePlayerStore.getState();
        const patch: {
          currentIndex?: number;
          volume?: number;
          muted?: boolean;
          playMode?: PlayMode;
          danmakuOn?: boolean;
          hostBubbleOn?: boolean;
          hostVoiceOn?: boolean;
        } = {};
        if (
          typeof saved.currentIndex === "number" &&
          saved.currentIndex >= 0 &&
          saved.currentIndex < list.length
        ) {
          patch.currentIndex = saved.currentIndex;
        }
        if (
          typeof saved.volume === "number" &&
          saved.volume >= 0 &&
          saved.volume <= 1
        ) {
          patch.volume = saved.volume;
        }
        if (typeof saved.muted === "boolean") patch.muted = saved.muted;
        if (
          typeof saved.playMode === "string" &&
          PLAY_MODES.includes(saved.playMode as PlayMode)
        ) {
          patch.playMode = saved.playMode as PlayMode;
        }
        if (typeof saved.danmakuOn === "boolean") patch.danmakuOn = saved.danmakuOn;
        if (typeof saved.hostBubbleOn === "boolean") patch.hostBubbleOn = saved.hostBubbleOn;
        if (typeof saved.hostVoiceOn === "boolean") patch.hostVoiceOn = saved.hostVoiceOn;
        // 只恢复 UI 状态；isPlaying 强制 false，避免浏览器拦截自动播放
        usePlayerStore.setState({ ...patch, isPlaying: false });
      }
    } catch {
      // 损坏数据忽略
    }
    try {
      const favRaw = localStorage.getItem(FAV_KEY);
      if (favRaw) {
        const fav: unknown = JSON.parse(favRaw);
        if (Array.isArray(fav)) {
          usePlayerStore.setState({
            likedIds: fav.filter((x): x is string => typeof x === "string"),
          });
        }
      }
    } catch {
      // 损坏数据忽略
    }
    // P1-03：歌单收藏独立 key（与曲目收藏并存）
    try {
      const plFavRaw = localStorage.getItem("drift-fav-playlists");
      if (plFavRaw) {
        const fav: unknown = JSON.parse(plFavRaw);
        if (Array.isArray(fav)) {
          usePlayerStore.setState({
            likedPlaylistIds: fav.filter((x): x is string => typeof x === "string"),
          });
        }
      }
    } catch {
      // 损坏数据忽略
    }
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
        state.hostVoiceOn === prev.hostVoiceOn
      ) {
        return;
      }
      try {
        localStorage.setItem(
          KEY,
          JSON.stringify({
            currentIndex: state.currentIndex,
            isPlaying: state.isPlaying,
            volume: state.volume,
            muted: state.muted,
            playMode: state.playMode,
            danmakuOn: state.danmakuOn,
            hostBubbleOn: state.hostBubbleOn,
            hostVoiceOn: state.hostVoiceOn,
          }),
        );
      } catch {
        // 隐私模式等场景忽略写入失败
      }
    });
    const unsubscribeFav = usePlayerStore.subscribe((state, prev) => {
      if (state.likedIds === prev.likedIds) return;
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify(state.likedIds));
      } catch {
        // 隐私模式等场景忽略写入失败
      }
    });
    const unsubscribePlFav = usePlayerStore.subscribe((state, prev) => {
      if (state.likedPlaylistIds === prev.likedPlaylistIds) return;
      try {
        localStorage.setItem(
          "drift-fav-playlists",
          JSON.stringify(state.likedPlaylistIds),
        );
      } catch {
        // 隐私模式等场景忽略写入失败
      }
    });
    return () => {
      unsubscribe();
      unsubscribeFav();
      unsubscribePlFav();
    };
  }, []);
}
