import { readStorage, writeStorage, STORAGE } from "@/lib/storage";
import { localDate } from "@/lib/time";
import type { QuestDailyData } from "@/types/social";

/**
 * 每日漂流任务（P1 F-05）：
 * 4 个任务（听歌 3 首 / 拾 1 艘 / 回 1 封信 / 发 1 条感想），每日羁绊奖励；
 * 完成全部额外 +2；连续 7/14/30 天解锁徽章/羁绊/月船皮肤。
 * 本模块只负责数据状态与判定，奖励发放由调用方（identity store applyQuestReward）执行。
 */

/** 任务触发事件 */
export type QuestKind = "listen" | "pick" | "reply" | "comment";

export type QuestTaskId = keyof QuestDailyData["tasks"];

export interface QuestTaskDef {
  id: QuestTaskId;
  label: string;
  icon: string;
  desc: string;
}

/** 任务列表（comment_1 依赖留言墙，已上线即全量展示） */
export const QUEST_TASKS: QuestTaskDef[] = [
  { id: "listen_3", label: "听歌 3 首", icon: "🎵", desc: "当日累计播放 3 首不同歌曲" },
  { id: "pick_1", label: "拾 1 艘船", icon: "🏺", desc: "当日拾瓶 ≥ 1 次" },
  { id: "reply_1", label: "回 1 封信", icon: "✉️", desc: "当日回信 ≥ 1 次" },
  { id: "comment_1", label: "发 1 条感想", icon: "💬", desc: "在歌曲留言墙发布感想 ≥ 1 条" },
];

/** 全勤额外羁绊奖励 */
export const ALL_COMPLETE_BONUS = 2;
/** 14 天连续一次性羁绊奖励 */
export const STREAK_14_BONUS = 5;

/** 单次任务完成返回的奖励结果（null = 无新完成） */
export interface QuestRewardResult {
  quest: QuestDailyData;
  /** 本次获得羁绊点数（新完成任务数 + 全勤 +2） */
  reward: number;
  /** 本次解锁的连续奖励徽章（streak-7 / streak-30） */
  badgesToUnlock: string[];
  /** 本次是否触发 14 天连续羁绊 +5（一次性） */
  streak14Reward: boolean;
}

const DAY_MS = 86_400_000;

function defaultQuest(): QuestDailyData {
  return {
    date: localDate(),
    tasks: { listen_3: false, pick_1: false, reply_1: false, comment_1: false },
    streak: 0,
    lastActiveDate: "",
    listenTrackIds: [],
    earnedToday: 0,
    streak14Rewarded: false,
  };
}

/**
 * 读取并处理跨天重置（P1 F-05 数据重置规则）：
 * 日期变化时清空任务进度；连续天数与 lastActiveDate 保留——
 * 「昨天完成过」的连续判定统一在当天首次完成任务时执行（避免双重累加）。
 */
function syncQuest(): QuestDailyData {
  const q = readStorage<QuestDailyData | null>(STORAGE.questDaily, null);
  const today = localDate();
  if (!q) return defaultQuest();
  if (q.date === today) return q;
  const reset = defaultQuest();
  reset.streak = q.streak;
  reset.lastActiveDate = q.lastActiveDate;
  writeStorage(STORAGE.questDaily, reset);
  return reset;
}

/** 面板展示读取（跨天自动重置并写回） */
export function readQuestPreview(): QuestDailyData {
  const q = syncQuest();
  writeStorage(STORAGE.questDaily, q);
  return q;
}

/**
 * 上报行为并推进任务（F-05）：
 * 返回本次奖励结果（供调用方发放）；无新完成时返回 null。
 */
export async function reportQuest(
  kind: QuestKind,
  trackId?: string,
): Promise<QuestRewardResult | null> {
  const q = syncQuest();
  const prevTasks = { ...q.tasks };
  const tasks = { ...q.tasks };
  let changed = false;

  if (kind === "listen") {
    // listen_3：当日去重曲目集合 ≥ 3 首（进度超额不设上限）；
    // 仅任务真正完成算 changed（新增曲目不计入，避免无完成也推进连续天数）
    if (trackId && !q.listenTrackIds.includes(trackId)) {
      q.listenTrackIds = [...q.listenTrackIds, trackId];
    }
    if (q.listenTrackIds.length >= 3 && !tasks.listen_3) {
      tasks.listen_3 = true;
      changed = true;
    }
  } else if (kind === "pick") {
    if (!tasks.pick_1) {
      tasks.pick_1 = true;
      changed = true;
    }
  } else if (kind === "reply") {
    if (!tasks.reply_1) {
      tasks.reply_1 = true;
      changed = true;
    }
  } else if (kind === "comment") {
    if (!tasks.comment_1) {
      tasks.comment_1 = true;
      changed = true;
    }
  }

  if (!changed) {
    // 听歌去重集合仍要持久化（任务进度保留，跨天不清）
    if (kind === "listen" && trackId) writeStorage(STORAGE.questDaily, q);
    return null;
  }

  // 本次新完成任务：单个任务各 +1
  const taskIds = Object.keys(tasks) as QuestTaskId[];
  const newlyCompleted = taskIds.filter((id) => tasks[id] && !prevTasks[id]);
  let reward = newlyCompleted.length;

  // 全勤额外 +2（全部完成且此前未达成）
  const allDone = taskIds.every((id) => tasks[id]);
  const wasAll = taskIds.every((id) => prevTasks[id]);
  if (allDone && !wasAll) reward += ALL_COMPLETE_BONUS;

  // 连续天数：当天首次完成任务时判定（中断一天归零）
  const today = localDate();
  const firstActiveToday = q.lastActiveDate !== today;
  if (firstActiveToday) {
    const yesterday = localDate(new Date(Date.now() - DAY_MS));
    q.streak = q.lastActiveDate === yesterday ? q.streak + 1 : 1;
    q.lastActiveDate = today;
  }

  q.tasks = tasks;
  q.earnedToday += reward;
  writeStorage(STORAGE.questDaily, q);

  // 连续奖励：7 天徽章 / 30 天徽章（皮肤解锁）/ 14 天羁绊 +5（一次性）
  const badgesToUnlock: string[] = [];
  if (q.streak >= 7) badgesToUnlock.push("streak-7");
  if (q.streak >= 30) badgesToUnlock.push("streak-30");
  let streak14Reward = false;
  if (q.streak >= 14 && !q.streak14Rewarded) {
    q.streak14Rewarded = true;
    streak14Reward = true;
    writeStorage(STORAGE.questDaily, q);
  }

  return { quest: q, reward, badgesToUnlock, streak14Reward };
}