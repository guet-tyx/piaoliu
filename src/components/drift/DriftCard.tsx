"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { DriftPost } from "@/types/social";
import { timeAgo } from "@/lib/time";
import { playTrackSnapshot, resolveTrackId } from "@/lib/player/playSnapshot";
import { openCoListenRoom } from "@/lib/colisten/openRoom";
import { topicOf } from "@/data/topics";
import styles from "./DriftCard.module.css";

interface DriftCardProps {
  post: DriftPost;
  /** 点赞中（防连点） */
  busy?: boolean;
  onLike: () => void;
  onBookmark: () => void;
}

/**
 * 漂流广场瓶子卡片（P0 F-01）：
 * 船客代号（跳足迹页）+ 相对时间 + 正文（3 行省略）+
 * 歌曲快照区（▶ 播放，曲名跳留言墙为 F-02 第二批）+ ♥ 点赞 + 📌 收藏。
 */
export function DriftCard({ post, busy, onLike, onBookmark }: DriftCardProps) {
  const { bottle, liked, bookmarked, likeCount } = post;
  // P1 F-02 留言墙入口：快照可回查曲库时曲名可点击
  const wallId = resolveTrackId(bottle.track);
  // P1 F-07 话题标签（公开漂流专属）
  const topic = topicOf(bottle.topic);
  return (
    <article className={styles.card}>
      <header className={styles.head}>
        <Link href={`/sailor/${encodeURIComponent(bottle.anonMark)}`} className={styles.author}>
          🎭 {bottle.anonMark}
        </Link>
        <span className={styles.time}>{timeAgo(bottle.createdAt)}</span>
      </header>

      {topic && (
        <span
          className={styles.topicTag}
          style={{ "--topicColor": topic.color } as CSSProperties}
        >
          🏷 {topic.name}
        </span>
      )}

      <p className={styles.text}>{bottle.text}</p>

      <div className={styles.track}>
        <Image
          src={bottle.track.cover}
          alt=""
          width={52}
          height={52}
          className={styles.cover}
        />
        <div className={styles.trackMeta}>
          {wallId ? (
            <Link href={`/song/${wallId}`} className={styles.trackName}>
              {bottle.track.t}
            </Link>
          ) : (
            <b>{bottle.track.t}</b>
          )}
          <small>
            {bottle.track.tag} · {bottle.track.s}
          </small>
        </div>
        <button
          type="button"
          className={styles.playBtn}
          aria-label={`播放 ${bottle.track.t}`}
          onClick={() => playTrackSnapshot(bottle.track)}
        >
          ▶
        </button>
      </div>

      <footer className={styles.actions}>
        <button
          type="button"
          className={`${styles.heart}${liked ? ` ${styles.liked}` : ""}`}
          aria-label={liked ? "取消点赞" : "点赞"}
          aria-pressed={liked}
          disabled={busy}
          onClick={onLike}
        >
          <i>{liked ? "❤" : "♡"}</i>
          <b>{likeCount}</b>
        </button>
        <button
          type="button"
          className={`${styles.bookmark}${bookmarked ? ` ${styles.on}` : ""}`}
          aria-label={bookmarked ? "取消收藏" : "收藏"}
          aria-pressed={bookmarked}
          disabled={busy}
          onClick={onBookmark}
        >
          <i>📌</i>
          <b>{bookmarked ? "已收藏" : "收藏"}</b>
        </button>
        {/* P2 星海共听：一键开房（以这首歌为起点） */}
        <button
          type="button"
          className={styles.colisten}
          aria-label="共听这首歌"
          onClick={() => {
            void openCoListenRoom(bottle.track);
          }}
        >
          🎧 共听这首歌
        </button>
      </footer>
    </article>
  );
}