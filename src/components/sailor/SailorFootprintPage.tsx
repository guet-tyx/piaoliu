"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SectionHead } from "@/components/shared/SectionHead";
import { Reveal } from "@/components/shared/Reveal";
import { Modal } from "@/components/shared/Modal";
import { Toast } from "@/components/shared/Toast";
import { DriftCard } from "@/components/drift/DriftCard";
import { fetchSailorFootprint } from "@/lib/api/footprint";
import { countRepliesMap, toggleBottleLike, reportBottle } from "@/lib/api/bottles";
import { toggleCommentLike } from "@/lib/api/comments";
import { getOrCreateSailor } from "@/lib/api/sailor";
import { markDisplayName } from "@/lib/social-name";
import { useSocialStore } from "@/stores/social";
import { TRACKS } from "@/data/tracks";
import { timeAgo } from "@/lib/time";
import type { DriftPost, SailorFootprint } from "@/types/social";
import styles from "./SailorFootprintPage.module.css";

/** 举报原因（F-03） */
const REPORT_REASONS = ["内容不适", "恶意行为", "广告骚扰", "其他"];

interface SailorFootprintPageProps {
  mark: string;
}

/**
 * 船客足迹页（P1 F-03）：
 * 档案区（代号/称号/等级/统计）+ 关注/举报 + Tab（漂流过 / 听歌感想 / 关于）。
 * 匿名保护：只展示公开内容与派生信息，不暴露真实身份。
 */
