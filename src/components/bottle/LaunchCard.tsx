"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { SkinBoat, type SkinVariant } from "@/components/shared/SkinBoat";
import { usePlayerStore } from "@/stores/player";
import { useBottleStore } from "@/stores/bottle";
import { useIdentityStore } from "@/stores/identity";
import { useDanmakuStore } from "@/stores/danmaku";
import { isSafeText } from "@/lib/api/moderation";
import { BOTTLE_TEXT_MAX, BOTTLE_TEXT_MIN } from "@/lib/bottle/limits";
import { getActiveEvent, getEventForTest } from "@/data/events";
import { TOPICS } from "@/data/topics";
import type { DriftEvent } from "@/data/events";
import type { TrackSnapshot } from "@/types/social";
import styles from "./BottleSection.module.css";

/** 投瓶卡：绑定当前播放歌曲 + 10-200 字 + 启航动画与反馈 */
export function LaunchCard() {
  const tracks = usePlayerStore((s) => s.tracks);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const track = tracks[currentIndex];
  const launch = useBottleStore((s) => s.launch);
  const busy = useBottleStore((s) => s.busy);
  const noteAction = useIdentityStore((s) => s.noteAction);
  const bond = useIdentityStore((s) => s.bond);
  const skin = (useIdentityStore((s) => s.sailor?.bottleStyle) ?? "paper") as SkinVariant;

  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"idle" | "launching" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  // P0 F-01 公开漂流：默认匿名（仅随机拾取），勾选后进入漂流广场
  const [isPublic, setIsPublic] = useState(false);
  // P1 F-07 话题：单选，仅公开漂流可见/生效；不选不影响投瓶
  const [topic, setTopic] = useState<string | null>(null);
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
    !busy && len >= BOTTLE_TEXT_MIN && len <= BOTTLE_TEXT_MAX && safe.ok && phase === "idle";

  // P3-02：投瓶绑定当前播放歌曲（track 必填；无播放时用占位快照，仍允许投纯文字瓶）
  const snapshot: TrackSnapshot = track
    ? {
        id: track.id,
        t: track.t,
        tag: track.tag,
        s: track.s,
        cover: track.cover,
      }
    : {
        t: "星海未知旋律",
        tag: "氛围",
        s: "未绑定歌曲",
        cover: "/images/cover-anime-1.png",
      };

  const onLaunch = async () => {
    if (!canLaunch) return;
    setError(null);
    // 活动期间投瓶使用限定瓶面样式（FR-14）
    const result = await launch(
      text,
      snapshot,
      event ? event.bottleStyle : skin,
      isPublic,
      topic ?? undefined,
    );
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

      {/* P3-02 当前歌曲绑定（无播放时空态） */}
      {track ? (
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
      ) : (
        <div className={styles.nowPlayingEmpty}>
          <span className={styles.nowEmptyMark} aria-hidden="true">📎</span>
          当前没有播放，纸船将不带歌出发
        </div>
      )}

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
          maxLength={BOTTLE_TEXT_MAX}
          rows={4}
          placeholder="写点什么：一句心情、一段故事，10-200 字。匿名，没有人知道是你。"
          aria-label="瓶中信内容"
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
        />
        <span className={`${styles.count}${len > BOTTLE_TEXT_MAX ? ` ${styles.warn}` : ""}`}>
          {len}/{BOTTLE_TEXT_MAX}
        </span>
      </div>

      {!safe.ok && <p className={styles.error}>瓶里有不能上船的文字。</p>}
      {error && <p className={styles.error}>{error}</p>}

      {/* 禁用原因提示：字数不足时给用户交代（敏感词走红色 error，busy 按钮文字已说明） */}
      {phase === "idle" && !canLaunch && safe.ok && !error && len < BOTTLE_TEXT_MIN && (
        <p className={styles.hint}>
          {len === 0
            ? "写下至少 10 字，船才能启航。"
            : `再写 ${BOTTLE_TEXT_MIN - len} 字即可启航。`}
        </p>
      )}

      {/* P0 F-01 公开漂流开关：默认匿名（仅随机拾取可见），勾选后进入漂流广场；公开/匿名共用每日 1 投 */}
      <label className={styles.publicOption}>
        <input
          type="checkbox"
          className={styles.publicInput}
          checked={isPublic}
          onChange={(e) => {
            setIsPublic(e.target.checked);
            if (!e.target.checked) setTopic(null); // 取消公开时清除话题
          }}
        />
        <span className={styles.publicBox} aria-hidden="true" />
        <span className={styles.publicText}>
          放入漂流广场
          <small>公开，所有人都能看到这艘船和你的代号</small>
        </span>
      </label>

      {/* P1 F-07 话题选择：仅公开漂流时展示（单选，再点取消；不选不影响投瓶） */}
      {isPublic && (
        <div className={styles.topicWrap}>
          <p className={styles.topicLabel}>话题（可选）：</p>
          <div className={styles.topicList}>
            {TOPICS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`${styles.topic}${topic === t.id ? ` ${styles.topicOn}` : ""}`}
                style={{ "--topicColor": t.color } as CSSProperties}
                aria-pressed={topic === t.id}
                title={t.description}
                onClick={() => setTopic(topic === t.id ? null : t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
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
