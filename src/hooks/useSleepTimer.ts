"use client";

import { useEffect, useState } from "react";
import { usePlayerStore } from "@/stores/player";

/** 定时关闭模式（P2-04） */
export type SleepMode = "after" | "track";

/**
 * useSleepTimer（P2-04）：
 * - 订阅 store 的 sleepDeadline/sleepMode；after 模式下每秒更新 remainingSec（倒计时展示）
 * - 到时由每秒轮询暂停（主路径在 useAudioPlayer ended 分支，双保险）
 * 仿 useAutoCycle 的 setInterval + cleanup 模式（setState 在 interval 回调内，规避 lint/purity）。
 */
export function useSleepTimer() {
  const deadline = usePlayerStore((s) => s.sleepDeadline);
  const sleepMode = usePlayerStore((s) => s.sleepMode);

  // 剩余秒数：interval 回调内计算并 setState（render 期不碰 Date.now，满足 purity）
  const [remainingSec, setRemainingSec] = useState(0);

  useEffect(() => {
    if (sleepMode !== "after" || deadline === null) return;
    const tick = () => {
      const remain = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSec(remain);
      // 到时直接暂停（轮询兜底，主路径在 useAudioPlayer ended 分支）
      if (remain <= 0) {
        const s = usePlayerStore.getState();
        if (s.isPlaying) {
          s.toggle();
        }
        usePlayerStore.setState({ sleepDeadline: null, sleepMode: null });
      }
    };
    tick(); // 立即初始化（effect 内调用非纯函数合法）
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [sleepMode, deadline]);

  return {
    active: sleepMode !== null,
    mode: sleepMode,
    remainingSec,
  };
}