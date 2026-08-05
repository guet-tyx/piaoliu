"use client";

import Image from "next/image";
import Link from "next/link";
import type { TrackSnapshot } from "@/types/social";
import { playTrackSnapshot, resolveTrackId } from "@/lib/player/playSnapshot";
import styles from "./TrackAttachmentCard.module.css";

interface TrackAttachmentCardProps {
  track: TrackSnapshot;
}

/**
 * 收瓶歌曲卡片（P3-02 + P1 F-02）：
 * 封面 + 曲名 + 艺术家 + 「▶ 播放这首歌」+「查看留言」（留言墙入口）。
 * 播放逻辑统一走 lib/player/playSnapshot（与漂流广场卡共用）。
 */
export function TrackAttachmentCard({ track }: TrackAttachmentCardProps) {
  const wallId = resolveTrackId(track);
  return (
    <div className={styles.card}>
      <Image src={track.cover} alt="" width={56} height={56} className={styles.cover} />
      <div className={styles.meta}>
        <p className={styles.name}>{track.t}</p>
        <p className={styles.sub}>
          {track.tag} · {track.s}
        </p>
      </div>
      <div className={styles.actions}>
        {wallId && (
          <Link href={`/song/${wallId}`} className={styles.wallLink}>
            查看留言
          </Link>
        )}
        <button type="button" className={styles.playBtn} onClick={() => playTrackSnapshot(track)}>
          ▶ 播放这首歌
        </button>
      </div>
    </div>
  );
}