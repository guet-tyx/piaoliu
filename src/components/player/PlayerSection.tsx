"use client";

import type { CSSProperties } from "react";
import { usePlayerStore, type PlayMode } from "@/stores/player";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useBondTracker } from "@/hooks/useBondTracker";
import { SectionHead } from "@/components/shared/SectionHead";
import styles from "./PlayerSection.module.css";

/** 唱片弹幕项：行内 --dmdur/--dmdelay 控制速度与相位（负延迟使弹幕进入时已在中途） */
interface RecordDm {
  text: string;
  row: "dmR1" | "dmR2" | "dmR3";
  dur: string;
  delay: string;
  pink?: boolean;
  blue?: boolean;
}

const RECORD_DM: RecordDm[] = [
  { text: "这艘船 好安静", row: "dmR1", dur: "6s", delay: "-1s" },
  { text: "下一首 会是什么", row: "dmR2", dur: "7s", delay: "-4s", pink: true },
  { text: "晚安 星海", row: "dmR3", dur: "6.5s", delay: "-2.5s", blue: true },
  { text: "后摇接说唱 也可以", row: "dmR1", dur: "7.5s", delay: "-5s" },
  { text: "21:47 漂到这里", row: "dmR2", dur: "6.2s", delay: "-3.2s", pink: true },
  { text: "耳机分你一半", row: "dmR3", dur: "8s", delay: "-6s" },
];

/** 播放模式展示元数据（FR-3） */
const MODE_META: Record<PlayMode, { mark: string; label: string; aria: string }> = {
  order: { mark: "顺", label: "顺序", aria: "播放模式：顺序循环" },
  loop: { mark: "单", label: "单曲", aria: "播放模式：单曲循环" },
  shuffle: { mark: "随", label: "随机", aria: "播放模式：随机播放" },
};

/**
 * 32 条频谱柱：确定性伪随机高度/延迟（SSR 与客户端一致，避免水合冲突）
 * 高度 22-88%，延迟 0 ~ -1.09s
 */
const EQ_BARS = Array.from({ length: 32 }, (_, i) => ({
  h: 22 + ((i * 37) % 67),
  d: -(((i * 97) % 110) / 100),
}));

