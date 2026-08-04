"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * 系统「减少动态效果」偏好（2026-08-03）：
 * useSyncExternalStore 订阅 matchMedia，运行中偏好变化即时响应；
 * SSR 兜底 false（水合后立即切换到客户端真实快照，无闪烁）。
 * 供自动轮播等 JS 侧动效做偏好控制（CSS 侧由 globals.css 全局压制双保险）。
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
