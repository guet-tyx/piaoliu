"use client";

import { useEffect, useRef } from "react";
import type { Track } from "@/types/music";
import { usePlayerStore } from "@/stores/player";

/**
 * useAudioPlayer：连接 Zustand 播放器状态与原生 <audio> 的桥梁。
 * - currentIndex 变化 → 加载新曲目（多源降级），保持播放态
 * - isPlaying 变化 → play() / pause()
 * - timeupdate / loadedmetadata → 回写进度到 store
 * - ended → 自动 next()
 * - error → 切换下一个音频源，全部失败则置 failed
 * 所有事件监听在 cleanup 中移除（pause + 全量 removeEventListener），
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
    const onEnded = () => usePlayerStore.getState().next();
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
}
