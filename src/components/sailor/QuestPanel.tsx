"use client";

import { useEffect, useRef, useState } from "react";
import { Toast } from "@/components/shared/Toast";
import { QUEST_TASKS } from "@/lib/api/quests";
import { useQuestStore } from "@/stores/quests";
import styles from "./QuestPanel.module.css";

/**
 * 每日漂流任务面板（P1 F-05）：挂在船员证页（SailorCard 下、SkinPicker 上）
 * 任务列表（✅/⬜ + 图标 + 进度 + 羁绊+1）+ 连续天数 + 今日汇总 + 完成动画。
 */
export function QuestPanel() {
  const quest = useQuestStore((s) => s.quest);
  const refresh = useQuestStore((s) => s.refresh);
  const [toast, setToast] = useState<string | null>(null);
  const prevEarnedRef = useRef<number | null>(null);

  // 挂载读取（跨天自动重置）
  useEffect(() => {
    refresh();
  }, [refresh]);

  // 埋点完成后 earnedToday 增加 → 完成提示
  useEffect(() => {
    if (
      quest &&
      prevEarnedRef.current !== null &&
      quest.earnedToday > prevEarnedRef.current
    ) {
      setToast(`任务完成！羁绊 +${quest.earnedToday - prevEarnedRef.current}`);
    }
    if (quest) prevEarnedRef.current = quest.earnedToday;
  }, [quest]);

  if (!quest) return null;

  const total = QUEST_TASKS.length;
  const done = QUEST_TASKS.filter((t) => quest.tasks[t.id]).length;
  const allDone = done === total;

  return (
    <div className={styles.card}>
      <header className={styles.head}>
        <h3 className={styles.title}>
          <i>📋</i> 每日漂流
        </h3>
        {quest.streak > 0 && <span className={styles.streak}>🔥 连续 {quest.streak} 天</span>}
      </header>

      <div className={styles.list}>
        {QUEST_TASKS.map((t) => {
          const doneTask = quest.tasks[t.id];
          const progress =
            t.id === "listen_3"
              ? `${Math.min(quest.listenTrackIds.length, 3)}/3`
              : doneTask
                ? "1/1"
                : "0/1";
          return (
            <div
              key={t.id}
              className={`${styles.task}${doneTask ? ` ${styles.done}` : ""}`}
            >
              <span className={`${styles.check}${doneTask ? ` ${styles.checked}` : ""}`}>
                {doneTask ? "✅" : "⬜"}
              </span>
              <span className={styles.taskIcon}>{t.icon}</span>
              <span className={styles.taskName}>{t.label}</span>
              <span className={styles.taskProgress}>{progress}</span>
              <span className={styles.taskReward}>羁绊 +1</span>
            </div>
          );
        })}
      </div>

      <footer className={styles.foot}>
        <p className={styles.summary}>
          今日已获得羁绊：<b>{quest.earnedToday}</b>/{total}
        </p>
        <p className={styles.bonus}>
          {allDone ? "🎉 今日全勤达成，额外羁绊已发放！" : "全部完成可额外获得羁绊 +2"}
        </p>
      </footer>

      <Toast text={toast} onDone={() => setToast(null)} />
    </div>
  );
}