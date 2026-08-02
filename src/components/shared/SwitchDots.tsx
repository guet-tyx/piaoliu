"use client";

import styles from "./SwitchDots.module.css";

interface SwitchDotsProps {
  /** 切换项数量 */
  count: number;
  /** 当前激活索引（0 起） */
  active: number;
  /** 切换回调 */
  onChange: (index: number) => void;
  /** 无障碍标签（如"切换表情"/"切换场景"） */
  ariaLabel: string;
}

/**
 * 底部切换条（调研自 bh3.mihoyo.com 的 .news-pagination，2026-08-02 落地）：
 * 圆点分页条，未激活 rgba(255,255,255,.3)，激活亮青 #55E7FF（崩坏3实测激活色）
 */
export function SwitchDots({ count, active, onChange, ariaLabel }: SwitchDotsProps) {
  return (
    <div className={styles.dots} role="group" aria-label={ariaLabel}>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          className={`${styles.dot}${i === active ? ` ${styles.dotActive}` : ""}`}
          aria-label={`${ariaLabel}·第 ${i + 1} 项`}
          aria-pressed={i === active}
          onClick={() => onChange(i)}
        />
      ))}
    </div>
  );
}
