import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as bottlesMod from "@/lib/api/bottles";
import type * as sailorApiMod from "@/lib/api/sailor";
import type * as anonApiMod from "@/lib/supabase/anon";
import type { TrackSnapshot } from "@/types/social";

/**
 * 漂流广场查询层本地分支（P0 F-01）：
 * 旧数据兜底（isPublic/likedBy 补默认）/ 公开流过滤 / 点赞按 anonMark 去重 / 投瓶公开透传。
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

vi.mock("@/lib/api/sailor", () => ({
  getOrCreateSailor: vi.fn(),
  GUEST_ID: "local-guest",
  SYSTEM_ID: "system",
}));
vi.mock("@/lib/supabase/anon", () => ({ isSupabaseReady: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ getSupabase: vi.fn(() => null) }));

let api: typeof bottlesMod;
let sailorApi: typeof sailorApiMod;
let anonApi: typeof anonApiMod;

const track: TrackSnapshot = { t: "信风", tag: "后摇", s: "一支你没听过的乐队", cover: "/x.png" };

/** 旧版瓶子（无 isPublic/likedBy，模拟历史 localStorage 数据） */
const legacyBottle = (id: string, isPublic?: boolean): Record<string, unknown> => ({
  id,
  authorId: "local-guest",
  text: "这是一艘测试纸船的内容",
  track,
  bottleStyle: "paper",
  anonMark: "晚风船客·A7F3",
  status: "drifting",
  pickedBy: null,
  isSystem: false,
  createdAt: Date.now(),
  repliedAt: null,
  readAt: null,
  ...(isPublic !== undefined ? { isPublic } : {}),
});

beforeEach(async () => {
  mem.clear();
  vi.resetModules();
  vi.stubGlobal("localStorage", localStorageMock);
  api = await import("@/lib/api/bottles");
  sailorApi = await import("@/lib/api/sailor");
  anonApi = await import("@/lib/supabase/anon");

  vi.mocked(anonApi.isSupabaseReady).mockReturnValue(false);
  vi.mocked(sailorApi.getOrCreateSailor).mockResolvedValue({
    id: "g1",
    anonMark: "晚风船客·A7F3",
    bottleStyle: "paper",
    nickname: null,
    bondValue: 0,
    level: 1,
    badges: [],
    createdAt: 1,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readPool 旧数据兜底", () => {
  it("无 isPublic/likedBy 的历史瓶自动补默认值", () => {
    mem.set("drift-bottles-pool", JSON.stringify([legacyBottle("old-1")]));
    const pool = api.readPool();
    expect(pool[0].isPublic).toBe(false);
    expect(pool[0].likedBy).toEqual([]);
  });

  it("保留已存在的新字段不被覆盖", () => {
    mem.set(
      "drift-bottles-pool",
      JSON.stringify([{ ...legacyBottle("new-1"), isPublic: true, likedBy: ["A"] }]),
    );
    const pool = api.readPool();
    expect(pool[0].isPublic).toBe(true);
    expect(pool[0].likedBy).toEqual(["A"]);
  });
});

describe("fetchPublicBottles 公开流", () => {
  it("只返回 isPublic=true 的瓶子（匿名瓶不进入广场）", async () => {
    mem.set(
      "drift-bottles-pool",
      JSON.stringify([
        { ...legacyBottle("pub-1"), isPublic: true, likedBy: [] },
        legacyBottle("priv-1"),
      ]),
    );
    const list = await api.fetchPublicBottles();
    expect(list.map((b) => b.id)).toEqual(["pub-1"]);
  });
});

describe("launchBottle 公开透传", () => {
  it("isPublic=true 时瓶子写入公开标记", async () => {
    const r = await api.launchBottle("这是一艘要进广场的公开纸船内容", track, "paper", true);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bottle.isPublic).toBe(true);
    expect(r.bottle.likedBy).toEqual([]);
  });

  it("默认匿名（isPublic=false）", async () => {
    const r = await api.launchBottle("这是一艘默认匿名的纸船内容哦", track);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bottle.isPublic).toBe(false);
  });

  it("投瓶冻结当前船客昵称（广场展示用；未设置时 null）", async () => {
    vi.mocked(sailorApi.getOrCreateSailor).mockResolvedValueOnce({
      id: "g1",
      anonMark: "晚风船客·A7F3",
      nickname: "晚风",
      bottleStyle: "paper",
      bondValue: 0,
      level: 1,
      badges: [],
      createdAt: 1,
    });
    const r = await api.launchBottle("这是一艘带着昵称出航的纸船内容哦", track);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bottle.nickname).toBe("晚风");
    expect(r.bottle.anonMark).toBe("晚风船客·A7F3");
  });
});

describe("toggleBottleLike 点赞去重", () => {
  const seed = () =>
    mem.set(
      "drift-bottles-pool",
      JSON.stringify([{ ...legacyBottle("b1"), isPublic: true, likedBy: [] }]),
    );

  it("点赞 → likedBy 追加当前 anonMark；再点取消", async () => {
    seed();
    const r1 = await api.toggleBottleLike("b1");
    expect(r1).toEqual({ ok: true, liked: true });
    const pool1 = api.readPool();
    expect(pool1.find((b) => b.id === "b1")?.likedBy).toEqual(["晚风船客·A7F3"]);

    const r2 = await api.toggleBottleLike("b1");
    expect(r2).toEqual({ ok: true, liked: false });
    expect(api.readPool().find((b) => b.id === "b1")?.likedBy).toEqual([]);
  });

  it("同一用户重复点赞不重复计数（去重）", async () => {
    mem.set(
      "drift-bottles-pool",
      JSON.stringify([
        { ...legacyBottle("b1"), isPublic: true, likedBy: ["其他船客·X", "晚风船客·A7F3"] },
      ]),
    );
    const r = await api.toggleBottleLike("b1");
    expect(r).toEqual({ ok: true, liked: false });
    expect(api.readPool().find((b) => b.id === "b1")?.likedBy).toEqual(["其他船客·X"]);
  });
});
