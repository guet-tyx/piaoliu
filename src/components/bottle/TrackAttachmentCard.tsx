"use client";

import Image from "next/image";
import type { TrackSnapshot } from "@/types/social";
import { TRACKS } from "@/data/tracks";
import { CHANNELS } from "@/data/channels";
import { usePlayerStore } from "@/stores/player";
import styles from "./TrackAttachmentCard.module.css";

interface TrackAttachmentCardProps {
  track: TrackSnapshot;
}

/**
 * 收瓶歌曲卡片（P3-02）：
 * 封面 + 曲名 + 艺术家 + 「▶ 播放这首歌」。
 * 点击播放：找到歌曲所属频道并切换到该频道从这首歌开始；不属于任何频道则直接播放。
 */
export function TrackAttachmentCard({ track }: TrackAttachmentCardProps) {
  const playQueue = usePlayerStore((s) => s.playQueue);
  const playQueueAt = usePlayerStore((s) => s.playQueueAt);

  const playThis = () => {
    // 用快照 id 找回曲库曲目（旧数据无 id 时按名字匹配）
    const full = track.id
      ? TRACKS.find((t) => t.id === track.id)
      : TRACKS.find((t) => t.t === track.t);
    if (!full) return;

    // 找到歌曲所属频道（非私人 FM）
    const ch = CHANNELS.find(
      (c) => c.id !== "ch-fm" && c.trackIds.includes(full.id),
    );
    if (ch) {
      const pool = ch.trackIds
        .map((tid) => TRACKS.find((t) => t.id === tid))
        .filter((t): t is (typeof TRACKS)[number] => Boolean(t));
      const at = pool.findIndex((t) => t.id === full.id);
      playQueueAt(pool, { type: "channel", id: ch.id }, Math.max(at, 0));
    } else {
      // 兜底：直接在当前队列播放该曲
      const at = usePlayerStore.getState().tracks.findIndex((t) => t.id === full.id);
      if (at >= 0) {
        playQueueAt(usePlayerStore.getState().tracks, usePlayerStore.getState().source, at);
      } else {
        playQueue([full], { type: "library" });
      }
    }
    document.getElementById("player")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className={styles.card}>
      <Image src={track.cover} alt="" width={56} height={56} className={styles.cover} />
      <div className={styles.meta}>
        <p className={styles.name}>{track.t}</p>
        <p className={styles.sub}>
          {track.tag} · {track.s}
        </p>
      </div>
      <button type="button" className={styles.playBtn} onClick={playThis}>
        ▶ 播放这首歌
      </button>
    </div>
  );
}