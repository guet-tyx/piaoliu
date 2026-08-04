"use client";

import Image from "next/image";
import Link from "next/link";
import { PLAYLISTS } from "@/data/playlists";
import styles from "./PlaylistDetailPage.module.css";

/**
 * 歌单详情页底部推荐（P1-03）：
 * 同风格/同场景优先，最多 4 张；无匹配则按 order 顺序补位。
 */
export function PlaylistRecommend({ currentId }: { currentId: string }) {
  const current = PLAYLISTS.find((p) => p.id === currentId);
  const others = PLAYLISTS.filter((p) => p.id !== currentId);

  const scored = [...others]
    .map((p) => {
      let score = 0;
      if (current) {
        const sharedTags = p.tags.filter((t) => current.tags.includes(t)).length;
        score += sharedTags * 2;
        if (p.scene === current.scene) score += 1;
        if (p.mood === current.mood) score += 1;
      }
      return { p, score };
    })
    .sort((a, b) => b.score - a.score || (a.p.order ?? 99) - (b.p.order ?? 99))
    .slice(0, 4)
    .map((x) => x.p);

  return (
    <div className={styles.recommend}>
      <h2 className={styles.recommendTitle}>同风格航线 · 你可能也爱</h2>
      <div className={styles.recommendRow}>
        {scored.map((p) => (
          <Link key={p.id} href={`/playlist/${p.id}`} className={styles.recCard}>
            <span className={styles.recCoverBox}>
              <Image src={p.cover} alt={p.alt} fill sizes="200px" style={{ objectFit: "cover" }} />
              <span className={styles.recPlay} aria-hidden="true">▶</span>
            </span>
            <span className={styles.recName}>{p.name}</span>
            <span className={styles.recMeta}>{p.mood} · {p.scene}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}