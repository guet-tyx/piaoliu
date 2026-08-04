"use client";

import { TRACKS } from "@/data/tracks";
import { usePlayerStore } from "@/stores/player";
import styles from "./FmProgress.module.css";

/**
 * 私人 FM 推荐进度（P2-03）：
 * 「已了解你 X/52 首」——分子 = 已听 + 已推荐（取并集），分母 = 全曲库。
 * 全部听过后文案提示星海已经很懂你。
 */
export function FmProgress() {
  const fmPlayedIds = usePlayerStore((s) => s.fmPlayedIds);
  const fmRecommendedIds = usePlayerStore((s) => s.fmRecommendedIds);

  const known = new Set([...fmPlayedIds, ...fmRecommendedIds]);
  const total = TRACKS.length;
  const percent = Math.min(100, Math.round((known.size / total) * 100));

  return (
    <div className={styles.progress}>
      <p className={styles.kicker}>
        推荐进度：已了解你 <b>{known.size}</b>/{total} 首
      </p>
      <div className={styles.bar} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <i className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
      <p className={styles.hint}>
        {percent >= 100 ? "整个星海都记住你了 ✨" : "多听几首，星海会更懂你"}
      </p>
    </div>
  );
}