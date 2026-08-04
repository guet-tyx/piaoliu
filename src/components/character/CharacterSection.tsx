"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { CHARACTERS } from "@/data/character";
import { SectionHead } from "@/components/shared/SectionHead";
import { CountUp } from "@/components/shared/CountUp";
import { useShioStore } from "@/stores/shio";
import { useIdentityStore } from "@/stores/identity";
import { useAutoCycle } from "@/hooks/useAutoCycle";
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
 * 顶部头像列表点击切换角色（汐/流明/朔空/悠），立绘 + 档案随切换更新；
 * 每日一句为 4 位角色各一套（V2.2 由汐专属扩展，角色区「三种瞬间」已移除）；
 * 行为回应气泡仍为汐专属互动（听歌/收信/投瓶/羁绊）。
 */
export function CharacterSection() {
  const [activeId, setActiveId] = useState("sio");
  // 自动轮播暂停：鼠标悬停/键盘聚焦角色区时暂停（V2.2）
  const [hoverPaused, setHoverPaused] = useState(false);
  const active = CHARACTERS.find((c) => c.id === activeId) ?? CHARACTERS[0];
  const activeIndex = CHARACTERS.findIndex((c) => c.id === active.id);
  const isSio = activeId === "sio";

  const greeting = useShioStore((s) => s.greetings[active.id]);
  const ensureDailyGreeting = useShioStore((s) => s.ensureDailyGreeting);
  const response = useIdentityStore((s) => s.response);

  // 每日首次挂载/切换角色：按时段为当前角色选句（客户端专属，effect 内读取 localStorage）
  useEffect(() => {
    ensureDailyGreeting(active.id);
  }, [ensureDailyGreeting, active.id]);

  // 自动轮播（V2.2）：5s 切换到下一位守望者，hover/聚焦暂停，reduced-motion 禁用；
  // onAdvance 用 useCallback 稳定引用（否则每次渲染都会重建 interval）
  const advanceRole = useCallback(
    (next: number) => setActiveId(CHARACTERS[next].id),
    [],
  );
  useAutoCycle(CHARACTERS.length, activeIndex, advanceRole, { paused: hoverPaused });

  return (
    <section
      className={`section ${styles.charSection}`}
      id="char"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocusCapture={() => setHoverPaused(true)}
      onBlurCapture={() => setHoverPaused(false)}
    >
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
          {/* key 重挂载触发切换 fade；objectPosition 0% = 图顶部对齐（竖图脸在顶部，
           * 百分比 y 会让图上部被裁——0% 保证脸部完整） */}
          <Image
            key={active.id}
            src={active.image}
            alt={active.imageAlt}
            fill
            sizes="(max-width: 960px) 65vw, 33vw"
            style={{ objectFit: "cover", objectPosition: "50% 0%" }}
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

          {/* 角色每日一句（V2.2：4 位角色各一套专属文案，切换角色同步更新） */}
          <div className={styles.greetCard}>
            <p className={styles.greetKicker}>
              {active.name}的今日问候
              {greeting?.slot ? ` · ${SLOT_LABEL[greeting.slot]}` : ""}
            </p>
            <p className={styles.greetText}>
              {greeting ? `「${greeting.line.text}」` : "……"}
            </p>
            <p className={styles.greetSign}>—— {active.name}</p>

            {/* 汐的行为回应气泡（FR-8.2）——浮动层 4 秒自动淡出，不撑高角色卡（V2.2） */}
            {isSio && response && (
              <div key={response.at} className={styles.responseBubble} role="status">
                <p className={styles.responseText}>「{response.line.text}」</p>
                <p className={styles.responseSign}>—— 汐 · 刚刚</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI 聊天入口（V2.4）：全屏聊天页 /chat/<roleId>，置于角色卡外，不撑高角色卡 */}
      <a className={styles.chatBtn} href={`/chat/${active.id}`}>
        ✦ 与{active.name}聊聊
      </a>
    </section>
  );
}
