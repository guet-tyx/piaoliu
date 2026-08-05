import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as starMod from "@/lib/community/starPraise";
import { STAR_PRAISE_ROLES } from "@/data/star-praise";
import type { Bottle } from "@/types/social";

/**
 * P3 A-01 角色星海赞判定（本地分支）：
 * 条件优先级（B 曲风 > C 话题 > A 赞≥5 > D 新瓶）/ 每角色每日上限 / 30 分钟缓存 / 已看去重。
 * 概率用 Math.random 桩控制：0.0 全命中、0.99 全不中，保证确定性。
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

let api: typeof starMod;

const makeBottle = (over: Partial<Bottle> = {}): Bottle => ({
  id: "b-1",
  authorId: "local-guest",
  text: "今晚的风很适合漂流，把心事交给星海。",
  track: { t: "信风", tag: "后摇", s: "一支你没听过的乐队 · 后摇", cover: "/images/cover-anime-1.png" },
  bottleStyle: "paper",
  anonMark: "晚风船客·A7F3",
  status: "drifting",
  pickedBy: null,
  isSystem: false,
  createdAt: Date.now(),
  repliedAt: null,
  readAt: null,
  isPublic: true,
  likedBy: [],
  ...over,
});

beforeEach(async () => {
  mem.clear();
  vi.resetModules();
  vi.stubGlobal("localStorage", localStorageMock);
  api = await import("@/lib/community/starPraise");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("星海赞条件判定", () => {
  it("条件 B：曲风属于角色主持频道（如后摇 → 汐）在概率命中时点赞", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.0); // 全命中
    const pool = [makeBottle({ id: "b-sio", track: { t: "信风", tag: "后摇", s: "x", cover: "c" } })];
    const praised = api.ensureStarPraises(pool);
    expect(praised["b-sio"]).toContain("sio");
  });

  it("条件 B 概率不中（0.99）时不给赞；无任何条件命中时也不给赞", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // 全不中
    const old = makeBottle({
      id: "b-old",
      createdAt: Date.now() - 10 * 3_600_000, // 超过 1 小时新瓶窗口
      likedBy: [],
    });
    const praised = api.ensureStarPraises([old]);
    expect(praised["b-old"] ?? []).toHaveLength(0);
  });

  it("条件 C：话题匹配角色性格（#失眠夜 → 汐）", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.0);
    const pool = [makeBottle({ id: "b-insomnia", topic: "insomnia", track: { t: "x", tag: "氛围", s: "x", cover: "c" } })];
    const praised = api.ensureStarPraises(pool);
    expect(praised["b-insomnia"]).toContain("sio");
  });

  it("条件 A：点赞 ≥ 5 的优质瓶（30% 概率）", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.0);
    const pool = [
      makeBottle({ id: "b-hot", likedBy: ["m1", "m2", "m3", "m4", "m5"], createdAt: Date.now() - 5 * 3_600_000 }),
    ];
    const praised = api.ensureStarPraises(pool);
    // 5 个赞且曲风/话题均不匹配时仍可能触发（条件 A）
    expect(Object.keys(praised)).toContain("b-hot");
  });

  it("非公开瓶不参与星海赞判定", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.0);
    const pool = [makeBottle({ id: "b-private", isPublic: false })];
    const praised = api.ensureStarPraises(pool);
    expect(praised["b-private"] ?? []).toHaveLength(0);
  });
});

describe("星海赞业务规则", () => {
  it("每角色每日上限 20：超过 20 个命中瓶只赞 20 个", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.0);
    const pool = Array.from({ length: 25 }, (_, i) =>
      makeBottle({ id: `b-${i}`, track: { t: `t${i}`, tag: "后摇", s: "x", cover: "c" } }),
    );
    const praised = api.ensureStarPraises(pool);
    const sioCount = Object.values(praised).filter((r) => r.includes("sio")).length;
    expect(sioCount).toBe(20);
  });

  it("30 分钟缓存：二次调用不重复判定（复用首轮结果）", () => {
    // 首轮：全命中
    vi.spyOn(Math, "random").mockReturnValue(0.0);
    const pool = [makeBottle({ id: "b-cache" })];
    const first = api.ensureStarPraises(pool);
    expect(first["b-cache"]?.length ?? 0).toBeGreaterThan(0);
    // 二轮：random 全不中，但缓存期内应仍返回相同结果
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const second = api.ensureStarPraises(pool);
    expect(second).toEqual(first);
  });

  it("已看记录：同瓶同角色只记一次", () => {
    api.markStarPraiseSeen("b-1", "sio");
    api.markStarPraiseSeen("b-1", "sio");
    expect(api.isStarPraiseSeen("b-1", "sio")).toBe(true);
    expect(api.isStarPraiseSeen("b-1", "lumen")).toBe(false);
  });

  it("角色配置：4 位角色都有主持频道风格与匹配话题", () => {
    expect(STAR_PRAISE_ROLES.map((r) => r.roleId).sort()).toEqual(["lumen", "sio", "soku", "yoe"]);
    for (const r of STAR_PRAISE_ROLES) {
      expect(r.styles.length).toBeGreaterThan(0);
      expect(r.topics.length).toBeGreaterThan(0);
      expect(r.lines.length).toBeGreaterThan(0);
    }
  });
});