"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { SkinBoat, type SkinVariant } from "@/components/shared/SkinBoat";
import { useBottleStore } from "@/stores/bottle";
import { useIdentityStore } from "@/stores/identity";
import { useDanmakuStore } from "@/stores/danmaku";
import { reportBottle } from "@/lib/api/bottles";
import { BOTTLE_TEXT_MAX, BOTTLE_TEXT_MIN } from "@/lib/bottle/limits";
import { eventOfStyle } from "@/data/events";
import { TrackAttachmentCard } from "@/components/bottle/TrackAttachmentCard";
import type { Bottle } from "@/types/social";
import styles from "./BottleSection.module.css";

/** 拾瓶池：星海漂流中的纸船（随机拾取，开箱后可见内容） */
export function DockCard() {
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
    if (!picked || replyText.trim().length < BOTTLE_TEXT_MIN) return;
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
                {/* P3-02 收瓶歌曲卡片（可播放跳转） */}
                <TrackAttachmentCard track={picked.track} />
                <div className={styles.frontRow}>
                  {picked.repliedAt === null && (
                    <div className={styles.replyBox}>
                      <textarea
                        className={styles.replyInput}
                        value={replyText}
                        maxLength={BOTTLE_TEXT_MAX}
                        rows={3}
                        placeholder="回信（10-200 字）：沿原航线靠岸，只有投瓶人能看见。"
                        aria-label="回信内容"
                        onChange={(e) => setReplyText(e.target.value)}
                      />
                      <button
                        className={styles.replyBtn}
                        type="button"
                        disabled={busy || replyText.trim().length < BOTTLE_TEXT_MIN}
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
    </div>
  );
}
