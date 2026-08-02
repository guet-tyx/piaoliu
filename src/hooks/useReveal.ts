"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 滚动揭示降级（米哈游风格滚动动画的 JS 兜底）：
 * CSS scroll-driven（view() 时间线）不支持时，用 IntersectionObserver 触发浮现。
 * - 仿 useCountUp 模式：threshold .2、首次 intersect 即 disconnect
 * - 所有 setState 在 IO 回调/定时器内（避免 effect 同步 setState 告警）
 * - reduced-motion / 无 IO：元素入视口时直接可见（无动画）
 * - cleanup 断开 IO（铁律）
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 无 IO 支持：微任务中视为已入视口（直接可见）
    if (typeof IntersectionObserver === "undefined") {
      const t = window.setTimeout(() => setInView(true), 0);
      return () => window.clearTimeout(t);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        // reduced-motion 时也置入视口：CSS 侧已压制动画，直接可见
        setInView(true);
      },
      { threshold: 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}
