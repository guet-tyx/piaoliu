"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/stores/player";
import { useDanmakuStore } from "@/stores/danmaku";
import { subscribeDanmaku } from "@/lib/realtime/danmakuChannel";

/**
 * 同船弹幕桥接（P3-04 频道隔离）：
 * - 订阅键 = 电台频道（channelId 为空时回退到曲目 id，如曲库/歌单播放）；
 * - 频道切换（channelId 变化）或切歌（currentIndex 变化）时清空旧弹幕；
 * - 弹幕开关关闭时不订阅（省资源，FR-10.2 开关真实生效）。
 */
export function useTrackDanmaku() {
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const channelId = usePlayerStore((s) => s.channelId);
  const danmakuOn = usePlayerStore((s) => s.danmakuOn);
  const tracks = usePlayerStore((s) => s.tracks);
  const push = useDanmakuStore((s) => s.push);
  const clear = useDanmakuStore((s) => s.clear);
  const prevChannelRef = useRef(channelId);
  const prevIndexRef = useRef(currentIndex);

  useEffect(() => {
    // 频道切换：清空（切回同一频道不同曲目也要清，避免旧曲目弹幕残留）
    const channelChanged = prevChannelRef.current !== channelId;
    prevChannelRef.current = channelId;
    const trackChanged = prevIndexRef.current !== currentIndex;
    prevIndexRef.current = currentIndex;
    if (channelChanged || trackChanged) clear();
    if (!danmakuOn) return;
    const trackId = tracks[currentIndex]?.id;
    if (!trackId) return;
    return subscribeDanmaku(channelId ?? trackId, push);
  }, [currentIndex, channelId, danmakuOn, tracks, push, clear]);
}
