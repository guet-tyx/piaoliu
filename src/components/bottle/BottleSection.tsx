"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { SectionHead } from "@/components/shared/SectionHead";
import { Reveal } from "@/components/shared/Reveal";
import { SwitchDots } from "@/components/shared/SwitchDots";
import { SkinBoat, type SkinVariant } from "@/components/shared/SkinBoat";
import { useFadeIn } from "@/hooks/useFadeIn";
import { InboxModal } from "@/components/bottle/InboxModal";
import { useIdentityStore } from "@/stores/identity";
import { useBottleStore } from "@/stores/bottle";
import { usePlayerStore } from "@/stores/player";
import { useDanmakuStore } from "@/stores/danmaku";
import { isSafeText } from "@/lib/api/moderation";
import { reportBottle } from "@/lib/api/bottles";
import { eventOfStyle, getActiveEvent, getEventForTest } from "@/data/events";
import type { DriftEvent } from "@/data/events";
import type { Bottle, TrackSnapshot } from "@/types/social";
import styles from "./BottleSection.module.css";

/** 拾瓶上限（与查询层一致：投 1 / 拾 3） */
const LAUNCH_LIMIT = 1;
const PICK_LIMIT = 3;

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
 */
export function BottleSection() {
  const sailor = useIdentityStore((s) => s.sailor);
  const bootstrap = useIdentityStore((s) => s.bootstrap);
  const limits = useBottleStore((s) => s.limits);
  const refreshInbox = useBottleStore((s) => s.refreshInbox);
  const unreadCount = useBottleStore((s) => s.unreadCount);

  const [inboxOpen, setInboxOpen] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);
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
            船客 <b>{sailor ? sailor.anonMark : "正在启航…"}</b>
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

      {/* 投/拾双卡（米哈游风格：进入视口浮现）；星海漂流三幕为 DockCard 子元素——
          absolute 锚定卡片底边，消除双卡行内高度差（LaunchCard 高于 DockCard）造成的视觉空隙 */}
      <Reveal className={styles.bottleGrid}>
        <LaunchCard />
        <DockCard>
          {/* 星海漂流三幕（崩坏3式：单主图 + 底部切换条，切换时图/文 WAAPI 浮现） */}
          <div className={styles.sceneStrip}>
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
        </DockCard>
      </Reveal>

      <InboxModal open={inboxOpen} onClose={() => setInboxOpen(false)} />
    </section>
  );
}

