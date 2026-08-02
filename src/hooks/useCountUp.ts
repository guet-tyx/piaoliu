"use client";

import { useEffect, useRef, useState } from "react";

/** 项目动效缓动曲线（与 revealUp/rise 等一致） */
const EASE = { x1: 0.22, y1: 0.61, x2: 0.36, y2: 1 };
const DEFAULT_DURATION = 1300;

/** 计算 cubic-bezier(x1,y1,x2,y2) 在 t 处的 x 值（Newton-Raphson 求解） */
function sampleCubicBezierX(x1: number, x2: number, t: number): number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  return ((ax * t + bx) * t + cx) * t;
}

function sampleCubicBezierY(y1: number, y2: number, t: number): number {
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  return ((ay * t + by) * t + cy) * t;
}

/** 由进度 x 求曲线上的 y（速度采样 + Newton 迭代） */
function cubicBezierEasing(x1: number, y1: number, x2: number, y2: number) {
  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // Newton-Raphson 迭代求 t
    let t = x;
    for (let i = 0; i < 8; i++) {
      const xSample = sampleCubicBezierX(x1, x2, t);
      const dx = 3 * (x1 - 2 * x2 + 1) * t * t + 6 * (x2 - x1) * t + 3 * x1;
      if (Math.abs(dx) < 1e-6) break;
      t -= (xSample - x) / dx;
      t = Math.min(Math.max(t, 0), 1);
    }
    return sampleCubicBezierY(y1, y2, t);
  };
}

interface UseCountUpOptions {
  /** 动画时长（ms），默认 1300 */
  duration?: number;
}

/**
 * 数字滚动：元素进入视口（IO threshold .4，触发一次）后从 0 滚到 target
 * - 缓动沿用项目曲线 cubic-bezier(.22,.61,.36,1)
 * - prefers-reduced-motion 直接跳终值
 * - cleanup 断开 IO + 取消 rAF（防泄漏）
 */
export function useCountUp(target: number, options: UseCountUpOptions = {}) {
  const ref = useRef<HTMLElement | null>(null);
  const [value, setValue] = useState(0);
  const duration = options.duration ?? DEFAULT_DURATION;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 动效偏好 / 无 IO 支持：进入视口时直接跳终值（在 IO 回调内 setState，避免 effect 同步 setState）
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const noObserver = typeof IntersectionObserver === "undefined";

    let raf = 0;
    const ease = cubicBezierEasing(EASE.x1, EASE.y1, EASE.x2, EASE.y2);

    const animate = () => {
      const t0 = performance.now();
      const frame = (now: number) => {
        const p = Math.min((now - t0) / duration, 1);
        setValue(target * ease(p));
        if (p < 1) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        if (reducedMotion || noObserver) {
          setValue(target);
        } else {
          animate();
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, duration]);

  return { ref, value };
}
