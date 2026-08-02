"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ScrollChrome.module.css";

/** 显示返回顶部按钮的滚动阈值（px） */
const SHOW_TOP_AFTER = 600;

/**
 * 滚动叙事配件（2026-08-02）：
 * 1. 顶部 2px 滚动进度条（粉→蓝渐变，scaleX 合成器友好；ref 直写零重渲染）
 * 2. 返回顶部悬浮按钮（滚动超阈值出现，点击平滑回顶）
 * - cleanup：移除 scroll 监听（STYLE_GUIDE 铁律）
 * - showTop 布尔 state：React 同值 bailout，无性能问题
 */
export function ScrollChrome() {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
      setShowTop(window.scrollY > SHOW_TOP_AFTER);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* 滚动进度条（Topbar 之上） */}
      <div className={styles.progressTrack} aria-hidden="true">
        <div ref={barRef} className={styles.progressBar} />
      </div>

      {/* 返回顶部（滚动后悬浮出现） */}
      <button
        type="button"
        className={`${styles.topBtn}${showTop ? ` ${styles.topBtnVisible}` : ""}`}
        aria-label="回到顶部"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
          <path d="M12 19 L12 5 M5 12 L12 5 L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </>
  );
}
