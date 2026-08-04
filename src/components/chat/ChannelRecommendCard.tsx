"use client";

import { useRouter } from "next/navigation";
import { CHANNELS } from "@/data/channels";
import { TRACKS } from "@/data/tracks";
import { buildFmQueue } from "@/stores/player";
import { usePlayerStore } from "@/stores/player";
import styles from "./RecommendCard.module.css";

/**
 * 频道推荐卡（P3-03）：[channel: id] 渲染
 * 频道图标 + 名称 + 描述 + 「切换到该频道」→ 切队列播放并跳首页播放器。
 */
export function ChannelRecommendCard({ id }: { id: string }) {
  const router = useRouter();
  const playQueue = usePlayerStore((s) => s.playQueue);
  const ch = CHANNELS.find((x) => x.id === id);
  if (!ch) {
    return <span className={styles.missing}>[频道不存在]</span>;
  }

  const play = () => {
    const pool =
      ch.id === "ch-fm"
        ? buildFmQueue()
        : ch.trackIds
            .map((tid) => TRACKS.find((t) => t.id === tid))
            .filter((t): t is (typeof TRACKS)[number] => Boolean(t));
    playQueue(pool, { type: "channel", id: ch.id });
    router.push("/#player");
  };

  return (
    <span className={styles.card}>
      <span className={styles.chIcon} aria-hidden="true">
        {ch.icon}
      </span>
      <span className={styles.meta}>
        <span className={styles.name}>{ch.name}</span>
        <span className={styles.sub}>「{ch.desc}」</span>
      </span>
      <button type="button" className={styles.btn} onClick={play}>
        切换到该频道
      </button>
    </span>
  );
}