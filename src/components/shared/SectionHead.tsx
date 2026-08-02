"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./SectionHead.module.css";

interface SectionHeadProps {
  /** 角标文案（如 PLAYLISTS / STAR SEA RADIO） */
  tag: string;
  /** 大标题 */
  title: string;
  /** 副标题（ReactNode，加粗段由调用方 JSX 传入，避免 HTML 字符串） */
  subtitle?: ReactNode;
  /** 居中变体（下载区用） */
  centered?: boolean;
  className?: string;
}

/**
 * 通用段落头：发光圆点角标 + H2（逐字浮现）+ 副标题（角色/歌单/播放器/下载区块共用）
 * 逐字动画由 IntersectionObserver 触发一次（一次性 CSS animation + 负 delay 错落）：
 * 不用 scroll-driven（view()）——字符级 view() 动画在滚动时每帧计算进度，
 * 全站 40+ 字符会显著卡顿；IO 触发播放一次后零开销（性能修复 2026-08-02）
 */
export function SectionHead({ tag, title, subtitle, centered, className }: SectionHeadProps) {
  const headRef = useRef<HTMLHeadingElement | null>(null);
  const [inView, setInView] = useState(false);

  // 进入视口触发一次（IO 回调内 setState，合规；触发后 disconnect）
  useEffect(() => {
    const el = headRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // 无 IO 支持：异步视为已进入视口（避免 effect 内同步 setState）
      const t = setTimeout(() => setInView(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 逐字拆分为独立 span：进入视口时负 delay 错落上浮（米哈游标题手感）
  const chars = Array.from(title);
  return (
    <div className={`${styles.sectionHead}${centered ? ` ${styles.centered}` : ""}${className ? ` ${className}` : ""}`}>
      <span className={styles.tagDot}>
        <i />
        {tag}
      </span>
      <h2 ref={headRef} className={`${styles.head}${inView ? ` ${styles.headIn}` : ""}`}>
        {chars.map((ch, i) => (
          <span key={i} className={styles.char} style={{ animationDelay: `${i * 0.05}s` }}>
            {ch}
          </span>
        ))}
      </h2>
      {subtitle && <p className={styles.secSub}>{subtitle}</p>}
    </div>
  );
}
