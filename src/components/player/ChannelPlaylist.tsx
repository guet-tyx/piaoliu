"use client";

import type { CSSProperties } from "react";
import type { Track } from "@/types/music";
import { usePlayerStore } from "@/stores/player";
import styles from "./ChannelPlaylist.module.css";

interface ChannelPlaylistProps {
  tracks: Track[];
}

/**
 * 频道节目单（P1-05）：
 * 当前播放行（eq 声波动画）+ 未来 5 首（点击插队播放）。
 * 底部统计：本频道 共 N 首 · 约 M 分钟。
 */
export function ChannelPlaylist({ tracks }: ChannelPlaylistProps) {
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const playIndex = usePlayerStore((s) => s.playIndex);

  const current = tracks[currentIndex];
  const upcoming = tracks.slice(currentIndex + 1, currentIndex + 6);
  const totalSec = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  const totalMin = Math.round(totalSec / 60) || 0;

  return (
    <div className={styles.playlist}>
      <p className={styles.title}>节目单</p>

      <ul className={styles.list}>
        {current && (
          <li className={`${styles.row} ${styles.nowRow}`}>
            <span className={styles.eq} aria-hidden="true">
              <i style={{ "--d": "0s" } as CSSProperties} />
              <i style={{ "--d": "-0.22s" } as CSSProperties} />
              <i style={{ "--d": "-0.44s" } as CSSProperties} />
            </span>
            <span className={styles.nowMark}>▶ 正在播放</span>
            <span className={styles.rowTitle}>
              {current.t} <em className={styles.rowTag}>{current.tag}</em>
            </span>
          </li>
        )}
        {upcoming.map((t) => (
          <li key={t.id} className={styles.row}>
            <span className={styles.waitMark} aria-hidden="true">⏳</span>
            <button type="button" className={styles.rowInsert} onClick={() => playIndex(tracks.indexOf(t))}>
              插队播放
            </button>
            <span className={styles.rowTitle}>
              {t.t} <em className={styles.rowTag}>{t.tag}</em>
            </span>
          </li>
        ))}
        {tracks.length === 0 && (
          <li className={styles.empty}>这个频道还没有曲目。</li>
        )}
      </ul>

      <p className={styles.stats}>
        本频道共 <b>{tracks.length}</b> 首 · 约 {totalMin} 分钟
      </p>
    </div>
  );
}