/** 投瓶卡：绑定当前播放歌曲 + 10-200 字 + 启航动画与反馈 */
function LaunchCard() {
  const track = usePlayerStore((s) => s.tracks[s.currentIndex]);
  const launch = useBottleStore((s) => s.launch);
  const busy = useBottleStore((s) => s.busy);
  const noteAction = useIdentityStore((s) => s.noteAction);
  const bond = useIdentityStore((s) => s.bond);
  const skin = (useIdentityStore((s) => s.sailor?.bottleStyle) ?? "paper") as SkinVariant;

  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"idle" | "launching" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  // 节日活动（FR-14）：URL 测试开关优先，否则按日期自动生效
  const [event, setEvent] = useState<DriftEvent | null>(null);
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("event");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL/日期外部源初始化（SSR 空态安全，水合后更新）
    setEvent(getEventForTest(param) ?? getActiveEvent());
  }, []);

  const len = text.trim().length;
  const safe = isSafeText(text);
  const canLaunch =
    !busy && len >= 10 && len <= 200 && safe.ok && phase === "idle";

  const snapshot: TrackSnapshot = {
    t: track.t,
    tag: track.tag,
    s: track.s,
    cover: track.cover,
  };

  const onLaunch = async () => {
    if (!canLaunch) return;
    setError(null);
    // 活动期间投瓶使用限定瓶面样式（FR-14）
    const result = await launch(text, snapshot, event ? event.bottleStyle : skin);
    if (!result.ok) {
      const msg =
        result.reason === "limit"
          ? "今日已启航 1 艘，明日再来。"
          : result.reason === "bad-word"
            ? "瓶里有不能上船的文字，换个说法吧。"
            : result.reason === "too-short"
              ? "再写多一点，让船更稳（至少 10 字）。"
              : result.reason === "too-long"
                ? "装不下了，船最多载 200 字。"
                : "星海暂时无风，稍后再试。";
      setError(msg);
      return;
    }
    setPhase("launching");
    // 羁绊：投瓶 +1（FR-8.3）；首次投瓶的汐回应在 noteAction 内触发
    noteAction("launched");
    bond("launch");
    // 系统事件弹幕（FR-11：事件驱动，30s 频控）
    useDanmakuStore.getState().pushSystem("有船启航了 ✦", "launch", "pink");
    // 启航动画（1.4s）后进入成功旁白
    window.setTimeout(() => setPhase("done"), 1400);
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>
        <i>✎</i> 启航一艘纸船
      </h3>

      {/* 当前歌曲绑定 */}
      <div className={styles.nowPlaying}>
        <Image
          src={track.cover}
          alt=""
          width={42}
          height={42}
          className={styles.nowCover}
        />
        <span className={styles.nowMeta}>
          <b>{track.t}</b>
          <small>
            {track.tag} · {track.s}
          </small>
        </span>
        <span className={styles.nowTag}>随船出发</span>
      </div>

      {/* 节日活动提示（FR-14）：限定瓶面 + 活动语汇 */}
      {event && (
        <div className={styles.eventBanner}>
          <em>{event.name}限定</em>
          <span>{event.tagline}</span>
        </div>
      )}

      <div className={styles.textWrap}>
        <textarea
          className={styles.input}
          value={text}
          maxLength={200}
          rows={4}
          placeholder="写点什么：一句心情、一段故事，10-200 字。匿名，没有人知道是你。"
          aria-label="瓶中信内容"
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
        />
        <span className={`${styles.count}${len > 200 ? ` ${styles.warn}` : ""}`}>
          {len}/200
        </span>
      </div>

      {!safe.ok && <p className={styles.error}>瓶里有不能上船的文字。</p>}
      {error && <p className={styles.error}>{error}</p>}

      {/* 禁用原因提示：字数不足时给用户交代（敏感词走红色 error，busy 按钮文字已说明） */}
      {phase === "idle" && !canLaunch && safe.ok && !error && len < 10 && (
        <p className={styles.hint}>
          {len === 0
            ? "写下至少 10 字，船才能启航。"
            : `再写 ${10 - len} 字即可启航。`}
        </p>
      )}

      {phase === "done" ? (
        <p className={styles.success}>
          <SkinBoat variant={skin} className={styles.successBoat} />
          {event
            ? event.shioLine
            : "纸船已启航。它会漂向星海深处的某个船客——注意查收「星海来讯」。"}
        </p>
      ) : (
        <button
          className={styles.launchBtn}
          type="button"
          disabled={!canLaunch}
          onClick={onLaunch}
        >
          {phase === "launching" ? "启航中…" : "启航"}
        </button>
      )}

      {/* 启航动画层 */}
      {phase === "launching" && (
        <div className={styles.launchFx} aria-hidden="true">
          <SkinBoat variant={skin} className={styles.fxBoat} />
          <span className={styles.fxWave} />
        </div>
      )}
    </div>
  );
}

