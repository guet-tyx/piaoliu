"use client";

import { useMemo, useState } from "react";
import type { DragEvent } from "react";
import Image from "next/image";
import { TRACKS } from "@/data/tracks";
import { formatDuration } from "@/data/music-utils";
import { UGC_LIMITS } from "@/stores/ugcPlaylists";
import styles from "./CreatePlaylistModal.module.css";

interface TrackPickerProps {
  selected: string[];
  onChange: (ids: string[]) => void;
}

/**
 * 歌曲选择器（P2-02 Step2）：
 * 搜索过滤（歌名/艺术家）、勾选/取消、全选、已选栏 ↑↓ 调整顺序 + HTML5 拖拽、
 * 实时计数（3-50 首），无结果空态。
 */
export function TrackPicker({ selected, onChange }: TrackPickerProps) {
  const [query, setQuery] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      q
        ? TRACKS.filter((t) => `${t.t}${t.s}${t.tag}`.toLowerCase().includes(q))
        : TRACKS,
    [q],
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (id: string) => {
    onChange(selectedSet.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const toggleAll = () => {
    onChange(selected.length === filtered.length ? [] : filtered.map((t) => t.id));
  };

  const move = (from: number, to: number) => {
    if (from < 0 || to < 0 || from >= selected.length || to >= selected.length) return;
    const next = [...selected];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  /** HTML5 拖拽排序（无库原生实现） */
  const onDrop = (e: DragEvent, toIdx: number) => {
    e.preventDefault();
    if (dragIdx !== null) move(dragIdx, toIdx);
    setDragIdx(null);
  };

  return (
    <div className={styles.picker}>
      <div className={styles.pickerTop}>
        <input
          className={styles.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 搜索歌曲名 / 艺术家…"
          aria-label="搜索歌曲"
        />
        <button type="button" className={styles.selectAll} onClick={toggleAll}>
          {selected.length === TRACKS.length ? "取消全选" : "全选"}
        </button>
      </div>

      <div className={styles.pickerBody}>
        {/* 左：曲库列表 */}
        <div className={styles.trackPool}>
          {filtered.length === 0 ? (
            <p className={styles.empty}>没有找到匹配的歌曲</p>
          ) : (
            filtered.map((t) => {
              const checked = selectedSet.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`${styles.trackRow}${checked ? ` ${styles.picked}` : ""}`}
                  aria-pressed={checked}
                  onClick={() => toggle(t.id)}
                >
                  <Image src={t.cover} alt="" width={36} height={36} className={styles.trackCover} />
                  <span className={styles.trackText}>
                    <span className={styles.trackName}>
                      {t.t} <em className={styles.trackTag}>{t.tag}</em>
                    </span>
                    <span className={styles.trackSub}>{t.s}</span>
                  </span>
                  <span className={styles.trackTime}>{formatDuration(t.duration)}</span>
                  <span className={styles.check} aria-hidden="true">{checked ? "☑" : "☐"}</span>
                </button>
              );
            })
          )}
        </div>

        {/* 右：已选栏（排序） */}
        <div className={styles.selectedPane}>
          <p className={styles.selectedHead}>
            已选 <b>{selected.length}</b> 首（{UGC_LIMITS.minTracks}-{UGC_LIMITS.maxTracks} 首）
          </p>
          {selected.length === 0 ? (
            <p className={styles.emptySmall}>从左侧挑几首吧</p>
          ) : (
            <ul className={styles.selectedList}>
              {selected.map((id, i) => {
                const t = TRACKS.find((x) => x.id === id);
                if (!t) return null;
                return (
                  <li
                    key={id}
                    draggable
                    onDragStart={() => setDragIdx(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDrop(e, i)}
                    className={styles.selectedItem}
                  >
                    <span className={styles.dragHandle} aria-hidden="true">⋮⋮</span>
                    <span className={styles.selectedName}>{t.t}</span>
                    <span className={styles.moveBtns}>
                      <button
                        type="button"
                        aria-label={`上移 ${t.t}`}
                        disabled={i === 0}
                        onClick={() => move(i, i - 1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`下移 ${t.t}`}
                        disabled={i === selected.length - 1}
                        onClick={() => move(i, i + 1)}
                      >
                        ↓
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}