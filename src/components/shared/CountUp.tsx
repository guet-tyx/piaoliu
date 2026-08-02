"use client";

import { useCountUp } from "@/hooks/useCountUp";

interface CountUpProps {
  /** 目标值（如 128.4 / 9999） */
  end: number;
  /** 后缀（如 万 / +） */
  suffix?: string;
  /** 小数位数，默认由 end 推导（128.4 → 1 位；9999 → 0 位） */
  decimals?: number;
  /** 动画时长 ms，默认 1300 */
  duration?: number;
}

/** 由目标值推导小数位数 */
function deriveDecimals(end: number): number {
  const s = String(end);
  return s.includes(".") ? s.split(".")[1].length : 0;
}

/** 格式化：整数 → 千分位（9,999）；小数 → 按位数保留 */
function formatValue(value: number, decimals: number): string {
  if (decimals === 0) return Math.round(value).toLocaleString("en-US");
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * 数字滚动组件：进入视口后从 0 滚到 end（缓动 cubic-bezier(.22,.61,.36,1)）
 * 渲染 <b> 保持 .cstat b 渐变样式；data-count/data-suffix 保留供 SEO 与后续挂载
 */
export function CountUp({ end, suffix = "", decimals, duration }: CountUpProps) {
  const d = decimals ?? deriveDecimals(end);
  const { ref, value } = useCountUp(end, { duration });

  return (
    <b ref={ref} data-count={end} data-suffix={suffix}>
      {formatValue(value, d)}
      {suffix}
    </b>
  );
}
