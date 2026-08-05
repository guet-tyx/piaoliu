"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { DriftPost } from "@/types/social";
import { timeAgo } from "@/lib/time";
import { playTrackSnapshot, resolveTrackId } from "@/lib/player/playSnapshot";
import { openCoListenRoom } from "@/lib/colisten/openRoom";
import { bottleDisplayName } from "@/lib/social-name";
import { topicOf } from "@/data/topics";
import { starRoleOf } from "@/data/star-praise";
import { ROLE_COLOR } from "@/data/roles";
import { isStarPraiseSeen, markStarPraiseSeen } from "@/lib/community/starPraise";
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
 * 歌曲快照区（▶ 播放，曲名跳留言墙为 F-02 第二批）+ ♥ 点赞 + 📌 收藏 +
 * P3 A-01 角色星海赞（⭐ 角色 赞了，被赞卡片微弱发光，新赞首次看到滑入动画）。
 */
export function DriftCard({ post, busy, onLike, onBookmark }: DriftCardProps) {
  const { bottle, liked, bookmarked, likeCount, starPraises = [] } = post;
  // P1 F-02 留言墙入口：快照可回查曲库时曲名可点击
  const wallId = resolveTrackId(bottle.track);
  // P1 F-07 话题标签（公开漂流专属）
  const topic = topicOf(bottle.topic);
  // P3 A-01 新赞首次看到的滑入动画（已看记录去重，只播一次）
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    if (starPraises.length === 0) return;
    const unseen = starPraises.some((r) => !isStarPraiseSeen(bottle.id, r));
    if (!unseen) return;
    starPraises.forEach((r) => markStarPraiseSeen(bottle.id, r));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 星海赞首次看到的动画标记（localStorage 外部源，SSR 后客户端一次）
    setFresh(true);
    const t = window.setTimeout(() => setFresh(false), 1800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bottle.id, post.starPraises]);

  return (
    <article className={`${styles.card}${starPraises.length > 0 ? ` ${styles.starGlow}` : ""}`}>
      <header className={styles.head}>
        <Link href={`/sailor/${encodeURIComponent(bottle.anonMark)}`} className={styles.author}>
          🎭 {bottleDisplayName(bottle)}
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

        {/* P3 A-01 角色星海赞：最多显示 2 个角色，超出折叠为「⭐ 汐 等 N 位角色赞了」 */}
        {starPraises.length > 0 && (
          <span
            className={`${styles.starWrap}${fresh ? ` ${styles.fresh}` : ""}`}
            aria-label="角色星海赞"
          >
            {starPraises.length > 2 ? (
              <span
                className={styles.starChip}
                style={{ "--roleColor": starColor(starPraises[0]) } as CSSProperties}
                title={starLine(starPraises[0])}
              >
                ⭐ {starName(starPraises[0])} 等 {starPraises.length} 位角色赞了
              </span>
            ) : (
              starPraises.map((r) => (
                <span
                  key={r}
                  className={styles.starChip}
                  style={{ "--roleColor": starColor(r) } as CSSProperties}
                  title={starLine(r)}
                >
                  ⭐ {starName(r)} 赞了
                </span>
              ))
            )}
          </span>
        )}

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

/* ---- P3 A-01 星海赞展示辅助（角色名/配色/赞语） ---- */

function starName(roleId: string): string {
  return starRoleOf(roleId)?.name ?? roleId;
}

function starColor(roleId: string): string {
  return ROLE_COLOR[roleId] ?? "#C9A043";
}

function starLine(roleId: string): string {
  return starRoleOf(roleId)?.lines[0] ?? "";
}