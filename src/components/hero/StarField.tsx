"use client";

import { useEffect, useRef } from "react";
import styles from "./StarField.module.css";

interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
  da: number;
  /** rgb 前缀（70% 粉 / 30% 蓝） */
  hue: string;
}

/**
 * 星尘粒子：hero 深空细闪（≤80 颗，粉蓝双色）
 * - prefers-reduced-motion 命中时不初始化
 * - visibilitychange：隐藏时取消 rAF，恢复时重启（省电）
 * - cleanup：取消 rAF + 移除 resize/visibilitychange 监听（防泄漏）
 */
export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // 动效偏好：直接不初始化
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    let stars: Star[] = [];
    let raf = 0;
    let running = false;

    const build = () => {
      const n = Math.min(80, Math.floor((W * H) / 16000));
      stars = [];
      for (let i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.4 + 0.4,
          a: Math.random() * 0.6 + 0.2,
          da: (Math.random() * 0.016 + 0.004) * (Math.random() < 0.5 ? 1 : -1),
          hue: Math.random() < 0.7 ? "251,114,153" : "0,174,236",
        });
      }
    };

    const resize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      build();
    };

    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        s.a += s.da;
        if (s.a > 0.85 || s.a < 0.1) s.da *= -1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.hue},${s.a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };

    /** 标签页隐藏时暂停、恢复时重启（running 标志防止双 rAF 链） */
    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        running = false;
      } else if (!running) {
        running = true;
        tick();
      }
    };

    resize();
    running = true;
    tick();
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.stars} aria-hidden="true" />;
}
