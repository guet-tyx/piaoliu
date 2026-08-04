"use client";

import { useEffect } from "react";
import { restorePlayerState, bindPlayerPersistence } from "@/lib/player/persist";

/**
 * 播放器状态持久化挂载（V2.7）：在无 PlayerSection 的页面（如聊天页）调用，
 * 恢复播放器 UI 状态（含频道 id），让「频道联动」开场白与频道上下文在整页刷新后依然生效。
 * 首页由 PlayerSection → useAudioPlayer 内部已调用 restorePlayerState + bindPlayerPersistence。
 */
export function usePlayerPersistence() {
  useEffect(() => {
    restorePlayerState();
    return bindPlayerPersistence();
  }, []);
}
