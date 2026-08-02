"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/stores/player";
import { useIdentityStore } from "@/stores/identity";

/**
 * 羁绊行为追踪（FR-8.2 听歌 3 首触发）：
 * 订阅播放器 currentIndex 变化——播放中切歌视为「连续听歌」，
 * 每次切歌记录收听（周报数据源 trackCounts/listenByDay，与羁绊解耦），
 * 每满 3 首由 identity store 触发羁绊 +1 与汐回应（每日一次、7 天不重复）。
 * 暂停/停止时重置连续计数。
 */
export function useBondTracker() {
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const tracks = usePlayerStore((s) => s.tracks);
  const noteListen = useIdentityStore((s) => s.noteListen);
  const resetListen = useIdentityStore((s) => s.resetListen);
  const prevRef = useRef(currentIndex);

  useEffect(() => {
    if (!isPlaying) {
      resetListen();
      prevRef.current = currentIndex;
      return;
    }
    if (currentIndex !== prevRef.current) {
      const trackId = tracks[currentIndex]?.id;
      if (trackId) noteListen(trackId);
    }
    prevRef.current = currentIndex;
  }, [currentIndex, isPlaying, tracks, noteListen, resetListen]);
}
