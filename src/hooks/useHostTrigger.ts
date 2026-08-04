"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "@/stores/player";
import { hostLinesOf, pickLine, type HostTrigger } from "@/data/host-lines";

/** 每 3 首曲目触发一次介绍 */
const PER3_COUNT = 3;
/** 60 秒无操作触发 idle */
const IDLE_MS = 60_000;

interface HostBubbleState {
  /** 当前气泡台词（null=隐藏） */
  text: string | null;
  /** 触发类型（样式/aria 用） */
  trigger: HostTrigger | null;
  /** 频道切换时的气泡 key（重挂载动画用） */
  bubbleKey: number;
}

/**
 * useHostTrigger（P3-01）：虚拟主持人触发管理
 * - enter：切换频道时从 enter 台词池取 1 条（channelId 变化触发）
 * - per3：每连续 3 首曲目切换时取 1 条（currentIndex 变化计数，暂停重置）
 * - idle：isPlaying 静止 60s 触发 1 条（仅一次；开始播放即重置）
 * 主持人开关 hostBubbleOn 关闭时全部不触发。
 */
export function useHostTrigger() {
  const channelId = usePlayerStore((s) => s.channelId);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const hostBubbleOn = usePlayerStore((s) => s.hostBubbleOn);

  const [state, setState] = useState<HostBubbleState>({
    text: null,
    trigger: null,
    bubbleKey: 0,
  });

  // 触发核心（供各时机复用）：取台词并显示（可关闭台词 = 置 null）
  const showLine = (channelId: string, trigger: HostTrigger) => {
    const host = hostLinesOf(channelId);
    if (!host) return;
    const line = pickLine(host.lines[trigger]);
    if (!line) return;
    setState((s) => ({
      text: line,
      trigger,
      bubbleKey: s.bubbleKey + 1,
    }));
  };

  // enter：频道切换
  const prevChannelRef = useRef<string | null>(channelId);
  useEffect(() => {
    if (!hostBubbleOn) return;
    if (channelId && channelId !== prevChannelRef.current) {
      showLine(channelId, "enter");
    }
    prevChannelRef.current = channelId;
  }, [channelId, hostBubbleOn]);

  // per3：连续曲目计数（channelId 变化清零）
  const prevIndexRef = useRef(currentIndex);
  const trackCountRef = useRef(0);
  useEffect(() => {
    if (!hostBubbleOn || !isPlaying) {
      trackCountRef.current = 0;
      prevIndexRef.current = currentIndex;
      return;
    }
    if (currentIndex !== prevIndexRef.current) {
      trackCountRef.current += 1;
      if (trackCountRef.current >= PER3_COUNT && channelId) {
        showLine(channelId, "per3");
        trackCountRef.current = 0;
      }
    }
    prevIndexRef.current = currentIndex;
  }, [currentIndex, isPlaying, channelId, hostBubbleOn]);

  // idle：60s 无操作（isPlaying 静止）触发一次
  const idleTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!hostBubbleOn) {
      if (idleTimerRef.current !== null) window.clearInterval(idleTimerRef.current);
      idleTimerRef.current = null;
      return;
    }
    // 只在播放静止时计时；任何播放动作重置
    if (isPlaying) {
      if (idleTimerRef.current !== null) window.clearInterval(idleTimerRef.current);
      idleTimerRef.current = null;
      return;
    }
    if (idleTimerRef.current !== null) return; // 已在计时
    if (!channelId) return;
    idleTimerRef.current = window.setTimeout(() => {
      showLine(channelId, "idle");
      idleTimerRef.current = null;
    }, IDLE_MS);
    return () => {
      if (idleTimerRef.current !== null) window.clearInterval(idleTimerRef.current);
      idleTimerRef.current = null;
    };
  }, [isPlaying, channelId, hostBubbleOn]);

  // 清理计时器（卸载）
  useEffect(() => {
    return () => {
      if (idleTimerRef.current !== null) window.clearInterval(idleTimerRef.current);
    };
  }, []);

  return {
    ...state,
    visible: hostBubbleOn && state.text !== null,
    close: () => setState((s) => ({ ...s, text: null })),
  };
}