"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/stores/player";
import { useDanmakuStore } from "@/stores/danmaku";
import { subscribeDanmaku } from "@/lib/realtime/danmakuChannel";

/**
 * 同船弹幕桥接：订阅当前曲目频道 → 弹幕入 store；
 * 仅切歌时清空旧频道弹幕（初始挂载不清空——避免清掉 HeroDanmaku 挂载时推送的系统欢迎弹幕）；
 * 弹幕开关关闭时不订阅（省资源，FR-10.2 开关真实生效）
 */
export function useTrackDanmaku() {
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const danmakuOn = usePlayerStore((s) => s.danmakuOn);
  const tracks = usePlayerStore((s) => s.tracks);
  const push = useDanmakuStore((s) => s.push);
  const clear = useDanmakuStore((s) => s.clear);
  const prevIndexRef = useRef(currentIndex);

  useEffect(() => {
    const isSwitch = prevIndexRef.current !== currentIndex;
    prevIndexRef.current = currentIndex;
    if (isSwitch) clear();
    if (!danmakuOn) return;
    const trackId = tracks[currentIndex]?.id;
    if (!trackId) return;
    return subscribeDanmaku(trackId, push);
  }, [currentIndex, danmakuOn, tracks, push, clear]);
}