export function SailorFootprintPage({ mark }: SailorFootprintPageProps) {
  const [footprint, setFootprint] = useState<SailorFootprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"bottles" | "comments" | "about">("bottles");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const bootstrap = useSocialStore((s) => s.bootstrap);
  const toggleFollow = useSocialStore((s) => s.toggleFollow);

  // 挂载：恢复关注/收藏 + 拉足迹档案
  useEffect(() => {
    bootstrap();
    let alive = true;
    (async () => {
      const fp = await fetchSailorFootprint(mark);
      if (alive) {
        setFootprint(fp);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [mark, bootstrap]);

  const posts: DriftPost[] = useMemo(() => {
    if (!footprint) return [];
    const replyMap = countRepliesMap();
    const bookmarkIds = useSocialStore.getState().bookmarks;
    return footprint.bottles.map((b) => ({
      bottle: b,
      liked: false,
      bookmarked: bookmarkIds.includes(b.id),
      likeCount: b.likedBy.length,
      replyCount: replyMap[b.id] ?? 0,
      // P3 A-01 星海赞仅在漂流广场主 feed 判定；足迹页展示态为空
      starPraises: [],
    }));
  }, [footprint]);

  const onFollow = useCallback(async () => {
    const r = await toggleFollow(mark);
    if (r.ok) {
      setToast(r.followed ? "已关注，ta 的公开漂流会出现在广场「关注」里。" : "已取消关注。");
    } else if (r.reason === "self") {
      setToast("不能关注自己哦。");
    } else if (r.reason === "limit") {
      setToast("关注已达上限，请先取消一些。");
    }
  }, [mark, toggleFollow]);

  const onLike = useCallback(async (bottleId: string) => {
    setBusyId(bottleId);
    const r = await toggleBottleLike(bottleId);
    if (r.ok) {
      const myMark = (await getOrCreateSailor())?.anonMark;
      setFootprint((prev) => {
        if (!prev) return prev;
        const bottles = prev.bottles.map((b) => {
          if (b.id !== bottleId) return b;
          const likedBy = myMark
            ? r.liked
              ? [...new Set([...b.likedBy, myMark])]
              : b.likedBy.filter((m) => m !== myMark)
            : b.likedBy;
          return { ...b, likedBy };
        });
        return { ...prev, bottles };
      });
    }
    setBusyId(null);
  }, []);

  const onCommentLike = useCallback(async (commentId: string) => {
    setBusyId(commentId);
    const r = await toggleCommentLike(commentId);
    if (r.ok) {
      const myMark = (await getOrCreateSailor())?.anonMark;
      setFootprint((prev) => {
        if (!prev) return prev;
        const comments = prev.comments.map((c) => {
          if (c.id !== commentId) return c;
          const likedBy = myMark
            ? r.liked
              ? [...new Set([...c.likedBy, myMark])]
              : c.likedBy.filter((m) => m !== myMark)
            : c.likedBy;
          return { ...c, likedBy };
        });
        return { ...prev, comments };
      });
    }
    setBusyId(null);
  }, []);

  const onReport = useCallback(
    async (reason: string) => {
      const ok = await reportBottle(mark, reason, "sailor");
      setReportOpen(false);
      setToast(ok ? "举报已记录，星海会核实处理。" : "举报提交失败。");
    },
    [mark],
  );

  if (loading) {
    return (
      <main className={`section ${styles.page}`}>
        <SectionHead tag="SAILOR FOOTPRINT" title="船客足迹" subtitle="匿名，是星海的规则。" />
        <p className={styles.empty}>正在打捞这位船客的足迹…</p>
      </main>
    );
  }

  if (!footprint) {
    return (
      <main className={`section ${styles.page}`}>
        <SectionHead tag="SAILOR FOOTPRINT" title="船客足迹" subtitle="匿名，是星海的规则。" />
        <p className={styles.empty}>星海里没有这个船客。</p>
      </main>
    );
  }

  const { sailor, stats } = footprint;

  return (
    <main className={`section ${styles.page}`}>
      <SectionHead
        tag="SAILOR FOOTPRINT"
        title="船客足迹"
        subtitle="匿名，是星海的规则——这里只展示公开的漂流与感想。"
      />

      {/* 档案区 */}
      <Reveal className={styles.profile}>
        <div className={styles.profileHead}>
          <div className={styles.avatar}>🎭</div>
          <div className={styles.profileMeta}>
            <h2 className={styles.mark}>{markDisplayName(sailor.anonMark)}</h2>
            <p className={styles.titleLine}>
              {sailor.title} · Lv.{sailor.level}
              {footprint.isSelf && <em className={styles.selfTag}>这是我的足迹</em>}
            </p>
          </div>
        </div>
        <div className={styles.statsRow}>
          <span>♥ 获得 <b>{stats.totalLikes}</b> 个赞</span>
          <span>📜 漂流过 <b>{stats.bottlesCount}</b> 艘</span>
          <span>💬 感想 <b>{stats.commentsCount}</b> 条</span>
          <span>❤️ 关注 <b>{stats.followingCount}</b> 人</span>
          <span>被 <b>{stats.followerCount}</b> 人关注</span>
        </div>
        <div className={styles.actions}>
          {!footprint.isSelf && (
            <button
              type="button"
              className={`${styles.followBtn}${footprint.isFollowing ? ` ${styles.following}` : ""}`}
              onClick={onFollow}
            >
              {footprint.isFollowing ? "✅ 已关注" : "❤️ 关注船客"}
            </button>
          )}
          {footprint.isSelf && (
            <Link href="/sailor" className={styles.certLink}>
              去船员证编辑 →
            </Link>
          )}
          <button type="button" className={styles.reportBtn} onClick={() => setReportOpen(true)}>
            ⛑️ 举报
          </button>
        </div>
      </Reveal>

      {/* Tab */}
      <div className={styles.tabs} role="tablist" aria-label="足迹内容">
        {(
          [
            ["bottles", `📜 漂流过 · ${stats.bottlesCount}`],
            ["comments", `💬 听歌感想 · ${stats.commentsCount}`],
            ["about", "ℹ️ 关于"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`${styles.tab}${tab === id ? ` ${styles.active}` : ""}`}
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 漂流过 */}
      {tab === "bottles" &&
        (posts.length === 0 ? (
          <p className={styles.empty}>这个船客还没有公开漂流过。</p>
        ) : (
          <div className={styles.list}>
            {posts.map((p) => (
              <Reveal key={p.bottle.id}>
                <DriftCard
                  post={p}
                  busy={busyId === p.bottle.id}
                  onLike={() => onLike(p.bottle.id)}
                  onBookmark={async () => {
                    const r = await useSocialStore.getState().toggleBookmark(p.bottle.id);
                    if (r.ok) {
                      setFootprint((prev) =>
                        prev
                          ? {
                              ...prev,
                              bottles: prev.bottles.map((b) =>
                                b.id === p.bottle.id ? b : b,
                              ),
                            }
                          : prev,
                      );
                    } else if (r.reason === "limit") {
                      setToast("收藏已达上限，请先取消一些。");
                    }
                  }}
                />
              </Reveal>
            ))}
          </div>
        ))}

      {/* 听歌感想 */}
      {tab === "comments" &&
        (footprint.comments.length === 0 ? (
          <p className={styles.empty}>这个船客还没有留下感想。</p>
        ) : (
          <div className={styles.list}>
            {footprint.comments.map((c) => {
              const track = TRACKS.find((t) => t.id === c.trackId);
              return (
                <Reveal key={c.id}>
                  <article className={styles.commentItem}>
                    <p className={styles.commentTrack}>
                      关于「{track ? track.t : c.trackId}」
                      {c.source === "bottle" && <em>🏺 来自漂流瓶</em>}
                    </p>
                    <p className={styles.commentText}>{c.text}</p>
                    <footer className={styles.commentFoot}>
                      <button
                        type="button"
                        className={styles.commentLike}
                        disabled={busyId === c.id}
                        onClick={() => onCommentLike(c.id)}
                      >
                        <i>♡</i> <b>{c.likedBy.length}</b>
                      </button>
                      <span className={styles.commentTime}>{timeAgo(c.createdAt)}</span>
                    </footer>
                  </article>
                </Reveal>
              );
            })}
          </div>
        ))}

      {/* 关于 */}
      {tab === "about" && (
        <div className={styles.aboutBox}>
          <p>⏳ 首次现身：{timeAgo(sailor.createdAt)}</p>
          <p>🎖 徽章墙：匿名船客的徽章是私密的，只展示给 ta 自己。</p>
          <p className={styles.aboutHint}>本档案由公开漂流与感想自动聚合，不包含任何真实身份信息。</p>
        </div>
      )}

      {/* 举报原因选择 */}
      <Modal open={reportOpen} onClose={() => setReportOpen(false)}>
        <h3 className={styles.reportTitle}>⛑️ 举报「{markDisplayName(sailor.anonMark)}」</h3>
        <p className={styles.reportHint}>选择举报原因，星海会核实处理。</p>
        <div className={styles.reportList}>
          {REPORT_REASONS.map((reason) => (
            <button key={reason} type="button" className={styles.reportOption} onClick={() => onReport(reason)}>
              {reason}
            </button>
          ))}
        </div>
        <button type="button" className={styles.cancelBtn} onClick={() => setReportOpen(false)}>
          取消
        </button>
      </Modal>

      <Toast text={toast} onDone={() => setToast(null)} />
    </main>
  );
}