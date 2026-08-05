"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { SectionHead } from "@/components/shared/SectionHead";
import { Reveal } from "@/components/shared/Reveal";
import { Toast } from "@/components/shared/Toast";
import {
  COMMENT_TEXT_MAX,
  COMMENT_TEXT_MIN,
  fetchComments,
  postComment,
  toggleCommentLike,
} from "@/lib/api/comments";
import { isSafeText } from "@/lib/api/moderation";
import { playTrackSnapshot } from "@/lib/player/playSnapshot";
import { timeAgo } from "@/lib/time";
import { getOrCreateSailor } from "@/lib/api/sailor";
import { reportQuest } from "@/lib/api/quests";
import { useIdentityStore } from "@/stores/identity";
import { useQuestStore } from "@/stores/quests";
import type { SongComment, TrackSnapshot } from "@/types/social";
import type { Track } from "@/types/music";
import styles from "./SongWallPage.module.css";

interface SongWallPageProps {
  /** 曲库命中（null = 歌曲不存在） */
  track: Track | null;
}

/**
 * 歌曲留言墙页（P1 F-02）：
 * 歌曲头 + 漂流留言墙（匿名感想列表，🏺来自漂流瓶 / 🎵听了这首歌 来源标识 +
 * ♥ 点赞）+ 底部发布感想（10-100 字、敏感词、5 分钟限频）。
 */
export function SongWallPage({ track }: SongWallPageProps) {
  const [comments, setComments] = useState<SongComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [likeBusy, setLikeBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!track) return;
    let alive = true;
    (async () => {
      const list = await fetchComments(track.id);
      if (alive) {
        setComments(list);
        setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [track]);

  const len = text.trim().length;
  const safe = isSafeText(text);
  const canPost = !busy && len >= COMMENT_TEXT_MIN && len <= COMMENT_TEXT_MAX && safe.ok;

  const onPost = async () => {
    if (!canPost || !track) return;
    setBusy(true);
    setError(null);
    const r = await postComment(track.id, text);
    if (r.ok) {
      setText("");
      setComments((prev) => [r.comment, ...prev]);
      setToast("感想已发布");
      // P1 F-05 任务埋点：发感想 → 每日任务 comment_1
      const qr = await reportQuest("comment");
      if (qr) {
        await useIdentityStore.getState().applyQuestReward(qr);
        useQuestStore.getState().applyResult(qr);
      }
    } else {
      const msg =
        r.reason === "too-short"
          ? "至少 10 字，感想才有分量。"
          : r.reason === "too-long"
            ? "最多 100 字，留点余味。"
            : r.reason === "bad-word"
              ? "这里有不能上船的文字。"
              : r.reason === "cooldown"
                ? "刚刚发布过，稍后再试。"
                : "星海暂时无风，稍后再试。";
      setError(msg);
    }
    setBusy(false);
  };

  const onLike = useCallback(async (commentId: string) => {
    setLikeBusy(commentId);
    const r = await toggleCommentLike(commentId);
    if (r.ok) {
      const mark = (await getOrCreateSailor())?.anonMark;
      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== commentId) return c;
          const likedBy = mark
            ? r.liked
              ? [...new Set([...c.likedBy, mark])]
              : c.likedBy.filter((m) => m !== mark)
            : c.likedBy;
          return { ...c, likedBy };
        }),
      );
    }
    setLikeBusy(null);
  }, []);

  if (!track) {
    return (
      <main className={`section ${styles.page}`}>
        <SectionHead tag="SONG WALL" title="漂流留言墙" subtitle="听过的歌，都想说点什么。" />
        <p className={styles.notFound}>这首歌暂时不在星海中。</p>
      </main>
    );
  }

  const snapshot: TrackSnapshot = {
    id: track.id,
    t: track.t,
    tag: track.tag,
    s: track.s,
    cover: track.cover,
  };

  return (
    <main className={`section ${styles.page}`}>
      <SectionHead
        tag="SONG WALL"
        title="漂流留言墙"
        subtitle="所有听过这首歌的船客，匿名留在这里的话。"
      />

      {/* 歌曲头 */}
      <Reveal className={styles.trackHead}>
        <Image
          src={track.cover}
          alt=""
          width={88}
          height={88}
          className={styles.cover}
        />
        <div className={styles.trackMeta}>
          <p className={styles.trackName}>
            「{track.t}」<em>{track.tag}</em>
          </p>
          <p className={styles.trackSub}>{track.s}</p>
        </div>
        <button
          type="button"
          className={styles.playBtn}
          onClick={() => playTrackSnapshot(snapshot)}
        >
          ▶ 播放这首歌
        </button>
      </Reveal>

      {/* 感想列表 */}
      <div className={styles.wall}>
        <h3 className={styles.wallTitle}>漂流留言墙 · {loaded ? comments.length : "…"} 条感想</h3>
        {!loaded ? (
          <p className={styles.empty}>正在打捞感想…</p>
        ) : comments.length === 0 ? (
          <p className={styles.empty}>还没有人留下感想，来写下第一句吧。</p>
        ) : (
          <div className={styles.list}>
            {comments.map((c) => (
              <Reveal key={c.id}>
                <article className={styles.item}>
                  <header className={styles.itemHead}>
                    <span className={styles.author}>🎭 {c.anonMark}</span>
                    <span className={styles.itemRight}>
                      {c.source === "bottle" ? (
                        <em className={styles.fromBottle}>🏺 来自漂流瓶</em>
                      ) : (
                        <em className={styles.fromDirect}>🎵 听了这首歌</em>
                      )}
                      <span className={styles.time}>{timeAgo(c.createdAt)}</span>
                    </span>
                  </header>
                  <p className={styles.text}>{c.text}</p>
                  <button
                    type="button"
                    className={`${styles.heart}${c.likedBy.length > 0 ? "" : ""}`}
                    aria-label="点赞感想"
                    aria-pressed={false}
                    disabled={likeBusy === c.id}
                    onClick={() => onLike(c.id)}
                  >
                    <i>♡</i> <b>{c.likedBy.length}</b>
                  </button>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </div>

      {/* 发布感想 */}
      <div className={styles.postBox}>
        <p className={styles.postLabel}>── 写一句感想 ──</p>
        <textarea
          className={styles.input}
          value={text}
          maxLength={COMMENT_TEXT_MAX}
          rows={3}
          placeholder="写下你的感想（10-100字）…"
          aria-label="感想内容"
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
        />
        <span className={`${styles.count}${len > COMMENT_TEXT_MAX ? ` ${styles.warn}` : ""}`}>
          {len}/{COMMENT_TEXT_MAX}
        </span>
        {error && <p className={styles.error}>{error}</p>}
        {len > 0 && len < COMMENT_TEXT_MIN && !error && (
          <p className={styles.hint}>至少 {COMMENT_TEXT_MIN} 字。</p>
        )}
        <div className={styles.postRow}>
          <span className={styles.postHint}>匿名 · {COMMENT_TEXT_MIN}-{COMMENT_TEXT_MAX} 字</span>
          <button
            type="button"
            className={styles.postBtn}
            disabled={!canPost}
            onClick={onPost}
          >
            {busy ? "发布中…" : "发布"}
          </button>
        </div>
      </div>

      <Toast text={toast} onDone={() => setToast(null)} />
    </main>
  );
}