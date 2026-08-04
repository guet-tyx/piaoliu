"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { TRACKS } from "@/data/tracks";
import { PLAYLISTS } from "@/data/playlists";
import { trackById } from "@/data/music-utils";
import { usePlayerStore } from "@/stores/player";
import type { Track } from "@/types/music";
import styles from "./MusicPicker.module.css";

interface MusicItem {
  key: string;
  name: string;
  sub: string;
  cover: string;
  token: string;
}

interface MusicPickerProps {
  onClose: () => void;
  onPick: (token: string) => void;
}

/** 选歌浮层（R1 §6.3）：搜索 + 热门歌单 / 我的收藏，点歌插入 [music: 歌名] */
export function MusicPicker({ onClose, onPick }: MusicPickerProps) {
  const likedIds = usePlayerStore((s) => s.likedIds);
  const [tab, setTab] = useState<"hot" | "fav">("hot");
  const [query, setQuery] = useState("");

  // ESC 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 热门歌单：取歌单第一首作为 token（P1-03 起按 trackIds，不再位置耦合）
  const hotItems: MusicItem[] = PLAYLISTS.map((p) => {
    const first = trackById(p.trackIds[0]);
    return {
      key: p.id,
      name: p.name,
      sub: `${first?.tag ?? ""} · ${p.meta.plays}`,
      cover: p.cover,
      token: `[music: ${first?.t ?? p.name}]`,
    };
  });

  // 我的收藏：likedIds → TRACKS
  const favItems: MusicItem[] = likedIds
    .map((id) => TRACKS.find((t) => t.id === id))
    .filter((t): t is Track => Boolean(t))
    .map((t) => ({
      key: t.id,
      name: t.t,
      sub: t.s,
      cover: t.cover,
      token: `[music: ${t.t}]`,
    }));

  const items = tab === "hot" ? hotItems : favItems;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter((it) => `${it.name}${it.sub}`.toLowerCase().includes(q))
    : items;

  return (
    <div className={styles.mask} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <span className={styles.title}>选一首歌</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        <input
          className={styles.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索歌曲 / 歌单…"
          autoFocus
        />

        <div className={styles.tabs} role="tablist" aria-label="选歌来源">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "hot"}
            className={`${styles.tab}${tab === "hot" ? ` ${styles.tabActive}` : ""}`}
            onClick={() => setTab("hot")}
          >
            热门歌单
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "fav"}
            className={`${styles.tab}${tab === "fav" ? ` ${styles.tabActive}` : ""}`}
            onClick={() => setTab("fav")}
          >
            我的收藏
          </button>
        </div>

        <div className={styles.list}>
          {filtered.length === 0 ? (
            <p className={styles.empty}>
              {tab === "fav" ? "还没有收藏的歌曲，去电台点个心吧。" : "没有找到相关歌曲。"}
            </p>
          ) : (
            filtered.map((it) => (
              <button key={it.key} type="button" className={styles.item} onClick={() => onPick(it.token)}>
                <Image src={it.cover} alt="" width={40} height={40} className={styles.cover} />
                <span className={styles.itemText}>
                  <span className={styles.itemName}>{it.name}</span>
                  <span className={styles.itemSub}>{it.sub}</span>
                </span>
                <span className={styles.itemInsert} aria-hidden="true">
                  插入
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
