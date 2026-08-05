import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as lbMod from "@/lib/api/leaderboard";
import type * as anonApiMod from "@/lib/supabase/anon";
import type { Bottle, Reply, SongComment, TrackSnapshot } from "@/types/social";

/**
 * 漂流排行榜（P1 F-06）本地分支：
 * 今日热榜 24h 窗口 / 本周船客积分规则（公开×3+回信×2+感想×1+获赞×1）/
 * 星海金句累计点赞 / 旧占位符代号过滤。
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

vi.mock("@/lib/supabase/anon", () => ({ isSupabaseReady: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ getSupabase: vi.fn(() => null) }));

let api: typeof lbMod;
let anonApi: typeof anonApiMod;

const track: TrackSnapshot = { t: "信风", tag: "后摇", s: "一支你没听过的乐队", cover: "/x.png" };

const bottle = (id: string, over: Partial<Bottle> = {}): Bottle => ({
  id,
  authorId: "local-guest",
  text: "这是一艘容量足够长的测试纸船内容文字。",
  track,
  bottleStyle: "paper",
  anonMark: "薄雾水手·C9E2",
  status: "drifting",
  pickedBy: null,
  isSystem: false,
  isPublic: true,
  likedBy: [],
  createdAt: Date.now(),
  repliedAt: null,
  readAt: null,
  ...over,
});

const reply = (id: string, anonMark: string, createdAt = Date.now()): Reply => ({
  id,
  bottleId: "b",
  anonMark,
  text: "回信内容足够长以满足约束。",
  createdAt,
});

const comment = (id: string, anonMark: string, liked: string[], createdAt = Date.now()): SongComment => ({
  id,
  trackId: "t1",
  text: "感想内容足够长以满足约束字数。",
  anonMark,
  source: "direct",
  likedBy: liked,
  createdAt,
});

beforeEach(async () => {
  mem.clear();
  vi.resetModules();
  vi.stubGlobal("localStorage", localStorageMock);
  api = await import("@/lib/api/leaderboard");
  anonApi = await import("@/lib/supabase/anon");
  vi.mocked(anonApi.isSupabaseReady).mockReturnValue(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("今日热榜（24h 窗口）", () => {
  it("只取 24 小时内公开瓶，按点赞降序，旧占位符过滤", async () => {
    mem.set(
      "drift-bottles-pool",
      JSON.stringify([
        bottle("b1", { likedBy: ["a", "b", "c"] }),
        bottle("b2", { likedBy: ["x", "y"] }),
        bottle("b3", { createdAt: Date.now() - 30 * 86_400_000 }), // 30 天前：窗口外
        bottle("b4", { anonMark: "你的纸船", likedBy: ["z"] }), // 旧占位符
        bottle("b5", { isPublic: false }), // 匿名瓶
      ]),
    );
    const hot = await api.fetchHotToday();
    expect(hot.map((e) => e.bottle.id)).toEqual(["b1", "b2"]);
    expect(hot[0].likes).toBe(3);
    expect(hot[0].rank).toBe(1);
  });

  it("并列按先达到者（创建更早）在前，最多 Top10", async () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      bottle(`b${i}`, {
        likedBy: i < 2 ? ["a", "b"] : [`u${i}`],
        createdAt: Date.now() - i * 1000,
      }),
    );
    mem.set("drift-bottles-pool", JSON.stringify(many));
    const hot = await api.fetchHotToday();
    expect(hot).toHaveLength(10);
    expect(hot[0].likes).toBe(2);
    expect(hot[1].likes).toBe(2);
    expect(hot[0].bottle.createdAt).toBeLessThan(hot[1].bottle.createdAt);
  });
});

describe("本周船客（周一 00:00 起积分）", () => {
  it("公开投瓶×3 + 回信×2 + 感想×1 + 感想获赞×1", async () => {
    mem.set(
      "drift-bottles-pool",
      JSON.stringify([
        bottle("b1", { anonMark: "薄雾水手·C9E2" }), // +3
        bottle("b2", { anonMark: "薄雾水手·C9E2" }), // +3
        bottle("b3", { anonMark: "纸鹤灯塔·A1", likedBy: [] }),
        bottle("b4", {
          anonMark: "薄雾水手·C9E2",
          createdAt: Date.now() - 40 * 86_400_000,
          likedBy: [],
        }), // 本周外不算
      ]),
    );
    mem.set("drift-replies", JSON.stringify([reply("r1", "薄雾水手·C9E2")])); // +2
    mem.set(
      "drift-song-comments",
      JSON.stringify([
        comment("c1", "纸鹤灯塔·A1", ["u1", "u2"]), // +1 感想 +2 获赞 = 3
      ]),
    );
    const sailors = await api.fetchWeeklySailors();
    const top = sailors[0];
    expect(top.anonMark).toBe("薄雾水手·C9E2");
    expect(top.score).toBe(8); // 公开 b1(3) + b2(3) + 回信(2)
    expect(sailors.find((s) => s.anonMark === "纸鹤灯塔·A1")?.score).toBe(6); // 公开 b3(3) + 感想 1+获赞2(3)
  });

  it("旧占位符代号不进入周榜", async () => {
    mem.set(
      "drift-bottles-pool",
      JSON.stringify([bottle("b1", { anonMark: "你的纸船", likedBy: [] })]),
    );
    mem.set("drift-replies", JSON.stringify([reply("r1", "回信的船客")]));
    const sailors = await api.fetchWeeklySailors();
    expect(sailors).toEqual([]);
  });
});

describe("星海金句（累计点赞 Top10）", () => {
  it("不限时间窗口，按累计点赞降序", async () => {
    mem.set(
      "drift-bottles-pool",
      JSON.stringify([
        bottle("g1", { likedBy: ["a", "b", "c", "d"] }),
        bottle("g2", { createdAt: Date.now() - 30 * 86_400_000, likedBy: ["a", "b"] }),
        bottle("g3", { likedBy: ["a"], anonMark: "你的纸船" }),
      ]),
    );
    const quotes = await api.fetchGoldenQuotes();
    expect(quotes.map((e) => e.bottle.id)).toEqual(["g1", "g2"]);
    expect(quotes[0].likes).toBe(4);
  });
});