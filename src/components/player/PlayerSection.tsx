"use client";

import type { CSSProperties } from "react";
import { usePlayerStore } from "@/stores/player";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
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

/**
 * 星海电台播放器：UI 层完全只读，所有交互只调 store actions；
 * 唱片旋转/弹幕/频谱的类名全部由 isPlaying 派生
 */
export function PlayerSection() {
  useAudioPlayer();

  const track = usePlayerStore((s) => s.tracks[s.currentIndex]);
  const total = usePlayerStore((s) => s.tracks.length);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLiked = usePlayerStore((s) => s.isLiked);
  const danmakuOn = usePlayerStore((s) => s.danmakuOn);
  const progress = usePlayerStore((s) => s.progress);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const failed = usePlayerStore((s) => s.failed);

  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const toggleDanmaku = usePlayerStore((s) => s.toggleDanmaku);

  return (
    <section className="section" id="player">
      <div className={styles.sectionHead}>
        <span className={styles.tagDot}>
          <i />
          STAR SEA RADIO
        </span>
        <h2>星海电台 · 正在播放</h2>
        <p className={styles.secSub}>点击播放，弹幕会跟着歌一起漂过来。</p>
      </div>

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
            <div className={styles.recordDm} aria-hidden="true">
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

            <div className={styles.progress} aria-hidden="true">
              <i style={{ width: `${progress}%` }} />
            </div>
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
                onClick={toggleLike}
              >
                <i>{isLiked ? "❤" : "♡"}</i>
              </button>
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
