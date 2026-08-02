"use client";

import { useEffect } from "react";
import Image from "next/image";
import { CHARACTER } from "@/data/character";
import { SectionHead } from "@/components/shared/SectionHead";
import { CountUp } from "@/components/shared/CountUp";
import { useShioStore } from "@/stores/shio";
import { useIdentityStore } from "@/stores/identity";
import type { ShioSlot } from "@/data/shio-lines";
import styles from "./CharacterSection.module.css";

/** 每日一句时段的展示语汇（PRD §3） */
const SLOT_LABEL: Record<ShioSlot, string> = {
  night: "深夜电台 · 治愈系",
  morning: "清晨航线 · 元气系",
  day: "日常星海",
};

/**
 * 角色登场（B站式角色卡）：双列 Grid，数据来自 src/data/character.ts
 * 统计数据用 CountUp 滚动增长（进入视口触发）
 * 每日一句（FR-8 最小版）：汐按时段问候，白名单文案库（NFR-2）
 */
export function CharacterSection() {
  const greeting = useShioStore((s) => s.greeting);
  const slot = useShioStore((s) => s.slot);
  const ensureDailyGreeting = useShioStore((s) => s.ensureDailyGreeting);
  const response = useIdentityStore((s) => s.response);

  // 每日首次挂载：按时段选句（客户端专属，effect 内读取 localStorage）
  useEffect(() => {
    ensureDailyGreeting();
  }, [ensureDailyGreeting]);

  return (
    <section className="section" id="char">
      <SectionHead
        tag="NEW CHARACTER"
        title="星海版首位角色登场"
        subtitle={
          <>
            她戴着你没有的耳机，坐着一艘不会沉的纸船。
            <br />
            耳机里在播什么？她也不知道——<b>漂到哪首算哪首</b>。
          </>
        }
      />

      <div className={styles.charCard}>
        <div className={styles.charPic}>
          <span className={styles.lv}>{CHARACTER.lv}</span>
          <Image
            src={CHARACTER.image}
            alt={CHARACTER.imageAlt}
            fill
            sizes="(max-width: 960px) 65vw, 33vw"
            style={{ objectFit: "cover" }}
          />
        </div>

        <div className={styles.charInfo}>
          <div className={styles.charHead}>
            <span className={styles.charName}>
              {CHARACTER.name} <em>{CHARACTER.en}</em>
            </span>
          </div>

          <div className={styles.charTags}>
            {CHARACTER.tags.map((tag) => (
              <span
                key={tag.label}
                className={`${styles.ctag}${tag.variant ? ` ${styles[tag.variant]}` : ""}`}
              >
                {tag.label}
              </span>
            ))}
          </div>

          <p className={styles.charDesc}>
            {CHARACTER.desc.map((seg, i) =>
              seg.bold ? <b key={i}>{seg.text}</b> : <span key={i}>{seg.text}</span>,
            )}
          </p>

          <div className={styles.charStats}>
            {CHARACTER.stats.map((stat) => (
              <div className={styles.cstat} key={stat.label}>
                <CountUp end={Number(stat.value)} suffix={stat.suffix} />
                <small>{stat.label}</small>
              </div>
            ))}
          </div>

          {/* 汐的情绪表情变体（新增） */}
          <div className={styles.exprRow}>
            <p className={styles.exprLabel}>汐的三种瞬间</p>
            <div className={styles.exprGrid}>
              {CHARACTER.expressions?.map((expr) => (
                <figure key={expr.label} className={styles.exprItem}>
                  <Image
                    src={expr.image}
                    alt={`${CHARACTER.name} · ${expr.label}`}
                    fill
                    style={{ objectFit: "cover" }}
                  />
                  <figcaption className={styles.exprCap}>{expr.label}</figcaption>
                </figure>
              ))}
            </div>
          </div>

          {/* 汐的每日一句（FR-8 最小版：时段变化 + 白名单文案） */}
          <div className={styles.greetCard}>
            <p className={styles.greetKicker}>
              汐的今日问候{slot ? ` · ${SLOT_LABEL[slot]}` : ""}
            </p>
            <p className={styles.greetText}>
              {greeting ? `「${greeting.text}」` : "……"}
            </p>
            <p className={styles.greetSign}>—— 汐</p>

            {/* 汐的行为回应气泡（FR-8.2：听歌 3 首/收信/首次投瓶） */}
            {response && (
              <div className={styles.responseBubble}>
                <p className={styles.responseText}>「{response.line.text}」</p>
                <p className={styles.responseSign}>—— 汐 · 刚刚</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
