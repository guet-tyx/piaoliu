import { create } from "zustand";
import { readQuestPreview, type QuestRewardResult } from "@/lib/api/quests";
import type { QuestDailyData } from "@/types/social";

/**
 * 每日漂流任务 store（P1 F-05）：
 * 数据权威在 quests api（drift-quest-daily），store 只维护面板订阅副本。
 * 奖励发放由 identity store 执行后经 applyResult 同步到面板。
 */
interface QuestState {
  quest: QuestDailyData | null;
  /** 读取（跨天自动重置）并同步到面板 */
  refresh: () => void;
  /** 埋点完成后同步最新任务数据 */
  applyResult: (r: QuestRewardResult) => void;
}

export const useQuestStore = create<QuestState>()((set) => ({
  quest: null,
  refresh: () => set({ quest: readQuestPreview() }),
  applyResult: (r) => set({ quest: r.quest }),
}));