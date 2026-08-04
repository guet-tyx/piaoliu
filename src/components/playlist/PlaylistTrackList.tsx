"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import type { Playlist, Track } from "@/types/music";
import { formatDuration } from "@/data/music-utils";
import { usePlayerStore } from "@/stores/player";
import styles from "./PlaylistDetailPage.module.css";

interface PlaylistTrackListProps {
  playlist: Playlist;
  tracks: Track[];
  /** 从第 index 首起播（playQueueAt） */
  onPlayAt: (index: number) => void;
}

/**
 * 歌单曲目列表（P1-03）：
 * 序号 + 封面 + 歌名 + 艺术家 + 时长 + 收藏；当前播放行高亮 + eq 动画；
 * 悬停显示 ▶；audio src 为空的行视为失效（⛔ 禁播）。
 */
export function PlaylistTrackList({ playlist, tracks, onPlayAt }: PlaylistTrackListProps) {
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const source = usePlayerStore((s) => s.source);
  const likedIds = usePlayerStore((s) => s.likedIds);
  const toggleLike = usePlayerStore((s) => s.toggleLike);

  // 仅当「正在播放的队列就是本歌单」时才高亮对应行
  const isActiveQueue = source.type === "playlist" && source.id === playlist.id;

  return (
    <div className={styles.listWrap}>
      <div className={styles.listHead} aria-hidden="true">
        <span className={styles.colNo}>№</span>
        <span className={styles.colTitle}>曲目</span>
        <span className={styles.colArtist}>艺术家</span>
        <span className={styles.colDuration}>时长</span>
        <span className={styles.colLike} />
      </div>
      <ul className={styles.trackList}>
        {tracks.map((track, i) => {
          const isCurrent = isActiveQueue && i === currentIndex;
          const broken = track.src.length === 0;
          return (
            <li
              key={track.id}
              className={`${styles.trackRow}${isCurrent ? ` ${styles.current}` : ""}${broken ? ` ${styles.broken}` : ""}`}
            >
              <span className={styles.colNo}>
                {isCurrent ? (
                  <span className={styles.eq} aria-hidden="true">
                    <i style={{ "--d": "0s" } as CSSProperties} />
                    <i style={{ "--d": "-0.2s" } as CSSProperties} />
                    <i style={{ "--d": "-0.4s" } as CSSProperties} />
                  </span>
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <button
                type="button"
                className={styles.trackMain}
                disabled={broken}
                aria-label={broken ? `${track.t} 暂时无法播放` : `播放 ${track.t}`}
                onClick={() => onPlayAt(i)}
              >
                <span className={styles.trackCoverBox}>
                  <Image
                    src={track.cover}
                    alt=""
                    width={44}
                    height={44}
                    className={styles.trackCover}
                  />
                  <span className={styles.trackHoverPlay} aria-hidden="true">
                    {broken ? "⛔" : "▶"}
                  </span>
                </span>
                <span className={styles.trackText}>
                  <span className={styles.trackName}>
                    {track.t}
                    <em className={styles.trackTag}>{track.tag}</em>
                  </span>
                  <span className={styles.trackSub}>{track.s}</span>
                </span>
              </button>
              <span className={styles.colArtist}>{track.s.split("·")[0]}</span>
              <span className={styles.colDuration}>
                {broken ? "无法播放" : formatDuration(track.duration)}
              </span>
              <button
                type="button"
                className={`${styles.rowLike}${likedIds.includes(track.id) ? ` ${styles.liked}` : ""}`}
                aria-label={likedIds.includes(track.id) ? "取消收藏" : "收藏"}
                aria-pressed={likedIds.includes(track.id)}
                onClick={() => toggleLike(track.id)}
              >
                {likedIds.includes(track.id) ? "❤" : "♡"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
