"use client";

import { useEffect } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * 自动轮播（2026-08-03，角色区/漂流区通用）：
 * 每 intervalMs（默认 5s）推进一次 next = (active + 1) % count。
 *
 * 设计要点：
 * - setState 全部在 interval 回调（异步）内调用——不触发
 *   react-hooks/set-state-in-effect（该规则只拦 effect 顶层同步 setState）
 * - active 作为 effect 依赖：手动/自动切换后 interval 重建（重置计时），
 *   用户手动点击后不会被立刻切走；回调闭包因此始终是最新 active
 * - onAdvance 须由调用方保证稳定引用（角色区用 useCallback，漂流区直接用
 *   setState），否则每次渲染都会重建 interval
 * - paused（hover/聚焦暂停）或 prefers-reduced-motion 或 count < 2 时跳过
 * - cleanup 清除 interval（STYLE_GUIDE 4.3 铁律）
 */
export function useAutoCycle(
  count: number,
  active: number,
  onAdvance: (next: number) => void,
  options?: { intervalMs?: number; paused?: boolean },
) {
  const intervalMs = options?.intervalMs ?? 5000;
  const paused = options?.paused ?? false;
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (paused || reduced || count < 2) return;
    const timer = window.setInterval(() => {
      onAdvance((active + 1) % count);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [count, intervalMs, paused, reduced, active, onAdvance]);
}
