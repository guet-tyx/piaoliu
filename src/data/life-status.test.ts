import { describe, expect, it } from "vitest";
import {
  LIFE_STATUS_POOLS,
  lifePoolOf,
  pickLifeStatus,
  lifeIntervalOf,
  isNightHour,
  channelLifeOf,
  LIFE_INTERVAL_DAY,
  LIFE_INTERVAL_EVENING,
  LIFE_INTERVAL_NIGHT,
} from "@/data/life-status";

describe("生活状态池完整性", () => {
  it("4 位角色各配齐白天池/深夜池/思考/输入/悬停细节", () => {
    expect(LIFE_STATUS_POOLS).toHaveLength(4);
    for (const pool of LIFE_STATUS_POOLS) {
      expect(pool.day.length).toBeGreaterThanOrEqual(6);
      expect(pool.night.length).toBeGreaterThanOrEqual(1);
      expect(pool.thinking.key).toBeTruthy();
      expect(pool.thinking.icon).toBeTruthy();
      expect(pool.streaming.key).toBeTruthy();
      expect(pool.tooltips.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("白天/思考/输入文案 key 在本角色内唯一", () => {
    for (const pool of LIFE_STATUS_POOLS) {
      const keys = [...pool.day, pool.thinking, pool.streaming].map((s) => s.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("lifePoolOf 命中已知 / 未知返回 undefined", () => {
    expect(lifePoolOf("sio")?.roleId).toBe("sio");
    expect(lifePoolOf("nope")).toBeUndefined();
  });
});

describe("pickLifeStatus 随机选取", () => {
  it("池内多条时避开当前 key（不连续重复）", () => {
    const pool = lifePoolOf("sio")!;
    for (let i = 0; i < 30; i += 1) {
      const pick = pickLifeStatus(pool, pool.day[0].key, false);
      expect(pick.key).not.toBe(pool.day[0].key);
    }
  });

  it("深夜安静池仅一条时允许重复（night=true）", () => {
    const pool = lifePoolOf("sio")!;
    const pick = pickLifeStatus(pool, pool.night[0].key, true);
    expect(pick.key).toBe(pool.night[0].key);
  });

  it("未知角色兜底非空", () => {
    const pick = pickLifeStatus(undefined, undefined, false);
    expect(pick.key).toBeTruthy();
    expect(pick.icon).toBeTruthy();
  });
});

describe("lifeIntervalOf 时段间隔（PRD §3.1）", () => {
  it("白天 6-21 点 30s", () => {
    expect(lifeIntervalOf(new Date(2026, 0, 1, 6, 0))).toBe(LIFE_INTERVAL_DAY);
    expect(lifeIntervalOf(new Date(2026, 0, 1, 21, 59))).toBe(LIFE_INTERVAL_DAY);
  });

  it("深夜 22-23 点 45s", () => {
    expect(lifeIntervalOf(new Date(2026, 0, 1, 22, 0))).toBe(LIFE_INTERVAL_EVENING);
    expect(lifeIntervalOf(new Date(2026, 0, 1, 23, 59))).toBe(LIFE_INTERVAL_EVENING);
  });

  it("午夜 0-5 点 60s", () => {
    expect(lifeIntervalOf(new Date(2026, 0, 1, 0, 0))).toBe(LIFE_INTERVAL_NIGHT);
    expect(lifeIntervalOf(new Date(2026, 0, 1, 5, 59))).toBe(LIFE_INTERVAL_NIGHT);
  });
});

describe("isNightHour（0-6 点）", () => {
  it("凌晨为深夜，白天不是", () => {
    expect(isNightHour(new Date(2026, 0, 1, 3, 0))).toBe(true);
    expect(isNightHour(new Date(2026, 0, 1, 12, 0))).toBe(false);
    expect(isNightHour(new Date(2026, 0, 1, 6, 0))).toBe(false);
  });
});

describe("channelLifeOf 频道联动（PRD §5.1）", () => {
  it("已知频道返回「正在听{频道名}」", () => {
    expect(channelLifeOf("ch-night")).toMatchObject({
      key: "channel:ch-night",
      icon: "🎧",
      text: "正在听深夜频道",
    });
    expect(channelLifeOf("ch-fm")?.text).toBe("正在听私人 FM");
  });

  it("未知频道返回 null", () => {
    expect(channelLifeOf("ch-nope")).toBeNull();
  });
});
