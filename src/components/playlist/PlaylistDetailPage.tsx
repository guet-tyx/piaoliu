"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Playlist } from "@/types/music";
import {
  playlistTracks,
  playlistTrackCount,
  playlistTotalDuration,
  formatMinutes,
} from "@/data/music-utils";
import { usePlayerStore } from "@/stores/player";
import { Toast } from "@/components/shared/Toast";
import { FavoriteButton } from "./FavoriteButton";
import { ShareModal } from "./ShareModal";
import { PlaylistTrackList } from "./PlaylistTrackList";
import { PlaylistRecommend } from "./PlaylistRecommend";
import styles from "./PlaylistDetailPage.module.css";

/**
 * 歌单详情页（P1-03）：
 * 头部（封面+名称+描述+统计+播放全部/收藏）+ 曲目列表 + 同风格推荐。
 * 播放全部 = playQueue 替换队列；单曲点击 = playQueueAt 从该首起播。
 */
export function PlaylistDetailPage({ playlist }: { playlist: Playlist }) {
  const playQueue = usePlayerStore((s) => s.playQueue);
  const playQueueAt = usePlayerStore((s) => s.playQueueAt);
  const likedPlaylistIds = usePlayerStore((s) => s.likedPlaylistIds);
  const togglePlaylistLike = usePlayerStore((s) => s.togglePlaylistLike);

  const tracks = playlistTracks(playlist);
  const count = playlistTrackCount(playlist);
  const totalSec = playlistTotalDuration(playlist);
  const isLiked = likedPlaylistIds.includes(playlist.id);
  const hasTracks = count > 0;

  /** P2-01：收藏反馈 toast */
  const [toast, setToast] = useState<string | null>(null);
  /** P3-05：分享弹窗开关 */
  const [shareOpen, setShareOpen] = useState(false);

  // 顶部锚点偏移由全局 section[id] scroll-margin 兜底
  useEffect(() => {
    document.title = `${playlist.name} · 星海歌单`;
  }, [playlist.name]);

  const playAll = () => {
    playQueue(playlistTracks(playlist), { type: "playlist", id: playlist.id });
    document.getElementById("player")?.scrollIntoView({ behavior: "smooth" });
  };

  const onToggleFav = () => {
    togglePlaylistLike(playlist.id);
    setToast(isLiked ? `已取消收藏《${playlist.name}》` : `已收藏《${playlist.name}》`);
  };

  return (
    <div className="section">
      {/* 歌单头部 */}
      <div className={styles.head}>
        <div className={styles.coverBox}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={playlist.cover} alt={playlist.alt} className={styles.cover} />
          {playlist.ribbon && (
            <span
              className={`${styles.ribbon}${playlist.ribbon.gold ? ` ${styles.gold}` : ""}`}
            >
              {playlist.ribbon.label}
            </span>
          )}
        </div>
        <div className={styles.headInfo}>
          <p className={styles.kicker}>PLAYLIST · {playlist.scene}</p>
          <h1 className={styles.name}>{playlist.name}</h1>
          <p className={styles.desc}>{playlist.desc}</p>
          <p className={styles.stats}>
            <b>{playlist.meta.plays}</b>播放 · <b>{playlist.meta.dms}</b>弹幕 ·{" "}
            {playlist.meta.time} · {count} 首 / {formatMinutes(totalSec)}
          </p>
          <div className={styles.headActions}>
            <button
              type="button"
              className={styles.playAll}
              disabled={!hasTracks}
              onClick={playAll}
            >
              ▶ 播放全部
            </button>
            <FavoriteButton liked={isLiked} onToggle={onToggleFav} />
            <button type="button" className={styles.shareBtn} onClick={() => setShareOpen(true)}>
              ↗ 分享
            </button>
          </div>
        </div>
      </div>

      {/* 曲目列表（空歌单即使从数据看非空，仍兜底空态） */}
      {hasTracks ? (
        <PlaylistTrackList
          playlist={playlist}
          tracks={tracks}
          onPlayAt={(i) =>
            playQueueAt(playlistTracks(playlist), { type: "playlist", id: playlist.id }, i)
          }
        />
      ) : (
        <div className={styles.empty}>
          <p className={styles.emptyArt}>⛵</p>
          <p className={styles.emptyTitle}>歌单还在筹备中</p>
          <p className={styles.emptyDesc}>这片航线刚画了一半，先去看看别的歌单吧。</p>
          <Link href="/playlist" className={styles.emptyLink}>
            去全部歌曲 →
          </Link>
        </div>
      )}

      {/* 同风格推荐（其他歌单取 4 张） */}
      <PlaylistRecommend currentId={playlist.id} />

      {/* P2-01：收藏反馈 toast */}
      <Toast text={toast} onDone={() => setToast(null)} />

      {/* P3-05：分享弹窗 */}
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} playlist={playlist} />
    </div>
  );
}