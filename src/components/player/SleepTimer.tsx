"use client";

import { useState } from "react";
import { usePlayerStore } from "@/stores/player";
import { useSleepTimer } from "@/hooks/useSleepTimer";
import styles from "./SleepTimer.module.css";

/** 预设选项（P2-04）：分钟值；0 表示「当前曲目结束」 */
const PRESETS: { label: string; minutes: number }[] = [
  { label: "15 分钟后", minutes: 15 },
  { label: "30 分钟后", minutes: 30 },
  { label: "60 分钟后", minutes: 60 },
  { label: "当前曲目结束时", minutes: 0 },
];

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * 定时关闭（P2-04）：
 * ⏱ 入口 → 选择面板（预设 15/30/60 / 当前曲目结束 / 自定义滑杆 5-120 分）→
 * 设置后入口变为倒计时（点击取消）；到时分派在 useAudioPlayer/useSleepTimer。
 */
export function SleepTimer() {
  const setSleepTimer = usePlayerStore((s) => s.setSleepTimer);
  const clearSleepTimer = usePlayerStore((s) => s.clearSleepTimer);
  const { active, mode, remainingSec } = useSleepTimer();

  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(30);

  // 已设置：入口显示倒计时，点击取消
  if (active) {
    const label = mode === "track" ? "曲目结束关" : fmt(remainingSec);
    return (
      <span className={styles.wrap}>
        <button
          type="button"
          className={`${styles.entry} ${styles.on}`}
          aria-label="定时关闭已设置，点击取消"
          title={mode === "track" ? "当前曲目结束后关闭，点击取消" : `剩余 ${Math.floor(remainingSec / 60)} 分 ${remainingSec % 60} 秒后关闭，点击取消`}
          onClick={clearSleepTimer}
        >
          ⏱ {label}
        </button>
      </span>
    );
  }

  return (
    <span className={styles.wrap}>
      <button
        type="button"
        className={styles.entry}
        aria-label="定时关闭"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        ⏱ 定时关闭
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="定时关闭面板">
          <p className={styles.panelTitle}>⏱ 定时关闭</p>
          <p className={styles.panelHint}>音乐将在设定时间后停止播放</p>

          <div className={styles.options} role="radiogroup" aria-label="定时时长">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className={styles.option}
                onClick={() => {
                  if (p.minutes === 0) {
                    setSleepTimer("track");
                  } else {
                    setSleepTimer("after", p.minutes);
                  }
                  setOpen(false);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className={styles.custom}>
            <span className={styles.customLabel}>自定义：{custom} 分钟</span>
            <input
              type="range"
              min={5}
              max={120}
              step={5}
              value={custom}
              aria-label="自定义分钟数"
              onChange={(e) => setCustom(Number(e.target.value))}
            />
            <button
              type="button"
              className={styles.option}
              onClick={() => {
                setSleepTimer("after", custom);
                setOpen(false);
              }}
            >
              自定义 {custom} 分钟
            </button>
          </div>

          <button type="button" className={styles.cancel} onClick={() => setOpen(false)}>
            取消
          </button>
        </div>
      )}
    </span>
  );
}