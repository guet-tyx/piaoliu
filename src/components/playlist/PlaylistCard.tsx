"use client";

import Image from "next/image";
import Link from "next/link";
import type { Playlist } from "@/types/music";
import { playlistTrackCount, playlistTracks } from "@/data/music-utils";
import { usePlayerStore } from "@/stores/player";
import styles from "./PlaylistSquare.module.css";

interface PlaylistCardProps {
  playlist: Playlist;
  /** 推荐区大卡（带「推荐」角标 + 描述） */
  featured?: boolean;
}

/**
 * 歌单卡片（P1-04，可复用）：
 * 封面 + 名称 + 统计；hover 显示半透明播放角标（可直接播歌单第一首）。
 * 点击卡片进入 /playlist/[id] 详情页。
 */
export function PlaylistCard({ playlist, featured = false }: PlaylistCardProps) {
  const playQueue = usePlayerStore((s) => s.playQueue);
  const count = playlistTrackCount(playlist);

  /** 悬浮播放：以歌单曲目为队列，从第一首开始，跳到播放器 */
  const quickPlay = () => {
    playQueue(playlistTracks(playlist), { type: "playlist", id: playlist.id });
    document.getElementById("player")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Link
      href={`/playlist/${playlist.id}`}
      className={`${styles.card}${featured ? ` ${styles.featured}` : ""}`}
    >
      <span className={styles.cardCoverBox}>
        <Image
          src={playlist.cover}
          alt={playlist.alt}
          fill
          sizes={featured ? "300px" : "200px"}
          style={{ objectFit: "cover" }}
        />
        {playlist.ribbon && (
          <span
            className={`${styles.ribbon}${playlist.ribbon.gold ? ` ${styles.gold}` : ""}`}
          >
            {playlist.ribbon.label}
          </span>
        )}
        <span
          className={styles.cardPlay}
          role="button"
          aria-label={`播放 ${playlist.name}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            quickPlay();
          }}
        >
          ▶
        </span>
      </span>
      <span className={styles.cardName}>{playlist.name}</span>
      <span className={styles.cardMeta}>
        {count} 首 · {playlist.meta.plays}播放
      </span>
    </Link>
  );
}