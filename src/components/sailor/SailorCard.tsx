"use client";

import { useEffect, useState } from "react";
import { useIdentityStore } from "@/stores/identity";
import { nextLevelBond, TITLE_TIERS } from "@/data/collection";
import { fetchWeeklyReport } from "@/lib/api/report";
import styles from "./SailorCard.module.css";

/**
 * 船员证核心卡：匿名代号/昵称 + 等级徽标 + 称号 + 羁绊进度条
 * 等级 → 称号映射见 data/collection.ts（FR-9.2）
 * V2.0：最近航行小结（本周行为，与周报数据互通）
 */
export function SailorCard() {
  const sailor = useIdentityStore((s) => s.sailor);
  const title = useIdentityStore((s) => s.title);
  // 本周航行小结（客户端专属数据，effect 后计算避免水合冲突）
  const [week, setWeek] = useState<{
    listens: number;
    launched: number;
    picked: number;
    replied: number;
  } | null>(null);
  useEffect(() => {
    // 外部源（localStorage/Supabase RPC）初始化，SSR 空态安全，水合后更新
    fetchWeeklyReport().then((r) => setWeek({ ...r.week }));
  }, []);

  if (!sailor) return null;

  const nextBond = nextLevelBond(sailor.bondValue);
  const progress =
    nextBond === null ? 100 : Math.min(100, (sailor.bondValue / nextBond) * 100);
  // 下一个未达称号（满级为 null）
  const nextTier = TITLE_TIERS.find((t) => t.minLevel > sailor.level) ?? null;

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.levelBadge}>Lv.{sailor.level}</span>
        <span className={styles.titleBadge}>{title}</span>
      </div>

      <p className={styles.name}>
        {sailor.nickname ? sailor.nickname : "未命名船客"}
        <em>{sailor.anonMark}</em>
      </p>

      <p className={styles.slogan}>在星海里迷路，是一件好事。</p>

      <div className={styles.bondBox}>
        <div className={styles.bondHead}>
          <span>羁绊值</span>
          <span>
            {sailor.bondValue}
            {nextBond !== null && ` / ${nextBond}`}
          </span>
        </div>
        <div className={styles.bondTrack} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="羁绊进度">
          <i style={{ width: `${progress}%` }} />
        </div>
        <p className={styles.bondHint}>
          {nextBond === null
            ? "已是灯塔守望者——星海的最高荣誉。"
            : `再积累 ${nextBond - sailor.bondValue} 点羁绊，解锁${nextTier ? `「${nextTier.title}」` : "下一称号"}`}
        </p>
      </div>

      <p className={styles.foot}>匿名 · 不采集任何身份信息 · 可随时更换昵称</p>

      {/* 最近航行小结（V2.0：本周行为，与周报数据互通） */}
      {week && (
        <div className={styles.weekBox}>
          <span className={styles.weekLabel}>最近航行 · 本周</span>
          <span className={styles.weekStats}>
            {week.listens > 0 || week.launched > 0 || week.picked > 0 || week.replied > 0 ? (
              <>
                听歌 <b>{week.listens}</b> 首 · 启航 <b>{week.launched}</b> 艘 · 拾瓶{" "}
                <b>{week.picked}</b> 艘 · 回信 <b>{week.replied}</b> 封
              </>
            ) : (
              "本周还没有航行记录"
            )}
          </span>
        </div>
      )}
    </div>
  );
}
