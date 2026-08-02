"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { CHARACTERS } from "@/data/character";
import { SectionHead } from "@/components/shared/SectionHead";
import { CountUp } from "@/components/shared/CountUp";
import { SwitchDots } from "@/components/shared/SwitchDots";
import { useFadeIn } from "@/hooks/useFadeIn";
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
 * 星海守望者（仿崩坏3官网角色切换，2026-08-02）：
 * 顶部头像列表点击切换角色（汐/流明/朔空/悠），立绘 + 档案 + 表情随切换更新；
 * 每日一句与行为回应为汐专属（切换其他角色时隐藏）
 */
export function CharacterSection() {
  const [activeId, setActiveId] = useState("sio");
  const [exprIndex, setExprIndex] = useState(0);
  const active = CHARACTERS.find((c) => c.id === activeId) ?? CHARACTERS[0];
  const isSio = activeId === "sio";

  // 表情切换浮现（rAF 驱动：主图先起，说明文字 .08s 后浮现；切角色时一并重播）
  // 注意：deps 必须 useMemo 缓存稳定引用（React Compiler 按引用比较依赖，字面量数组会导致 effect 反复重跑）
  const exprDeps = useMemo(() => [active.id, exprIndex], [active.id, exprIndex]);
  const exprImgRef = useRef<HTMLImageElement | null>(null);
  const exprCapRef = useRef<HTMLElement | null>(null);
  useFadeIn(exprImgRef, exprDeps);
  useFadeIn(exprCapRef, exprDeps, 80);

  const greeting = useShioStore((s) => s.greeting);
  const slot = useShioStore((s) => s.slot);
  const ensureDailyGreeting = useShioStore((s) => s.ensureDailyGreeting);
  const response = useIdentityStore((s) => s.response);

  // 每日首次挂载：按时段选句（客户端专属，effect 内读取 localStorage）
  useEffect(() => {
    ensureDailyGreeting();
  }, [ensureDailyGreeting]);

  return (
    <section className={`section ${styles.charSection}`} id="char">
      <SectionHead
        tag="STAR SEA WATCHERS"
        title="星海守望者"
        className={styles.charHead}
        subtitle={
          <>
            汐领航，流明照灯，朔空放歌，悠占星——<b>今晚你想听谁的故事？</b>
          </>
        }
      />

      {/* 角色切换头像条（崩坏3式 75px 头像列表） */}
      <div className={styles.charAvatars} role="group" aria-label="切换角色">
        {CHARACTERS.map((c) => {
          const selected = c.id === activeId;
          return (
            <button
              key={c.id}
              type="button"
              className={`${styles.avatarBtn}${selected ? ` ${styles.avatarActive}` : ""}`}
              aria-pressed={selected}
              aria-label={`切换到${c.name}`}
              title={c.name}
              onClick={() => setActiveId(c.id)}
            >
              <Image
                src={c.image}
                alt=""
                fill
                sizes="75px"
                style={{ objectFit: "cover", objectPosition: "50% 18%" }}
              />
              <span className={styles.avatarName}>{c.name}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.charCard}>
        <div className={styles.charPic}>
          <span className={styles.lv}>{active.lv}</span>
          {/* key 重挂载触发切换 fade；objectPosition 偏上保证脸部完整（竖图 cover 居中会裁掉头部） */}
          <Image
            key={active.id}
            src={active.image}
            alt={active.imageAlt}
            fill
            sizes="(max-width: 960px) 65vw, 33vw"
            style={{ objectFit: "cover", objectPosition: "50% 18%" }}
          />
        </div>

        <div className={styles.charInfo}>
          <div className={styles.charHead}>
            <span className={styles.charName}>
              {active.name} <em>{active.en}</em>
            </span>
          </div>

          <div className={styles.charTags}>
            {active.tags.map((tag) => (
              <span
                key={tag.label}
                className={`${styles.ctag}${tag.variant ? ` ${styles[tag.variant]}` : ""}`}
              >
                {tag.label}
              </span>
            ))}
          </div>

          <p className={styles.charDesc}>
            {active.desc.map((seg, i) =>
              seg.bold ? <b key={i}>{seg.text}</b> : <span key={i}>{seg.text}</span>,
            )}
          </p>

          <div className={styles.charStats}>
            {active.stats.map((stat) => (
              <div className={styles.cstat} key={stat.label}>
                <CountUp key={active.id} end={Number(stat.value)} suffix={stat.suffix} />
                <small>{stat.label}</small>
              </div>
            ))}
          </div>

          {/* 角色情绪表情变体（崩坏3式：单主图 + 底部切换条；切换 WAAPI 浮现） */}
          <div className={styles.exprRow}>
            <p className={styles.exprLabel}>{active.name}的三种瞬间</p>
            <figure className={styles.exprMain}>
              {active.expressions && active.expressions[exprIndex] && (
                <>
                  <Image
                    ref={exprImgRef}
                    src={active.expressions[exprIndex].image}
                    alt={`${active.name} · ${active.expressions[exprIndex].label}`}
                    fill
                    style={{ objectFit: "cover", objectPosition: "50% 28%" }}
                  />
                  <figcaption ref={exprCapRef} className={styles.exprCap}>
                    {active.expressions[exprIndex].label}
                  </figcaption>
                </>
              )}
            </figure>
            {active.expressions && active.expressions.length > 1 && (
              <SwitchDots
                count={active.expressions.length}
                active={exprIndex}
                onChange={setExprIndex}
                ariaLabel={`切换${active.name}的表情`}
              />
            )}
          </div>

          {/* 汐的每日一句（FR-8 最小版）与行为回应——汐专属，切换隐藏 */}
          {isSio && (
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
          )}
        </div>
      </div>
    </section>
  );
}
