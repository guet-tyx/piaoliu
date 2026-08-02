"use client";

import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";
import { useReveal } from "@/hooks/useReveal";
import styles from "./Reveal.module.css";

interface RevealProps extends HTMLAttributes<HTMLElement> {
  /** 渲染的元素类型（默认 div） */
  as?: ElementType;
  /** stagger 延迟（秒）：传负值使元素进入视口时已在中途（错落感） */
  delay?: number;
  children?: ReactNode;
}

/**
 * 滚动揭示组件（米哈游风格）：
 * - CSS scroll-driven 优先：进入视口时 revealUp 浮现（view() 时间线）
 * - JS 降级：不支持 scroll-driven 时 IO 触发过渡浮现（useReveal）
 * - delay 负值实现错落（stagger）：元素进入时进度错开
 * - reduced-motion：直接可见
 */
export function Reveal({
  as: Tag = "div",
  delay = 0,
  className,
  children,
  style,
  ...rest
}: RevealProps) {
  const { ref, inView } = useReveal<HTMLElement>();

  return (
    <Tag
      ref={ref}
      className={`${styles.rv}${inView ? ` ${styles.in}` : ""}${className ? ` ${className}` : ""}`}
      style={{ ...style, "--rvDelay": `${delay}s` } as CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  );
}
