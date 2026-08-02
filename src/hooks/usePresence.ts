"use client";

import { useEffect, useState } from "react";
import { usePlayerStore } from "@/stores/player";
import { startHeartbeat, subscribePresence } from "@/lib/realtime/presence";
import type { PresencePeer } from "@/lib/realtime/types";

/**
 * 同船共听桥接（FR-10.1）：
 * - 播放中启动心跳（每 15s 更新自己在听状态，trackId 变化立即重启）
 * - 订阅同曲在线者（排除自己；60s 无心跳视为离线）
 * 返回匿名在线者列表（仅会话随机标识，无身份信息）
 */
export function usePresence(): PresencePeer[] {
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const tracks = usePlayerStore((s) => s.tracks);
  const [peers, setPeers] = useState<PresencePeer[]>([]);

  // 心跳循环（trackId 变化重启，立即发首跳）
  useEffect(() => {
    return startHeartbeat(
      () => tracks[currentIndex]?.id ?? null,
      () => usePlayerStore.getState().isPlaying,
    );
  }, [currentIndex, tracks]);

  // 订阅同曲在线者（仅播放中显示；停止时通过订阅回调立即清空）
  useEffect(() => {
    const trackId = tracks[currentIndex]?.id ?? "";
    const active = isPlaying && trackId !== "";
    return subscribePresence(trackId, (peers) => {
      setPeers(active ? peers : []);
    });
  }, [currentIndex, isPlaying, tracks]);

  return peers;
}
