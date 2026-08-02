"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { SectionHead } from "@/components/shared/SectionHead";
import { InboxModal } from "@/components/bottle/InboxModal";
import { useIdentityStore } from "@/stores/identity";
import { useBottleStore } from "@/stores/bottle";
import { usePlayerStore } from "@/stores/player";
import { isSafeText } from "@/lib/api/moderation";
import type { Bottle, TrackSnapshot } from "@/types/social";
import styles from "./BottleSection.module.css";

/** 拾瓶上限（与查询层一致：投 1 / 拾 3） */
const LAUNCH_LIMIT = 1;
const PICK_LIMIT = 3;

/** 纸船剪影（与品牌图形同源） */
function BoatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3v11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 4.5 19 11h-7z" fill="currentColor" />
      <path d="M2.5 13.5Q12 17.5 21.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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
  const autoOpenedRef = useRef(false);

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
    <section className="section" id="bottle">
      <SectionHead
        tag="PAPER BOAT"
        title="纸船漂流"
        subtitle="匿名投出一艘纸船，装着心情和正在听的歌，漂向星海的陌生人。"
      />

      {/* 区块工具条：船员证 + 星海来讯 */}
      <div className={styles.toolbar}>
        <p className={styles.sailorLine}>
          <BoatIcon className={styles.sailorBoat} />
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
      </div>

      <div className={styles.bottleGrid}>
        <LaunchCard />
        <DockCard />
      </div>

      <InboxModal open={inboxOpen} onClose={() => setInboxOpen(false)} />
    </section>
  );
}

/** 投瓶卡：绑定当前播放歌曲 + 10-200 字 + 启航动画与反馈 */
function LaunchCard() {
  const track = usePlayerStore((s) => s.tracks[s.currentIndex]);
  const launch = useBottleStore((s) => s.launch);
  const busy = useBottleStore((s) => s.busy);

  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"idle" | "launching" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

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
    const result = await launch(text, snapshot);
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
          <BoatIcon className={styles.successBoat} />
          纸船已启航。它会漂向星海深处的某个船客——注意查收「星海来讯」。
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
          <BoatIcon className={styles.fxBoat} />
          <span className={styles.fxWave} />
        </div>
      )}
    </div>
  );
}

/** 拾瓶池：星海漂流中的纸船（随机拾取，开箱后可见内容） */
function DockCard() {
  const pick = useBottleStore((s) => s.pick);
  const reply = useBottleStore((s) => s.reply);
  const busy = useBottleStore((s) => s.busy);

  const [picked, setPicked] = useState<Bottle | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);

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
                <BoatIcon className={styles.dockBoat} />
                <span>一艘纸船靠岸了…</span>
              </div>
              {/* 正面：开箱内容 */}
              <div className={styles.flipFront}>
                <p className={styles.dockMark}>
                  {picked.anonMark}
                  {picked.isSystem && <em className={styles.sysTag}>星海信使</em>}
                </p>
                <p className={styles.dockText}>{picked.text}</p>
                <p className={styles.dockSong}>
                  🎵 {picked.track.t} · {picked.track.s}
                </p>
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
                <BoatIcon className={styles.dockBoat} />
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
    </div>
  );
}
