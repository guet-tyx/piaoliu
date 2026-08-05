"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchGoldenQuotes,
  fetchHotToday,
  fetchWeeklySailors,
  type GoldenQuoteEntry,
  type HotTodayEntry,
  type WeeklySailorEntry,
} from "@/lib/api/leaderboard";
import { playTrackSnapshot } from "@/lib/player/playSnapshot";
import { bottleDisplayName, markDisplayName } from "@/lib/social-name";
import styles from "./LeaderboardPanel.module.css";

type BoardKind = "hot" | "sailors" | "quotes";

/** 排行榜奖牌：第 1-3 名奖牌，其余数字 */
function Medal({ rank }: { rank: number }) {
  if (rank === 1) return <span className={`${styles.medal} ${styles.gold}`}>🥇</span>;
  if (rank === 2) return <span className={`${styles.medal} ${styles.silver}`}>🥈</span>;
  if (rank === 3) return <span className={`${styles.medal} ${styles.bronze}`}>🥉</span>;
  return <span className={styles.medal}>{rank}</span>;
}

const EMPTY_TEXT: Record<BoardKind, string> = {
  hot: "今日暂无热门漂流，来投第一艘船吧。",
  sailors: "本周还没有活跃船客。",
  quotes: "还没有金句诞生。",
};

/**
 * 漂流排行榜（P1 F-06）：今日热榜 / 本周船客 / 星海金句 三个子榜，各 Top10。
 * 点赞后热榜在父级刷新周期内重新拉取（页面级刷新）。
 */
export function LeaderboardPanel() {
  const [kind, setKind] = useState<BoardKind>("hot");
  const [hot, setHot] = useState<HotTodayEntry[] | null>(null);
  const [sailors, setSailors] = useState<WeeklySailorEntry[] | null>(null);
  const [quotes, setQuotes] = useState<GoldenQuoteEntry[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [h, s, q] = await Promise.all([
        fetchHotToday(),
        fetchWeeklySailors(),
        fetchGoldenQuotes(),
      ]);
      if (alive) {
        setHot(h);
        setSailors(s);
        setQuotes(q);
      }
    })();
    return () => {
      alive = false;
    };
  }, [kind]);

  const list = kind === "hot" ? hot : kind === "sailors" ? sailors : quotes;

  return (
    <div className={styles.wrap}>
      <div className={styles.subTabs} role="tablist" aria-label="排行榜分类">
        {(
          [
            ["hot", "今日热榜"],
            ["sailors", "本周船客"],
            ["quotes", "星海金句"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`${styles.subTab}${kind === id ? ` ${styles.active}` : ""}`}
            aria-pressed={kind === id}
            onClick={() => setKind(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {list === null ? (
        <p className={styles.empty}>正在计算排行…</p>
      ) : list.length === 0 ? (
        <p className={styles.empty}>{EMPTY_TEXT[kind]}</p>
      ) : (
        <div className={styles.board}>
          {kind !== "sailors" &&
            (list as (HotTodayEntry | GoldenQuoteEntry)[]).map((e) => (
              <article key={e.bottle.id} className={styles.row}>
                <Medal rank={e.rank} />
                <div className={styles.rowMain}>
                  <div className={styles.rowHead}>
                    <Link
                      href={`/sailor/${encodeURIComponent(e.bottle.anonMark)}`}
                      className={styles.sailor}
                    >
                      🎭 {bottleDisplayName(e.bottle)}
                    </Link>
                    <span className={styles.likes}>♥ {e.likes}</span>
                  </div>
                  <p className={styles.preview}>{e.bottle.text}</p>
                  <div className={styles.trackRow}>
                    <span className={styles.trackName}>
                      🎵 {e.bottle.track.t} · {e.bottle.track.tag}
                    </span>
                    <button
                      type="button"
                      className={styles.play}
                      aria-label={`播放 ${e.bottle.track.t}`}
                      onClick={() => playTrackSnapshot(e.bottle.track)}
                    >
                      ▶
                    </button>
                  </div>
                </div>
              </article>
            ))}
          {kind === "sailors" &&
            (list as WeeklySailorEntry[]).map((e) => (
              <article key={e.anonMark} className={styles.row}>
                <Medal rank={e.rank} />
                <div className={styles.rowMain}>
                  <div className={styles.rowHead}>
                    <Link
                      href={`/sailor/${encodeURIComponent(e.anonMark)}`}
                      className={styles.sailor}
                    >
                      🎭 {markDisplayName(e.anonMark)}
                    </Link>
                    <span className={styles.titleTag}>{e.title}</span>
                  </div>
                  <p className={styles.score}>本周活跃积分 <b>{e.score}</b></p>
                </div>
              </article>
            ))}
        </div>
      )}
    </div>
  );
}