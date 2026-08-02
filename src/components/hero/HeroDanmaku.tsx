"use client";

import type { CSSProperties } from "react";
import { HERO_DANMAKU } from "@/data/danmaku";
import { usePlayerStore } from "@/stores/player";
import styles from "./HeroDanmaku.module.css";

/**
 * Hero 弹幕歌词带（装饰性，aria-hidden）
 * 纯 CSS 漂移（dmFloat 全局 keyframes），无 JS；速度/相位由行内 --dmdur/--dmdelay 控制；
 * 显隐受播放器弹幕开关（danmakuOn）统一控制（FR-5）
 */
export function HeroDanmaku() {
  const danmakuOn = usePlayerStore((s) => s.danmakuOn);

  return (
    <div className={`${styles.dmZone}${danmakuOn ? "" : ` ${styles.off}`}`} aria-hidden="true">
      {HERO_DANMAKU.map((dm, i) => (
        <span
          key={i}
          className={`${styles.dm}${dm.variant ? ` ${styles[dm.variant]}` : ""}`}
          style={
            {
              top: dm.top,
              "--dmdur": dm.dur,
              "--dmdelay": dm.delay,
            } as CSSProperties
          }
        >
          {dm.text}
        </span>
      ))}
    </div>
  );
}
