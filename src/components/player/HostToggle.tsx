"use client";

import { usePlayerStore } from "@/stores/player";
import styles from "./HostToggle.module.css";

/**
 * 主持人开关（P3-01）：电台区域右上角胶囊
 * 关闭后气泡/换曲介绍/空闲台词全部不触发（useHostTrigger 内部判断）。
 */
export function HostToggle() {
  const hostBubbleOn = usePlayerStore((s) => s.hostBubbleOn);
  const toggleHostBubble = usePlayerStore((s) => s.toggleHostBubble);

  return (
    <button
      type="button"
      className={`${styles.toggle}${hostBubbleOn ? ` ${styles.on}` : ""}`}
      aria-label="主持人开关"
      aria-pressed={hostBubbleOn}
      onClick={toggleHostBubble}
    >
      🎙 {hostBubbleOn ? "主持人开" : "主持人关"}
    </button>
  );
}