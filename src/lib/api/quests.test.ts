import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readQuestPreview, reportQuest } from "@/lib/api/quests";
import { localDate } from "@/lib/time";
import type { QuestDailyData } from "@/types/social";

/**
 * 每日漂流任务（P1 F-05）核心路径：
 * 跨天重置 / 连续天数判定 / 任务完成与去重 / 全勤额外奖励 / 7-14-30 天连续奖励。
 */

const mem = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  get length() {
    return mem.size;
  },
};

const DAY_MS = 86_400_000;
const day = (offset: number) => localDate(new Date(Date.now() - offset * DAY_MS));

/** 构造任务数据（date 默认今天；tasks 默认全空） */
const makeQuest = (over: Partial<QuestDailyData> = {}): QuestDailyData => ({
  date: localDate(),
  tasks: { listen_3: false, pick_1: false, reply_1: false, comment_1: false },
  streak: 0,
  lastActiveDate: "",
  listenTrackIds: [],
  earnedToday: 0,
  streak14Rewarded: false,
  ...over,
});

beforeEach(() => {
  mem.clear();
  vi.stubGlobal("localStorage", localStorageMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("任务完成与去重", () => {
  it("拾瓶任务：首次完成奖励 +1，重复行为不重复计", async () => {
    const r1 = await reportQuest("pick");
    expect(r1).not.toBeNull();
    expect(r1!.reward).toBe(1);
    expect(r1!.quest.tasks.pick_1).toBe(true);

    const r2 = await reportQuest("pick");
    expect(r2).toBeNull();
  });

  it("听歌任务：按当日去重曲目计数（重复播放同曲不累计）", async () => {
    await reportQuest("listen", "t1");
    await reportQuest("listen", "t1"); // 重复同曲：不产生新完成
    const r2 = await reportQuest("listen", "t2");
    expect(r2).toBeNull(); // 2 首去重曲目，任务未完成
    const r3 = await reportQuest("listen", "t3");
    expect(r3?.reward).toBe(1);
    expect(r3?.quest.tasks.listen_3).toBe(true);
    expect(r3?.quest.listenTrackIds).toEqual(["t1", "t2", "t3"]);
  });
});

describe("全勤奖励", () => {
  it("完成最后一个任务时额外 +2（当次 reward = 1 + 2 = 3）", async () => {
    mem.set(
      "drift-quest-daily",
      JSON.stringify(
        makeQuest({
          tasks: { listen_3: true, pick_1: true, reply_1: true, comment_1: false },
        }),
      ),
    );
    const r = await reportQuest("comment");
    expect(r!.reward).toBe(3);
    expect(r!.quest.tasks.comment_1).toBe(true);
  });
});

describe("跨天重置与连续天数", () => {
  it("昨天完成过 → 跨天重置任务且 streak +1", async () => {
    mem.set(
      "drift-quest-daily",
      JSON.stringify(
        makeQuest({ date: day(1), streak: 3, lastActiveDate: day(1), tasks: { listen_3: true, pick_1: true, reply_1: false, comment_1: false } }),
      ),
    );
    const r = await reportQuest("reply");
    expect(r!.quest.date).toBe(localDate());
    expect(r!.quest.tasks.listen_3).toBe(false); // 任务已重置
    expect(r!.quest.streak).toBe(4);
    expect(r!.quest.tasks.reply_1).toBe(true);
  });

  it("前天完成过（中断一天）→ streak 归零为 1", async () => {
    mem.set(
      "drift-quest-daily",
      JSON.stringify(makeQuest({ date: day(2), streak: 5, lastActiveDate: day(2) })),
    );
    const r = await reportQuest("comment");
    expect(r!.quest.streak).toBe(1);
    expect(r!.quest.tasks.comment_1).toBe(true);
  });

  it("同一天重复完成任务不重复累计连续天数", async () => {
    const r1 = await reportQuest("comment");
    expect(r1!.quest.streak).toBe(1);
    const r2 = await reportQuest("listen", "t1");
    const r3 = await reportQuest("reply");
    expect(r3!.quest.streak).toBe(1); // 当天已完成过，不重复 +1
  });
});

describe("连续天数奖励", () => {
  it("7 天解锁星海常客徽章", async () => {
    // 昨天完成过（lastActiveDate=昨天）→ 本次完成任务 streak 6→7
    mem.set("drift-quest-daily", JSON.stringify(makeQuest({ streak: 6, lastActiveDate: day(1) })));
    const r = await reportQuest("reply");
    expect(r!.badgesToUnlock).toEqual(["streak-7"]);
  });

  it("14 天触发一次性羁绊 +5（只发一次）", async () => {
    mem.set("drift-quest-daily", JSON.stringify(makeQuest({ streak: 13, lastActiveDate: day(1) })));
    const r1 = await reportQuest("reply");
    expect(r1!.streak14Reward).toBe(true);

    // 再次完成任务不再触发 14 天奖励
    mem.set(
      "drift-quest-daily",
      JSON.stringify(
        makeQuest({ streak: 14, lastActiveDate: localDate(), streak14Rewarded: true, tasks: { listen_3: false, pick_1: false, reply_1: true, comment_1: false } }),
      ),
    );
    const r2 = await reportQuest("comment");
    expect(r2!.streak14Reward).toBe(false);
  });

  it("30 天解锁月船徽章", async () => {
    mem.set("drift-quest-daily", JSON.stringify(makeQuest({ streak: 29, lastActiveDate: day(1) })));
    const r = await reportQuest("reply");
    expect(r!.badgesToUnlock).toContain("streak-30");
  });
});

describe("面板读取跨天重置", () => {
  it("readQuestPreview 跨天时重置任务但保留连续天数（完成时再 +1）", async () => {
    mem.set(
      "drift-quest-daily",
      JSON.stringify(makeQuest({ date: day(1), streak: 2, lastActiveDate: day(1), tasks: { listen_3: true, pick_1: true, reply_1: false, comment_1: false } })),
    );
    const q = readQuestPreview();
    expect(q.date).toBe(localDate());
    expect(q.streak).toBe(2); // 连续判定在当天首次完成任务时执行
    expect(q.tasks.listen_3).toBe(false);
    expect(q.lastActiveDate).toBe(day(1)); // 保留昨日记录供完成时 +1
  });
});