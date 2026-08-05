"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { fetchPublicBottles } from "@/lib/api/bottles";
import { dayStart } from "@/lib/time";
import { topicOf } from "@/data/topics";
import styles from "./HotTopics.module.css";

/**
 * 首页热门话题横条（P1 F-07）：统计当日各话题公开瓶数 Top3，
 * 点击跳转漂流广场并自动选中该话题；无活跃话题时不渲染。
 */
export function HotTopics() {
  const [topics, setTopics] = useState<{ id: string; count: number }[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const bottles = await fetchPublicBottles();
      if (!alive) return;
      const today = dayStart();
      const counts = new Map<string, number>();
      for (const b of bottles) {
        if (b.topic && b.createdAt >= today && topicOf(b.topic)) {
          counts.set(b.topic, (counts.get(b.topic) ?? 0) + 1);
        }
      }
      setTopics(
        [...counts.entries()]
          .map(([id, count]) => ({ id, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3),
      );
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (topics.length === 0) return null;

  return (
    <div className={styles.bar}>
      <span className={styles.label}>🔥 热门话题：</span>
      {topics.map((t) => {
        const tag = topicOf(t.id);
        if (!tag) return null;
        return (
          <Link
            key={t.id}
            href={`/drift?topic=${encodeURIComponent(t.id)}`}
            className={styles.tag}
            style={{ "--topicColor": tag.color } as CSSProperties}
          >
            {tag.name} · {t.count}艘
          </Link>
        );
      })}
    </div>
  );
}