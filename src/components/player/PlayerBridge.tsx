"use client";

import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useBondTracker } from "@/hooks/useBondTracker";
import { useTrackDanmaku } from "@/hooks/useTrackDanmaku";

/**
 * 全局电台引擎（V3.2 修复「进聊天页音乐停止」）：
 * 在根布局挂载，把「音频桥接 + 收听追踪 + 弹幕订阅」从首页 PlayerSection 提升为全站常驻。
 * 路由切换（如进入 /chat/[roleId]）不再卸载 <Audio> 元素，音乐持续播放；
 * 收听统计/弹幕频道订阅在聊天页同样生效。
 * 纯副作用组件（不渲染任何 DOM）。
 */
export function PlayerBridge() {
  useAudioPlayer();
  useBondTracker();
  useTrackDanmaku();
  return null;
}
