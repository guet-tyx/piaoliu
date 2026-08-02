"use client";

import { useIdentityStore } from "@/stores/identity";
import { BADGES } from "@/data/collection";
import Image from "next/image";
import styles from "./BadgeWall.module.css";

/**
 * 徽章墙（FR-12）：达成条件自动点亮（解锁判定在 identity store 的行为接线处）
 */
export function BadgeWall() {
  const badges = useIdentityStore((s) => s.sailor?.badges) ?? [];

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>徽章</h3>
      <p className={styles.desc}>达成条件后自动点亮，记录你的航行足迹。</p>
      <ul className={styles.list}>
        {BADGES.map((b) => {
          const unlocked = badges.includes(b.id);
          return (
            <li
              key={b.id}
              className={`${styles.item}${unlocked ? ` ${styles.unlocked}` : ` ${styles.locked}`}`}
            >
              <span className={styles.icon} aria-hidden="true">
                <Image
                  src={b.image}
                  alt={b.name}
                  fill
                  style={{ objectFit: "cover" }}
                />
              </span>
              <span className={styles.meta}>
                <b>{b.name}</b>
                <small>{b.desc}</small>
              </span>
              {unlocked && <em className={styles.got}>已获得</em>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