function formatTime(s: number): string {
  const t = Math.floor(s || 0);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

/** 音量/静音图标（内联 SVG，与按钮文字风格统一） */
function VolIcon({ muted }: { muted: boolean }) {
  return muted ? (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 9v6h4l5 5V4L7 9H3z" />
      <path d="M16 9l6 6M22 9l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 9v6h4l5 5V4L7 9H3z" />
      <path d="M16.5 12a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" />
    </svg>
  );
}

/**
 * 星海电台播放器：UI 层完全只读，所有交互只调 store actions；
 * 唱片旋转/弹幕/频谱的类名全部由 isPlaying 派生；
 * 进度条/音量/模式/收藏/弹幕开关为 V1.0.1 体验修补（FR-1~FR-5）
 */
export function PlayerSection() {
  useAudioPlayer();
  useBondTracker();

  const track = usePlayerStore((s) => s.tracks[s.currentIndex]);
  const total = usePlayerStore((s) => s.tracks.length);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const likedIds = usePlayerStore((s) => s.likedIds);
  const danmakuOn = usePlayerStore((s) => s.danmakuOn);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const playMode = usePlayerStore((s) => s.playMode);
  const progress = usePlayerStore((s) => s.progress);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const failed = usePlayerStore((s) => s.failed);

  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const toggleDanmaku = usePlayerStore((s) => s.toggleDanmaku);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const cyclePlayMode = usePlayerStore((s) => s.cyclePlayMode);

  const isLiked = likedIds.includes(track.id);
  const mode = MODE_META[playMode];
  /** 进度条范围（duration 未载入时按 1 兜底并禁用） */
  const progressMax = Math.floor(duration) || 1;
  const progressValue = Math.min(Math.floor(currentTime), progressMax);
  const volValue = muted ? 0 : volume;

  return (
    <section className="section" id="player">
      <SectionHead
        tag="STAR SEA RADIO"
        title="星海电台 · 正在播放"
        subtitle="点击播放，弹幕会跟着歌一起漂过来。"
      />

      <div className={styles.playerWrap}>
        <div className={styles.player}>
          {/* 唱片 + 弹幕层 */}
          <div className={`${styles.recordBox}${isPlaying ? ` ${styles.live}` : ""}`}>
            <div
              className={`${styles.record}${isPlaying ? ` ${styles.playing}` : ""}`}
              aria-hidden="true"
              style={
                {
                  background: `url("${track.cover}") center/cover no-repeat, radial-gradient(circle at 50% 50%, #222 0 30%, transparent 31%)`,
                } as CSSProperties
              }
            />
            {/* 弹幕层受 danmakuOn 控制（FR-5：开关真实生效） */}
            <div
              className={`${styles.recordDm}${danmakuOn ? "" : ` ${styles.off}`}`}
              aria-hidden="true"
            >
              {RECORD_DM.map((dm, i) => (
                <span
                  key={i}
                  className={`${styles.dm} ${styles[dm.row]}${dm.pink ? ` ${styles.pink}` : ""}${dm.blue ? ` ${styles.blue}` : ""}`}
                  style={{ "--dmdur": dm.dur, "--dmdelay": dm.delay } as CSSProperties}
                >
                  {dm.text}
                </span>
              ))}
            </div>
          </div>

          {/* 现在播放信息 */}
          <div className={styles.pNow}>
            <p className={styles.nowKicker}>
              星海电台 · 第 {currentIndex + 1}/{total} 站
            </p>
            <h3 className={styles.nowTitle}>
              「{track.t}」<em className={styles.nowTag}>{track.tag}</em>
            </h3>
            <p className={styles.nowArtist}>{track.s}</p>

            <div className={`${styles.eq}${isPlaying ? ` ${styles.live}` : ""}`} aria-hidden="true">
              {EQ_BARS.map((bar, i) => (
                <i key={i} style={{ "--h": `${bar.h}%`, "--d": `${bar.d}s` } as CSSProperties} />
              ))}
            </div>

            {/* FR-1：可拖动进度条（原生 range，键盘可达；--fill 驱动轨道渐变） */}
            <input
              className={styles.progress}
              type="range"
              min={0}
              max={progressMax}
              step={1}
              value={progressValue}
              disabled={duration <= 0}
              aria-label="播放进度"
              style={{ "--fill": `${progress}%` } as CSSProperties}
              onChange={(e) => seekTo(Number(e.target.value))}
            />
            <div className={styles.timeRow}>
              <span>{formatTime(currentTime)}</span>
              <span>{duration > 0 ? formatTime(duration) : "--:--"}</span>
            </div>

            <div className={styles.nowCtrl}>
              <button className={styles.npSide} type="button" aria-label="上一首" onClick={prev}>
                ⏮
              </button>
              <button className={styles.nowPlay} type="button" aria-label="播放/暂停" onClick={toggle}>
                {isPlaying ? "❚❚" : failed ? "!" : "▶"}
              </button>
              <button className={styles.npSide} type="button" aria-label="下一首" onClick={next}>
                ⏭
              </button>
              <button
                className={`${styles.nowHeart}${isLiked ? ` ${styles.liked}` : ""}`}
                type="button"
                aria-label="收藏"
                aria-pressed={isLiked}
                onClick={() => toggleLike(track.id)}
              >
                <i>{isLiked ? "❤" : "♡"}</i>
              </button>
              {/* FR-3：播放模式循环切换 */}
              <button
                className={styles.modeBtn}
                type="button"
                aria-label={mode.aria}
                onClick={cyclePlayMode}
              >
                <i>{mode.mark}</i> {mode.label}
              </button>
              {/* FR-2：音量滑杆 + 静音 */}
              <div className={styles.volGroup}>
                <button
                  className={styles.volBtn}
                  type="button"
                  aria-label={muted ? "取消静音" : "静音"}
                  aria-pressed={muted}
                  onClick={toggleMute}
                >
                  <VolIcon muted={muted} />
                </button>
                <input
                  className={styles.vol}
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volValue}
                  aria-label="音量"
                  style={{ "--fill": `${volValue * 100}%` } as CSSProperties}
                  onChange={(e) => setVolume(Number(e.target.value))}
                />
              </div>
              <button
                className={`${styles.dmToggle}${danmakuOn ? ` ${styles.on}` : ""}`}
                type="button"
                aria-label="弹幕开关"
                onClick={toggleDanmaku}
              >
                <i>弹</i> {danmakuOn ? "弹幕开" : "弹幕关"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
