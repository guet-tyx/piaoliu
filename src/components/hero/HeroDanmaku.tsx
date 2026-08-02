"use client";

import { useEffect } from "react";
import type { CSSProperties } from "react";
import { useDanmakuStore } from "@/stores/danmaku";
import { usePlayerStore } from "@/stores/player";
import type { DanmakuMessage } from "@/lib/realtime/types";
import styles from "./HeroDanmaku.module.css";

/** 系统事件弹幕行位置（自上而下分布） */
const DM_TOPS = ["20%", "31%", "42%", "52%", "63%", "74%"];

/** 欢迎弹幕（系统事件：页面挂载推送 + 渲染层兜底，双保险） */
const WELCOME_LINE: DanmakuMessage = {
  id: "welcome-static",
  text: "汐：欢迎来到星海 ✦",
  variant: "pink",
  system: true,
  at: 0,
};

/**
 * Hero 弹幕带（V1.3 真实化 FR-11）：渲染系统事件弹幕流（启航/拾瓶/回信/汐旁白等），
 * 假数据 HERO_DANMAKU 已移除。空态由欢迎弹幕承接（系统事件，非假数据）。
 * 显隐受播放器弹幕开关（danmakuOn）统一控制
 */
export function HeroDanmaku() {
  const danmakuOn = usePlayerStore((s) => s.danmakuOn);
  const items = useDanmakuStore((s) => s.items);
  const pushSystem = useDanmakuStore((s) => s.pushSystem);

  // 挂载时推送欢迎弹幕（系统事件通道；频控防刷新刷屏）
  useEffect(() => {
    pushSystem("汐：欢迎来到星海 ✦", "welcome", "pink");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅挂载一次，显式避免依赖引用差异
  }, []);

  const systemDm = items.filter((m) => m.system).slice(-6);
  // 渲染层兜底：系统事件流为空时显示欢迎弹幕（不依赖 effect 时序）
  const display = systemDm.length > 0 ? systemDm : [WELCOME_LINE];

  return (
    <div className={`${styles.dmZone}${danmakuOn ? "" : ` ${styles.off}`}`} aria-hidden="true">
      {display.map((dm, i) => (
        <span
          key={dm.id}
          className={`${styles.dm}${dm.variant === "pink" ? ` ${styles.pink}` : ""}${dm.variant === "blue" ? ` ${styles.blue}` : ""}`}
          style={{ top: DM_TOPS[i % DM_TOPS.length] } as CSSProperties}
        >
          {dm.text}
        </span>
      ))}
    </div>
  );
}
