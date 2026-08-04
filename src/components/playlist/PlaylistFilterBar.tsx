"use client";

import { PLAYLISTS } from "@/data/playlists";
import type { TrackMood, TrackScene } from "@/types/music";
import styles from "./PlaylistSquare.module.css";

export type SortKey = "recommend" | "plays" | "newest";

/** 筛选维度选项（由歌单数据驱动；场景/情绪用合法枚举全集） */
const TAG_OPTIONS = Array.from(new Set(PLAYLISTS.flatMap((p) => p.tags))).sort();
const SCENE_OPTIONS: TrackScene[] = [
  "深夜", "学习", "通勤", "雨天", "冥想", "运动", "日常",
];
const MOOD_OPTIONS: TrackMood[] = [
  "治愈", "燃", "伤感", "平静", "空灵", "温暖",
];

const FILTER_OPTIONS = {
  tags: TAG_OPTIONS,
  scenes: SCENE_OPTIONS,
  moods: MOOD_OPTIONS,
};

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recommend", label: "推荐排序" },
  { key: "plays", label: "最多播放" },
  { key: "newest", label: "最新发布" },
];

export interface PlaylistFilterBarProps {
  tag: string;
  scene: string;
  mood: string;
  sort: SortKey;
  onTag: (v: string) => void;
  onScene: (v: string) => void;
  onMood: (v: string) => void;
  onSort: (v: SortKey) => void;
}

/** 歌单广场筛选栏（P1-04）：风格/场景/情绪 AND 筛选 + 排序 */
export function PlaylistFilterBar({
  tag,
  scene,
  mood,
  sort,
  onTag,
  onScene,
  onMood,
  onSort,
}: PlaylistFilterBarProps) {
  return (
    <div className={styles.filterBar}>
      <FilterRow label="风格" value={tag} options={FILTER_OPTIONS.tags} onChange={onTag} />
      <FilterRow label="场景" value={scene} options={FILTER_OPTIONS.scenes} onChange={onScene} />
      <FilterRow label="情绪" value={mood} options={FILTER_OPTIONS.moods} onChange={onMood} />
      <div className={styles.sortRow}>
        <span className={styles.filterLabel}>排序</span>
        <div className={styles.chips}>
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`${styles.chip}${sort === s.key ? ` ${styles.on}` : ""}`}
              onClick={() => onSort(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.filterLabel}>{label}</span>
      <div className={styles.chips}>
        <button
          type="button"
          className={`${styles.chip}${value === "全部" ? ` ${styles.on}` : ""}`}
          onClick={() => onChange("全部")}
        >
          全部
        </button>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`${styles.chip}${value === opt ? ` ${styles.on}` : ""}`}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}