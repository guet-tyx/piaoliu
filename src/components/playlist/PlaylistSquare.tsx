"use client";

import { useEffect, useMemo, useState } from "react";
import { PLAYLISTS } from "@/data/playlists";
import type { Playlist } from "@/types/music";
import { PlaylistFilterBar, type SortKey } from "./PlaylistFilterBar";
import { PlaylistCard } from "./PlaylistCard";
import { CreatePlaylistModal } from "./CreatePlaylistModal";
import { SectionHead } from "@/components/shared/SectionHead";
import { useUgcPlaylistsStore, bootstrapUgc } from "@/stores/ugcPlaylists";
import styles from "./PlaylistSquare.module.css";

/** 把展示文案 "128.4万" 解析为数值（排序用；解析失败返回 0） */
function playsToNumber(text: string): number {
  const m = text.match(/^([\d.]+)万$/);
  if (m) return Math.round(parseFloat(m[1]) * 10000);
  const n = Number(text.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function sortPlaylists(list: Playlist[], sort: SortKey): Playlist[] {
  const copy = [...list];
  switch (sort) {
    case "plays":
      return copy.sort((a, b) => playsToNumber(b.meta.plays) - playsToNumber(a.meta.plays));
    case "newest":
      return copy; // 数据本身按发布时间倒序维护
    default:
      return copy.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  }
}

/**
 * 歌单广场（P1-04）：
 * 风格/场景/情绪 AND 筛选 + 排序；「推荐」角标歌单置顶；
 * 无匹配时空态；卡片点击进详情，悬浮播放按钮可直接播歌单。
 */
export function PlaylistSquare() {
  const [tag, setTag] = useState<string>("全部");
  const [scene, setScene] = useState<string>("全部");
  const [mood, setMood] = useState<string>("全部");
  const [sort, setSort] = useState<SortKey>("recommend");
  const [createOpen, setCreateOpen] = useState(false);

  // 挂载时恢复 UGC 歌单（localStorage 在 effect 内读，SSR 安全）
  useEffect(() => {
    bootstrapUgc();
  }, []);

  const filtered = useMemo(() => {
    const matched = PLAYLISTS.filter(
      (p) =>
        (tag === "全部" || p.tags.includes(tag)) &&
        (scene === "全部" || p.scene === scene) &&
        (mood === "全部" || p.mood === mood),
    );
    const sorted = sortPlaylists(matched, sort);
    // 推荐角标优先，其余保持排序
    return [...sorted.filter((p) => p.ribbon?.label === "推荐"), ...sorted.filter((p) => p.ribbon?.label !== "推荐")];
  }, [tag, scene, mood, sort]);

  const filterActive = tag !== "全部" || scene !== "全部" || mood !== "全部";

  return (
    <section className="section" id="playlist-square">
      <SectionHead
        tag="PLAYLIST PLAZA"
        title="歌单广场"
        subtitle="风格 × 场景 × 情绪，挑一张今晚的航线。"
      />

      <PlaylistFilterBar
        tag={tag}
        scene={scene}
        mood={mood}
        sort={sort}
        onTag={setTag}
        onScene={setScene}
        onMood={setMood}
        onSort={setSort}
      />

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyArt}>🌊</p>
          <p className={styles.emptyTitle}>没有找到匹配的歌单</p>
          <p className={styles.emptyDesc}>试试换一组筛选条件，星海很大，航线很多。</p>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => {
              setTag("全部");
              setScene("全部");
              setMood("全部");
            }}
          >
            重置筛选
          </button>
        </div>
      ) : (
        <>
          {/* 推荐区（带「推荐」角标的置顶 4 张） */}
          <div className={styles.featured}>
            {filtered
              .filter((p) => p.ribbon?.label === "推荐")
              .slice(0, 4)
              .map((p) => (
                <PlaylistCard key={p.id} playlist={p} featured />
              ))}
          </div>

          {/* 全部歌单网格 */}
          <div className={styles.grid}>
            {filtered.map((p) => (
              <PlaylistCard key={p.id} playlist={p} />
            ))}
          </div>

          {/* P2-02 船客自建专区（无筛选时才展示，UGC 不参与官方筛选） */}
          {!filterActive && <UgcZone onOpenCreate={() => setCreateOpen(true)} />}
        </>
      )}

      {/* P2-02 创建歌单弹窗 */}
      <CreatePlaylistModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </section>
  );
}

/** 船客自建专区（P2-02）：UGC 歌单网格 + 创建入口 + 删除 */
function UgcZone({ onOpenCreate }: { onOpenCreate: () => void }) {
  const playlists = useUgcPlaylistsStore((s) => s.playlists);
  const removeById = useUgcPlaylistsStore((s) => s.removeById);

  const onRemove = (id: string, name: string) => {
    if (window.confirm(`删除自建歌单《${name}》？此操作不可恢复。`)) {
      removeById(id);
    }
  };

  return (
    <div className={styles.ugcZone}>
      <div className={styles.ugcHead}>
        <h3 className={styles.ugcTitle}>🚢 船客自建</h3>
        <button type="button" className={styles.ugcCreate} onClick={onOpenCreate}>
          + 创建你的歌单
        </button>
      </div>

      {playlists.length === 0 ? (
        <p className={styles.ugcEmpty}>
          还没有自建歌单。从 52 首星海旋律里挑几首，折成你自己的航线。
        </p>
      ) : (
        <div className={styles.ugcGrid}>
          {playlists.map((p) => (
            <div key={p.id} className={styles.ugcCard}>
              <PlaylistCard playlist={p} />
              <button
                type="button"
                className={styles.ugcRemove}
                aria-label={`删除 ${p.name}`}
                onClick={() => onRemove(p.id, p.name)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
