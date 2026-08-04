"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { PLAYLISTS } from "@/data/playlists";
import { playlistTrackCount, playlistTracks } from "@/data/music-utils";
import { usePlayerStore } from "@/stores/player";
import styles from "./RecommendCard.module.css";

/**
 * 歌单推荐卡（P3-03）：[playlist: id] 渲染
 * 封面 + 歌单名 + 歌曲数/风格 + 「▶ 播放歌单」→ 切队列播放并跳首页播放器。
 */
export function PlaylistRecommendCard({ id }: { id: string }) {
  const router = useRouter();
  const playQueue = usePlayerStore((s) => s.playQueue);
  const p = PLAYLISTS.find((x) => x.id === id);
  if (!p) {
    return <span className={styles.missing}>[歌单不存在]</span>;
  }
  const count = playlistTrackCount(p);

  const play = () => {
    playQueue(playlistTracks(p), { type: "playlist", id: p.id });
    router.push("/#player");
  };

  return (
    <span className={styles.card}>
      <Image src={p.cover} alt="" width={56} height={56} className={styles.cover} />
      <span className={styles.meta}>
        <span className={styles.name}>{p.name}</span>
        <span className={styles.sub}>
          {count} 首 · {p.tags.join(" / ")}
        </span>
      </span>
      <button type="button" className={styles.btn} onClick={play}>
        ▶ 播放歌单
      </button>
    </span>
  );
}