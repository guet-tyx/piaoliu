"use client";

import { useEffect, useState } from "react";
import { usePlayerStore } from "@/stores/player";
import { startHeartbeat, subscribePresence } from "@/lib/realtime/presence";
import type { PresencePeer } from "@/lib/realtime/types";

/**
 * 同船共听桥接（FR-10.1 / P3-04 按频道统计）：
 * - 播放中启动心跳（每 15s 更新自己在听状态，channelId/trackId 变化立即重启）
 * - 订阅同频道在线者（排除自己；60s 无心跳视为离线）
 * 返回匿名在线者列表（仅会话随机标识，无身份信息）
 */
export function usePresence(): PresencePeer[] {
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const channelId = usePlayerStore((s) => s.channelId);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const tracks = usePlayerStore((s) => s.tracks);
  const [peers, setPeers] = useState<PresencePeer[]>([]);

  // 心跳循环（channelId/trackId 变化重启，立即发首跳）
  useEffect(() => {
    return startHeartbeat(
      () => usePlayerStore.getState().channelId,
      () => tracks[currentIndex]?.id ?? null,
      () => usePlayerStore.getState().isPlaying,
    );
  }, [currentIndex, tracks]);

  // 订阅同频道在线者（仅播放中显示；停止时通过订阅回调立即清空）
  useEffect(() => {
    // 非频道来源（曲库/歌单）回退到曲目 id 作为隔离 key，保持同曲在线语义
    const key = channelId ?? tracks[currentIndex]?.id ?? "";
    const active = isPlaying && key !== "";
    return subscribePresence(key, (peers) => {
      setPeers(active ? peers : []);
    });
  }, [currentIndex, channelId, isPlaying, tracks]);

  return peers;
}
