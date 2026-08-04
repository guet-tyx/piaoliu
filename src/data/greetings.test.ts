import { describe, expect, it } from "vitest";
import {
  GREETING_POOLS,
  greetingPoolOf,
  hourCategoryOf,
  pickGreeting,
  type GreetingPool,
} from "@/data/greetings";

describe("开场白池完整性（PRD：默认≥3 句，久别重逢 1 条）", () => {
  it("4 角色均配置齐全", () => {
    expect(GREETING_POOLS).toHaveLength(4);
    for (const pool of GREETING_POOLS) {
      expect(pool.default.length).toBeGreaterThanOrEqual(3);
      expect(pool.returning.length).toBeGreaterThanOrEqual(1);
      expect(pool.night.length).toBeGreaterThanOrEqual(1);
      expect(pool.morning.length).toBeGreaterThanOrEqual(1);
      expect(pool.day.length).toBeGreaterThanOrEqual(1);
      expect(Object.keys(pool.channel).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("greetingPoolOf 命中已知 / 未知返回 undefined", () => {
    expect(greetingPoolOf("sio")?.roleId).toBe("sio");
    expect(greetingPoolOf("nope")).toBeUndefined();
  });
});

describe("hourCategoryOf 时段分类", () => {
  it("0-5 深夜 / 6-8 清晨 / 9-17 日间 / 18-19 傍晚 / 20-23 默认", () => {
    expect(hourCategoryOf(0)).toBe("night");
    expect(hourCategoryOf(5)).toBe("night");
    expect(hourCategoryOf(6)).toBe("morning");
    expect(hourCategoryOf(8)).toBe("morning");
    expect(hourCategoryOf(9)).toBe("day");
    expect(hourCategoryOf(17)).toBe("day");
    expect(hourCategoryOf(18)).toBe("evening");
    expect(hourCategoryOf(19)).toBe("evening");
    expect(hourCategoryOf(20)).toBe("default");
    expect(hourCategoryOf(23)).toBe("default");
  });
});

describe("pickGreeting 触发优先级", () => {
  const pool = greetingPoolOf("sio")!;
  const fourDaysAgo = Date.now() - 4 * 24 * 60 * 60 * 1000;

  it("久别重逢（>3 天有历史）最高优先", () => {
    const r = pickGreeting(pool, { hour: 15, channelId: "ch-night", lastVisitAt: fourDaysAgo });
    expect(pool.returning).toContain(r.text);
  });

  it("频道联动 > 时段", () => {
    const r = pickGreeting(pool, { hour: 3, channelId: "ch-night", lastVisitAt: null });
    expect(pool.channel["ch-night"]).toContain(r.text);
  });

  it("时段 > 默认", () => {
    const r = pickGreeting(pool, { hour: 3, channelId: null, lastVisitAt: null });
    expect(pool.night).toContain(r.text);
  });

  it("20-24 点回落默认池", () => {
    const r = pickGreeting(pool, { hour: 22, channelId: null, lastVisitAt: null });
    expect(pool.default).toContain(r.text);
  });

  it("频道无对应词时回退时段", () => {
    const r = pickGreeting(pool, { hour: 3, channelId: "ch-study", lastVisitAt: null });
    expect(pool.night).toContain(r.text);
  });

  it("未知角色返回通用兜底句", () => {
    expect(pickGreeting(undefined, { hour: 12 })).toEqual({ text: "嗨，你来了。", key: "fallback" });
  });
});

describe("pickGreeting 避开最近用过的句子", () => {
  it("excludeKeys 命中时换一句（有备选）", () => {
    const small: GreetingPool = {
      roleId: "test",
      default: ["A", "B"],
      night: [],
      morning: [],
      day: [],
      evening: [],
      channel: {},
      returning: [],
    };
    // 排除 A 的 key → 必选 B
    const r = pickGreeting(small, { hour: 21 }, ["test:default:0"]);
    expect(r).toEqual({ text: "B", key: "test:default:1" });
  });

  it("全部被排除时允许重复（池太小时不阻塞）", () => {
    const one: GreetingPool = {
      roleId: "test",
      default: ["唯一"],
      night: [],
      morning: [],
      day: [],
      evening: [],
      channel: {},
      returning: [],
    };
    const r = pickGreeting(one, { hour: 21 }, ["test:default:0"]);
    expect(r.text).toBe("唯一");
  });
});
