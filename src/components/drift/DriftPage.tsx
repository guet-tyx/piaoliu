"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SectionHead } from "@/components/shared/SectionHead";
import { Reveal } from "@/components/shared/Reveal";
import { Toast } from "@/components/shared/Toast";
import { DriftCard } from "./DriftCard";
import { LeaderboardPanel } from "./LeaderboardPanel";
import {
  countRepliesMap,
  fetchPublicBottles,
  toggleBottleLike,
} from "@/lib/api/bottles";
import { getOrCreateSailor } from "@/lib/api/sailor";
import { useSocialStore } from "@/stores/social";
import { TOPICS } from "@/data/topics";
import type { DriftPost } from "@/types/social";
import styles from "./DriftPage.module.css";

type FeedTab = "hot" | "latest" | "following" | "leaderboard";

const PAGE_SIZE = 8;

/**
 * 热门排序（P0 F-01）：点赞×0.7 + 回信数×0.3，24h 半衰衰减（本地近似，
 * 真实模式 UI 同公式；回复数取本地回落，SQL 侧另有 likes 排序兜底）
 */
function hotScore(p: DriftPost, now: number = Date.now()): number {
  const ageHours = (now - p.bottle.createdAt) / 3_600_000;
  const decay = Math.pow(0.5, ageHours / 24);
  return (p.likeCount * 0.7 + p.replyCount * 0.3) * decay;
}

const EMPTY_TEXT: Record<Exclude<FeedTab, "leaderboard">, string> = {
  hot: "星海今天很安静，投第一艘公开船吧。",
  latest: "还没有公开漂流，快来启航。",
  following: "你还没有关注任何船客，去广场发现有趣的灵魂吧。",
};

/**
 * 漂流广场（P0 F-01 + P1 F-06/F-07）：
 * 公开瓶子流 + 筛选 Tab（热门/最新/关注/排行榜）+ 话题筛选（URL 干净态可直达）+
 * 点赞/收藏/播放 + 分页与空态。
 */
export function DriftPage() {
  const [tab, setTab] = useState<FeedTab>("latest");
  const [posts, setPosts] = useState<DriftPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  /** 点赞/收藏中的瓶 id（防连点） */
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  /** P1 F-07 话题筛选（跨 Tab 保持；URL ?topic= 直达/回写） */
  const [topicFilter, setTopicFilterState] = useState<string | null>(null);
  const router = useRouter();

  const follows = useSocialStore((s) => s.follows);
  const bootstrap = useSocialStore((s) => s.bootstrap);

  // 挂载：恢复关注/收藏 + 拉取公开瓶流（本地模式同步量小，一次完成）+ URL 话题直达
  useEffect(() => {
    bootstrap();
    const urlTopic = new URLSearchParams(window.location.search).get("topic");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL 外部源初始化（SSR 空态安全，水合后更新）
    if (urlTopic) setTopicFilterState(urlTopic);
    let alive = true;
    (async () => {
      const [bottles, sailor, replyMap] = await Promise.all([
        fetchPublicBottles(),
        getOrCreateSailor(),
        Promise.resolve(countRepliesMap()),
      ]);
      if (!alive) return;
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
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [bootstrap]);

  const onTab = (t: FeedTab) => {
    setTab(t);
    setPage(1);
  };

  /** 话题筛选（写入 URL query，便于首页热门话题跳转直达） */
  const setTopicFilter = (id: string | null) => {
    setTopicFilterState(id);
    setPage(1);
    router.replace(id ? `?topic=${encodeURIComponent(id)}` : "/drift", { scroll: false });
  };

  /** 话题过滤：应用于瓶子列表 Tab（排行榜独立，不参与） */
  const applyTopic = (list: DriftPost[]) =>
    topicFilter ? list.filter((p) => p.bottle.topic === topicFilter) : list;

  const total = useMemo(() => {
    if (tab === "following") {
      return applyTopic(
        posts.filter((p) => follows.some((f) => f.followedMark === p.bottle.anonMark)),
      ).length;
    }
    if (tab === "leaderboard") return 0;
    return applyTopic(posts).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, tab, follows, topicFilter]);

  const visible = useMemo(() => {
    if (tab === "leaderboard") return [];
    if (tab === "following") {
      return applyTopic(
        posts
          .filter((p) => follows.some((f) => f.followedMark === p.bottle.anonMark))
          .sort((a, b) => b.bottle.createdAt - a.bottle.createdAt),
      ).slice(0, page * PAGE_SIZE);
    }
    const sorted =
      tab === "hot"
        ? [...posts].sort((a, b) => hotScore(b) - hotScore(a))
        : [...posts].sort((a, b) => b.bottle.createdAt - a.bottle.createdAt);
    return applyTopic(sorted).slice(0, page * PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, tab, follows, page, topicFilter]);

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
      setPosts((prev) =>
        prev.map((p) =>
          p.bottle.id === bottleId ? { ...p, bookmarked: r.bookmarked } : p,
        ),
      );
    } else if (r.reason === "limit") {
      setToast("收藏已达上限，请先取消一些。");
    }
  }, []);

  const tabBtn = (id: FeedTab, label: string) => (
    <button
      key={id}
      type="button"
      className={`${styles.tab}${tab === id ? ` ${styles.active}` : ""}`}
      aria-pressed={tab === id}
      onClick={() => onTab(id)}
    >
      {label}
    </button>
  );

  return (
    <main className={`section ${styles.page}`}>
      <SectionHead
        tag="DRIFT PLAZA"
        title="漂流广场"
        subtitle="星海里大家最近都在聊什么——捡一艘公开船，看看别人的心事。"
      />

      <div className={styles.tabs} role="tablist" aria-label="广场筛选">
        {tabBtn("hot", "🔥 热门")}
        {tabBtn("latest", "✨ 最新")}
        {follows.length > 0 && tabBtn("following", "❤️ 关注")}
        {tabBtn("leaderboard", "🏆 排行榜")}
        {/* P1 F-07 话题筛选（跨 Tab 保持） */}
        <select
          className={`${styles.topicSelect}${topicFilter ? ` ${styles.topicOn}` : ""}`}
          value={topicFilter ?? ""}
          disabled={tab === "leaderboard"}
          aria-label="按话题筛选"
          onChange={(e) => setTopicFilter(e.target.value || null)}
        >
          <option value="">话题：全部</option>
          {TOPICS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {tab === "leaderboard" ? (
        <LeaderboardPanel />
      ) : loading ? (
        <p className={styles.empty}>星海正在打捞公开的船…</p>
      ) : visible.length === 0 ? (
        <div className={styles.emptyBox}>
          <p className={styles.empty}>
            {topicFilter ? "这个话题下还没有公开漂流的船。" : EMPTY_TEXT[tab as Exclude<FeedTab, "leaderboard">]}
          </p>
          <Link href="/#bottle" className={styles.launchLink}>
            🏺 去投一艘公开船
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {visible.map((p) => (
            <Reveal key={p.bottle.id}>
              <DriftCard
                post={p}
                busy={busyId === p.bottle.id}
                onLike={() => onLike(p.bottle.id)}
                onBookmark={() => onBookmark(p.bottle.id)}
              />
            </Reveal>
          ))}
        </div>
      )}

      {!loading && visible.length < total && (
        <button
          type="button"
          className={styles.more}
          onClick={() => setPage((n) => n + 1)}
        >
          ▽ 加载更多
        </button>
      )}

      <Toast text={toast} onDone={() => setToast(null)} />
    </main>
  );
}