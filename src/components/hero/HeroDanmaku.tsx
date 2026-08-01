import type { CSSProperties } from "react";
import { HERO_DANMAKU } from "@/data/danmaku";
import styles from "./HeroDanmaku.module.css";

/**
 * Hero 弹幕歌词带（装饰性，aria-hidden）
 * 纯 CSS 漂移（dmFloat 全局 keyframes），无 JS；速度/相位由行内 --dmdur/--dmdelay 控制
 */
export function HeroDanmaku() {
  return (
    <div className={styles.dmZone} aria-hidden="true">
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
