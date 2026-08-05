"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/shared/Modal";
import { Toast } from "@/components/shared/Toast";
import { DriftCard } from "@/components/drift/DriftCard";
import {
  countRepliesMap,
  fetchMyBottles,
  fetchPublicBottles,
  toggleBottleLike,
} from "@/lib/api/bottles";
import { getOrCreateSailor } from "@/lib/api/sailor";
import { useSocialStore } from "@/stores/social";
import { timeAgo } from "@/lib/time";
import type { Bottle, DriftPost } from "@/types/social";
import styles from "./SocialEntries.module.css";

/**
 * 船员证页社交入口区（P0 F-01 / F-04）：
 * 📌 我的收藏 · ❤️ 我的关注（N）· 📜 我的漂流（N）
 * 收藏/漂流弹窗复用 DriftCard（收藏态切换即管理），关注弹窗提供取消关注。
 */
export function SocialEntries() {
  const follows = useSocialStore((s) => s.follows);
  const bookmarks = useSocialStore((s) => s.bookmarks);
  const bootstrap = useSocialStore((s) => s.bootstrap);
  const [openBookmarks, setOpenBookmarks] = useState(false);
  const [openFollows, setOpenFollows] = useState(false);
  const [openDrift, setOpenDrift] = useState(false);
  /** 我的漂流计数（异步加载） */
  const [myDriftCount, setMyDriftCount] = useState(0);

  useEffect(() => {
    bootstrap();
    let alive = true;
    (async () => {
      const mine = await fetchMyBottles();
      if (alive) setMyDriftCount(mine.length);
    })();
    return () => {
      alive = false;
    };
  }, [bootstrap]);

  return (
    <>
      <div className={styles.entries}>
        <button type="button" className={styles.entry} onClick={() => setOpenBookmarks(true)}>
          📌 我的收藏 <b>{bookmarks.length}</b>
        </button>
        <button type="button" className={styles.entry} onClick={() => setOpenFollows(true)}>
          ❤️ 我的关注 <b>{follows.length}</b>
        </button>
        <button type="button" className={styles.entry} onClick={() => setOpenDrift(true)}>
          📜 我的漂流 <b>{myDriftCount}</b>
        </button>
      </div>

      <BottleListModal
        open={openBookmarks}
        onClose={() => setOpenBookmarks(false)}
        kind="bookmarks"
      />
      <BottleListModal
        open={openDrift}
        onClose={() => setOpenDrift(false)}
        kind="drift"
      />
      <FollowListModal open={openFollows} onClose={() => setOpenFollows(false)} />
    </>
  );
}

/** 收藏/我的漂流 通用瓶子列表弹窗 */
function BottleListModal({
  open,
  onClose,
  kind,
}: {
  open: boolean;
  onClose: () => void;
  kind: "bookmarks" | "drift";
}) {
  const [posts, setPosts] = useState<DriftPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      const ids = useSocialStore.getState().bookmarks;
      const bottles: Bottle[] =
        kind === "drift"
          ? await fetchMyBottles()
          : (await fetchPublicBottles()).filter((b) => ids.includes(b.id));
      const sailor = await getOrCreateSailor();
      if (!alive) return;
      const replyMap = countRepliesMap();
      const bookmarkIds = useSocialStore.getState().bookmarks;
      setPosts(
        bottles.map((b) => ({
          bottle: b,
          liked: sailor !== null && b.likedBy.includes(sailor.anonMark),
          bookmarked: bookmarkIds.includes(b.id),
          likeCount: b.likedBy.length,
          replyCount: replyMap[b.id] ?? 0,
        })),
      );
      setLoaded(true);
    })();
    return () => {
      alive = false;
      setLoaded(false);
    };
  }, [open, kind]);

  const onLike = useCallback(async (bottleId: string) => {
    setBusyId(bottleId);
    const r = await toggleBottleLike(bottleId);
    if (r.ok) {
      const mark = (await getOrCreateSailor())?.anonMark;
      setPosts((prev) =>
        prev.map((p) => {
          if (p.bottle.id !== bottleId) return p;
          const likedBy = mark
            ? r.liked
              ? [...new Set([...p.bottle.likedBy, mark])]
              : p.bottle.likedBy.filter((m) => m !== mark)
            : p.bottle.likedBy;
          return {
            ...p,
            bottle: { ...p.bottle, likedBy },
            liked: r.liked,
            likeCount: likedBy.length,
          };
        }),
      );
    }
    setBusyId(null);
  }, []);

  const onBookmark = useCallback(async (bottleId: string) => {
    setBusyId(bottleId);
    const r = await useSocialStore.getState().toggleBookmark(bottleId);
    setBusyId(null);
    if (r.ok) {
      // 收藏弹窗内取消收藏 → 立即移出列表
      setPosts((prev) =>
        kind === "bookmarks"
          ? prev.filter((p) => p.bottle.id !== bottleId)
          : prev.map((p) =>
              p.bottle.id === bottleId ? { ...p, bookmarked: r.bookmarked } : p,
            ),
      );
    } else if (r.reason === "limit") {
      setToast("收藏已达上限，请先取消一些。");
    }
  }, [kind]);

  const title = kind === "bookmarks" ? "📌 我的收藏" : "📜 我的漂流";
  const emptyText =
    kind === "bookmarks"
      ? "还没有收藏任何瓶子。去漂流广场遇见喜欢的船吧。"
      : "还没有启航过。投第一艘船，星海会记得。";

  return (
    <Modal open={open} onClose={onClose}>
      <h3 id="social-bottle-title" className={styles.modalTitle}>
        {title}
      </h3>
      {!loaded ? (
        <p className={styles.modalEmpty}>正在打捞…</p>
      ) : posts.length === 0 ? (
        <p className={styles.modalEmpty}>{emptyText}</p>
      ) : (
        <div className={styles.modalList}>
          {posts.map((p) => (
            <DriftCard
              key={p.bottle.id}
              post={p}
              busy={busyId === p.bottle.id}
              onLike={() => onLike(p.bottle.id)}
              onBookmark={() => onBookmark(p.bottle.id)}
            />
          ))}
        </div>
      )}
      <button type="button" className={styles.closeBtn} onClick={onClose}>
        关闭
      </button>
      <Toast text={toast} onDone={() => setToast(null)} />
    </Modal>
  );
}

/** 关注管理弹窗（F-04）：代号列表 + 取消关注 + 跳足迹页 */
function FollowListModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const follows = useSocialStore((s) => s.follows);
  const toggleFollow = useSocialStore((s) => s.toggleFollow);

  return (
    <Modal open={open} onClose={onClose}>
      <h3 id="social-follow-title" className={styles.modalTitle}>
        ❤️ 我的关注
        <span className={styles.followCount}>{follows.length}/100</span>
      </h3>
      {follows.length === 0 ? (
        <p className={styles.modalEmpty}>还没有关注任何船客，去广场发现有趣的灵魂吧。</p>
      ) : (
        <ul className={styles.followList}>
          {follows.map((f) => (
            <li key={f.followedMark} className={styles.followItem}>
              <Link
                href={`/sailor/${encodeURIComponent(f.followedMark)}`}
                className={styles.followMark}
              >
                🎭 {f.followedMark}
              </Link>
              <span className={styles.followTime}>{timeAgo(f.createdAt)}关注</span>
              <button
                type="button"
                className={styles.unfollowBtn}
                onClick={() => toggleFollow(f.followedMark)}
              >
                取消关注
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className={styles.closeBtn} onClick={onClose}>
        关闭
      </button>
    </Modal>
  );
}