/** 拾瓶池：星海漂流中的纸船（随机拾取，开箱后可见内容）；children 为星海漂流场景条（absolute 锚定卡底） */
function DockCard({ children }: { children?: ReactNode }) {
  const pick = useBottleStore((s) => s.pick);
  const reply = useBottleStore((s) => s.reply);
  const busy = useBottleStore((s) => s.busy);
  const noteAction = useIdentityStore((s) => s.noteAction);
  const bond = useIdentityStore((s) => s.bond);
  const skin = (useIdentityStore((s) => s.sailor?.bottleStyle) ?? "paper") as SkinVariant;

  const [picked, setPicked] = useState<Bottle | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);

  // 拾到的瓶子按自身样式渲染（活动限定瓶显示活动徽标；不再用拾瓶人皮肤渲染他人瓶子）
  const pickedEvent = picked ? eventOfStyle(picked.bottleStyle) : null;
  const pickedVariant = pickedEvent
    ? "paper"
    : ((picked?.bottleStyle ?? "paper") as SkinVariant);

  const onPick = async () => {
    setNotice(null);
    const result = await pick();
    if (!result.ok) {
      if (result.reason === "empty") {
        setEmpty(true);
        setNotice("星海此刻很安静。汐在听，下一个瓶子也许明天就到。");
      } else if (result.reason === "limit") {
        setNotice("今日已拾 3 瓶。明日的航线，明天再启。");
      } else {
        setNotice("星海暂时无风，稍后再试。");
      }
      return;
    }
    setPicked(result.bottle);
    setEmpty(false);
    // 羁绊：拾瓶 +1（FR-8.3）
    noteAction("picked");
    bond("pick");
    // 系统事件弹幕（FR-11）
    useDanmakuStore.getState().pushSystem("星海漂来一艘纸船", "pick", "blue");
    // 卡牌翻转开箱（0.6s 后显示内容）
    window.setTimeout(() => setFlipped(true), 150);
  };

  const onReply = async () => {
    if (!picked || replyText.trim().length < 10) return;
    const result = await reply(picked.id, replyText);
    if (!result.ok) {
      setNotice(
        result.reason === "bad-word"
          ? "回信里有不能上船的文字。"
          : result.reason === "too-short"
            ? "回信至少 10 字。"
            : "回信没能靠岸，稍后再试。",
      );
      return;
    }
    setNotice("回信已沿原航线靠岸。愿它抵达该抵达的人。");
    // 羁绊：回信 +1（FR-8.3）
    noteAction("replied");
    bond("reply");
    // 系统事件弹幕（FR-11）
    useDanmakuStore.getState().pushSystem("一封回信沿航线靠岸", "reply");
    setPicked(null);
    setFlipped(false);
    setReplyText("");
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>
        <i>✦</i> 星海漂流中
      </h3>

      <div className={styles.dock}>
        {picked ? (
          <div className={styles.flipBox}>
            <div className={`${styles.flipCard}${flipped ? ` ${styles.opened}` : ""}`}>
              {/* 背面：未开箱纸船 */}
              <div className={styles.flipBack}>
                <SkinBoat variant={pickedVariant} className={styles.dockBoat} />
                <span>一艘纸船靠岸了…</span>
              </div>
              {/* 正面：开箱内容 */}
              <div className={styles.flipFront}>
                <p className={styles.dockMark}>
                  {picked.anonMark}
                  {picked.isSystem && <em className={styles.sysTag}>星海信使</em>}
                  {pickedEvent && (
                    <em className={styles.festTag}>{pickedEvent.name}限定</em>
                  )}
                </p>
                <p className={styles.dockText}>{picked.text}</p>
                <p className={styles.dockSong}>
                  🎵 {picked.track.t} · {picked.track.s}
                </p>
                <div className={styles.frontRow}>
                  {picked.repliedAt === null && (
                    <div className={styles.replyBox}>
                      <textarea
                        className={styles.replyInput}
                        value={replyText}
                        maxLength={200}
                        rows={3}
                        placeholder="回信（10-200 字）：沿原航线靠岸，只有投瓶人能看见。"
                        aria-label="回信内容"
                        onChange={(e) => setReplyText(e.target.value)}
                      />
                      <button
                        className={styles.replyBtn}
                        type="button"
                        disabled={busy || replyText.trim().length < 10}
                        onClick={onReply}
                      >
                        回信
                      </button>
                    </div>
                  )}
                  {/* 举报入口（NFR-1） */}
                  <button
                    className={styles.reportBtn}
                    type="button"
                    aria-label="举报这艘纸船"
                    onClick={async () => {
                      const ok = await reportBottle(picked.id, "内容不适");
                      setNotice(ok ? "举报已记录，星海会核实处理。" : "举报提交失败。");
                    }}
                  >
                    举报
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                className={`${styles.dockSlot}${busy ? ` ${styles.wait}` : ""}`}
                type="button"
                disabled={busy}
                aria-label="拾起漂流中的纸船"
                onClick={onPick}
                style={{ "--dly": `${i * 0.4}s` } as CSSProperties}
              >
                <SkinBoat variant={skin} className={styles.dockBoat} />
              </button>
            ))}
            <p className={styles.dockHint}>拾起一艘，看看星海今天漂来了什么。</p>
          </>
        )}
      </div>

      {empty && (
        <p className={styles.emptyNote}>
          星海此刻很安静。汐在听——下一艘纸船，也许明天就到。
        </p>
      )}
      {notice && <p className={styles.notice}>{notice}</p>}
      {children}
    </div>
  );
}
