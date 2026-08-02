"use client";

import { useEffect, type RefObject } from "react";

/** 项目缓动曲线（与 revealUp/rise 一致） */
const EASE = "cubic-bezier(.22, .61, .36, 1)";

/**
 * 元素浮现动画（Web Animations API 驱动，2026-08-02）：
 * 依赖变化时从 opacity 0 + translateY(18px) 浮现到终态。
 * - 用 WAAPI 而非 CSS animation：不受 prefers-reduced-motion 全局压制
 *   （globals.css 的 .01ms !important 只作用于 CSS animation/transition）影响，
 *   也不依赖 key 重挂载触发，保证"切换场景慢慢浮现"在任何环境生效
 * - delay 用于"图先字后"错落（主图 0 / 说明文字 .08s / .16s）
 * - 只动 transform/opacity；元素初始透明由 WAAPI fill: both 接管（无闪烁）
 */
export function useFadeIn(ref: RefObject<HTMLElement | null>, deps: unknown[], delay = 0, duration = 500) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const anim = el.animate(
      [
        { opacity: 0, transform: "translateY(18px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration, delay, easing: EASE, fill: "both" },
    );
    return () => anim.cancel();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps -- 依赖由调用方显式传入（切换索引）
}
