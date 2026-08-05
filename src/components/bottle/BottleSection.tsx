"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { SectionHead } from "@/components/shared/SectionHead";
import { Reveal } from "@/components/shared/Reveal";
import { SwitchDots } from "@/components/shared/SwitchDots";
import { SkinBoat } from "@/components/shared/SkinBoat";
import { useFadeIn } from "@/hooks/useFadeIn";
import { useAutoCycle } from "@/hooks/useAutoCycle";
import { InboxModal } from "@/components/bottle/InboxModal";
import { LaunchCard } from "@/components/bottle/LaunchCard";
import { DockCard } from "@/components/bottle/DockCard";
import { useIdentityStore } from "@/stores/identity";
import { useBottleStore } from "@/stores/bottle";
import { LAUNCH_LIMIT, PICK_LIMIT } from "@/lib/bottle/limits";
import { markDisplayName } from "@/lib/social-name";
import styles from "./BottleSection.module.css";

/** 星海漂流三幕（崩坏3式底部切换条展示） */
const SCENES = [
  {
    image: "/images/bottle-launch-crop.webp",
    alt: "汐·启航：将漂流瓶投向星海",
    title: "启航",
    desc: "装下心情，漂向星海",
  },
  {
    image: "/images/bottle-dock-crop.webp",
    alt: "汐·靠岸：拾起漂来的信",
    title: "靠岸",
    desc: "邂逅陌生的回响",
  },
  {
    image: "/images/bottle-reply-crop.webp",
    alt: "汐·回信：在纸船上写下回应",
    title: "回信",
    desc: "沿原航线，靠岸",
  },
];

/**
 * 纸船漂流（FR-7）：匿名投瓶（绑定当前播放歌曲）+ 随机拾瓶（卡牌开箱）+ 星海来讯入口
 * - 语汇遵循 PRD §3：启航/靠岸/回信/船客
 * - 拾瓶为随机漂向（本地模拟池随机 claim，真实模式 RPC 原子 claim）
 * - 投瓶卡 / 拾瓶卡已拆至 LaunchCard.tsx / DockCard.tsx（V2.7 结构收敛）
 */
export function BottleSection() {
  const sailor = useIdentityStore((s) => s.sailor);
  const bootstrap = useIdentityStore((s) => s.bootstrap);
  const limits = useBottleStore((s) => s.limits);
  const refreshInbox = useBottleStore((s) => s.refreshInbox);
  const unreadCount = useBottleStore((s) => s.unreadCount);

  const [inboxOpen, setInboxOpen] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);
  // 自动轮播暂停：鼠标悬停/键盘聚焦场景区时暂停（V2.2）
  const [hoverPaused, setHoverPaused] = useState(false);
  const autoOpenedRef = useRef(false);

  // 切换场景浮现（WAAPI/rAF 由 useFadeIn 驱动：主图先起，标题 .08s、描述 .16s 依次浮现）
  // 注意：deps 必须 useMemo 缓存稳定引用（React Compiler 按引用比较依赖，字面量数组会导致 effect 反复重跑）
  const sceneDeps = useMemo(() => [sceneIndex], [sceneIndex]);
  const sceneImgRef = useRef<HTMLImageElement | null>(null);
  const sceneTitleRef = useRef<HTMLSpanElement | null>(null);
  const sceneDescRef = useRef<HTMLSpanElement | null>(null);
  useFadeIn(sceneImgRef, sceneDeps);
  useFadeIn(sceneTitleRef, sceneDeps, 80);
  useFadeIn(sceneDescRef, sceneDeps, 160);

  // 自动轮播（V2.2）：5s 切换漂流场景，hover/聚焦暂停，reduced-motion 禁用
  useAutoCycle(SCENES.length, sceneIndex, setSceneIndex, { paused: hoverPaused });

  // 身份引导 + 收件箱拉取（星海来讯）
  useEffect(() => {
    const cleanup = bootstrap();
    refreshInbox();
    return cleanup;
  }, [bootstrap, refreshInbox]);

  // 强提醒：有未读星海来讯时自动打开一次（用户手动关闭后不再自动弹）
  useEffect(() => {
    if (unreadCount > 0 && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setInboxOpen(true);
    }
  }, [unreadCount]);

  return (
    <section className={`section ${styles.bottleSection}`} id="bottle">
      <SectionHead
        tag="PAPER BOAT"
        title="纸船漂流"
        className={styles.bottleHead}
        subtitle="匿名投出一艘纸船，装着心情和正在听的歌，漂向星海的陌生人。"
      />

      {/* 区块工具条：船员证 + 星海来讯（米哈游风格：进入视口浮现） */}
      <Reveal className={styles.toolbar}>
        <p className={styles.sailorLine}>
          <SkinBoat className={styles.sailorBoat} />
          <span>
            船客 <b>{sailor ? markDisplayName(sailor.anonMark) : "正在启航…"}</b>
          </span>
          <span className={styles.limitLine}>
            今日 · 启航 {limits.launched}/{LAUNCH_LIMIT} · 拾瓶 {limits.picked}/{PICK_LIMIT}
          </span>
        </p>
        <button
          className={`${styles.inboxBtn}${unreadCount > 0 ? ` ${styles.hasNew}` : ""}`}
          type="button"
          onClick={() => setInboxOpen(true)}
        >
          星海来讯
          {unreadCount > 0 && <i className={styles.inboxBadge}>{unreadCount}</i>}
        </button>
      </Reveal>

      {/* 投/拾双卡（米哈游风格：进入视口浮现）；第二列为拾瓶卡 + 星海漂流三幕纵向排列
          （文档流布局——absolute 会让场景条脱离文档流，后续区块上移重叠） */}
      <Reveal className={styles.bottleGrid}>
        <LaunchCard />
        <div className={styles.dockCol}>
          <DockCard />
          {/* 星海漂流三幕（崩坏3式：单主图 + 底部切换条，切换时图/文 WAAPI 浮现）；
              自动轮播 hover/聚焦暂停仅作用于场景区，避免投瓶/拾瓶交互时误暂停 */}
          <div
            onMouseEnter={() => setHoverPaused(true)}
            onMouseLeave={() => setHoverPaused(false)}
            onFocusCapture={() => setHoverPaused(true)}
            onBlurCapture={() => setHoverPaused(false)}
          >
            <figure className={styles.sceneItem}>
              <Image
                ref={sceneImgRef}
                src={SCENES[sceneIndex].image}
                alt={SCENES[sceneIndex].alt}
                fill
                /* 完整显示（图比例与容器接近，cover 垂直无裁切）；顶部深色带与背景融合 */
                style={{ objectFit: "cover" }}
              />
              <figcaption className={styles.sceneCap}>
                <span ref={sceneTitleRef} className={styles.sceneTitle}>
                  {SCENES[sceneIndex].title}
                </span>
                <span ref={sceneDescRef} className={styles.sceneDesc}>
                  {SCENES[sceneIndex].desc}
                </span>
              </figcaption>
            </figure>
            <SwitchDots
              count={SCENES.length}
              active={sceneIndex}
              onChange={setSceneIndex}
              ariaLabel="切换漂流场景"
            />
          </div>
        </div>
      </Reveal>

      <InboxModal open={inboxOpen} onClose={() => setInboxOpen(false)} />
    </section>
  );
}
