"use client";

import Image from "next/image";
import type { KeyboardEvent } from "react";
import { PLAYLISTS } from "@/data/playlists";
import { usePlayerStore } from "@/stores/player";
import styles from "./PlaylistSection.module.css";

/**
 * 歌单（B站首页式）：点击卡片 → 播放对应曲目并平滑滚动到播放器
 * 歌单 i 与曲目 i 一一对应（视觉关联，见 src/data/playlists.ts）
 */
export function PlaylistSection() {
  const playTrack = usePlayerStore((s) => s.playTrack);

  /** 播放对应曲目并滚动到播放器 */
  const handlePlay = (index: number) => {
    playTrack(index);
    document.getElementById("player")?.scrollIntoView({ behavior: "smooth" });
  };

  /** 键盘可访问：Enter / Space 触发播放 */
  const handleKeyDown = (index: number) => (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handlePlay(index);
    }
  };

  return (
    <section className="section" id="playlist">
      <div className={styles.sectionHead}>
        <span className={styles.tagDot}>
          <i />
          PLAYLISTS
        </span>
        <h2>今夜在漂的歌单</h2>
        <p className={styles.secSub}>每一张都是一条航线。点进去，船就开了。</p>
      </div>

      <div className={styles.pGrid}>
        {PLAYLISTS.map((playlist, index) => (
          <div
            key={playlist.name}
            className={styles.pCard}
            tabIndex={0}
            role="button"
            aria-label={`${playlist.name}歌单`}
            onClick={() => handlePlay(index)}
            onKeyDown={handleKeyDown(index)}
          >
            <div className={styles.pCover}>
              {playlist.ribbon && (
                <span
                  className={`${styles.ribbon}${playlist.ribbon.gold ? ` ${styles.gold}` : ""}`}
                >
                  {playlist.ribbon.label}
                </span>
              )}
              <Image
                src={playlist.cover}
                alt={playlist.alt}
                fill
                sizes="(max-width: 960px) 50vw, 25vw"
                style={{ objectFit: "cover" }}
              />
              <span className={styles.pPlay}>▶</span>
            </div>
            <p className={styles.pName}>{playlist.name}</p>
            <p className={styles.pMeta}>
              <b>{playlist.meta.plays}</b>播放 · <b>{playlist.meta.dms}</b>弹幕 ·{" "}
              {playlist.meta.time}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
