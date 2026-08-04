"use client";

import { useEffect } from "react";
import styles from "./Toast.module.css";

interface ToastProps {
  /** 显示文案；null 时隐藏 */
  text: string | null;
  /** 自动消失毫秒（默认 2000） */
  duration?: number;
  onDone?: () => void;
}

/**
 * 迷你 toast（P2-01）：仿 Chat 区既有模式的自包含轻提示
 * - role="status" 无障碍播报
 * - text 变化时重置自动消失计时；text 为 null 不渲染
 */
export function Toast({ text, duration = 2000, onDone }: ToastProps) {
  useEffect(() => {
    if (!text) return;
    const timer = window.setTimeout(() => onDone?.(), duration);
    return () => window.clearTimeout(timer);
  }, [text, duration, onDone]);

  if (!text) return null;
  return (
    <div className={styles.toast} role="status" aria-live="polite">
      {text}
    </div>
  );
}