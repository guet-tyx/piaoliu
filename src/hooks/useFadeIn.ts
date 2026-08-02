"use client";

import { useEffect, type RefObject } from "react";

/**
 * 元素浮现动画（setInterval 直接驱动 style，2026-08-02）：
 * 依赖变化时从 opacity 0 + translateY(18px) 浮现到终态。
 *
 * 为什么不用 CSS animation / WAAPI / rAF：
 * - CSS animation 受 prefers-reduced-motion 全局压制（.01ms !important）
 * - WAAPI（element.animate）与 rAF 在部分受限环境（IAB）不推进
 * - setInterval 在后台/受限环境仍会运行（仅节流），任何环境必然播放
 * - 注意：React Compiler（Next 16 默认）按引用比较 effect 依赖，
 *   调用方必须用 useMemo 缓存稳定 deps 引用（字面量数组会导致反复重跑）
 *
 * - delay 用于"图先字后"错落（主图 0 / 说明文字 .08s / .16s）
 * - 缓动 easeOutCubic ≈ 项目曲线 cubic-bezier(.22,.61,.36,1)
 * - cleanup：clearInterval + 清除内联样式（防残留，STYLE_GUIDE 铁律）
 */
export function useFadeIn(ref: RefObject<HTMLElement | null>, deps: unknown[], delay = 0, duration = 500) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 同步置初态（effect 在 paint 前运行，无闪烁）
    el.style.opacity = "0";
    el.style.transform = "translateY(18px)";

    const start = performance.now() + delay;
    let timer = 0;
    const step = () => {
      const t = Math.min(Math.max((performance.now() - start) / duration, 0), 1);
      const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
      el.style.opacity = String(ease);
      el.style.transform = `translateY(${(1 - ease) * 18}px)`;
      if (t >= 1) window.clearInterval(timer);
    };
    timer = window.setInterval(step, 16);

    return () => {
      window.clearInterval(timer);
      el.style.opacity = "";
      el.style.transform = "";
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps -- 依赖由调用方 useMemo 缓存传入
}
