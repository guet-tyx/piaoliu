import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as bottleMod from "@/stores/bottle";
import type * as bottleApiMod from "@/lib/api/bottles";
import type { Bottle, DailyLimits, Reply, TrackSnapshot } from "@/types/social";

/**
 * 纸船漂流 store 核心路径（V2.7 补测）：
 * lib/api/bottles mock，聚焦 launch/pick/reply/markRead + busy 防连点 + limits 刷新。
 */

vi.mock("@/lib/api/bottles", () => ({
  fetchInbox: vi.fn(),
  getDailyLimits: vi.fn(),
  launchBottle: vi.fn(),
  markInboxRead: vi.fn(),
  pickBottle: vi.fn(),
  replyBottle: vi.fn(),
}));

type BottleStoreApi = typeof bottleMod.useBottleStore;

let store: BottleStoreApi;
let api: typeof bottleApiMod;

const track: TrackSnapshot = { t: "信风", tag: "后摇", s: "一支你没听过的乐队", cover: "/x.png" };

const bottle = (id: string, over: Partial<Bottle> = {}): Bottle => ({
  id,
  authorId: "a1",
  text: "这是一艘测试纸船的内容",
  track,
  bottleStyle: "paper",
  anonMark: "匿名",
  status: "drifting",
  pickedBy: null,
  isSystem: false,
  isPublic: false,
  likedBy: [],
  createdAt: 1,
  repliedAt: null,
  readAt: null,
  ...over,
});

const reply = (id: string, bottleId: string): Reply => ({
  id,
  bottleId,
  anonMark: "回信的船客",
  text: "回信内容",
  createdAt: 2,
});

const limits = (over: Partial<DailyLimits> = {}): DailyLimits => ({
  date: "2026-08-04",
  launched: 0,
  picked: 0,
  ...over,
});

beforeEach(async () => {
  vi.resetModules();
  api = await import("@/lib/api/bottles");
  vi.clearAllMocks(); // 清除上一用例的调用记录（vi.mock 实例跨 resetModules 复用）
  vi.mocked(api.getDailyLimits).mockResolvedValue(limits());
  vi.mocked(api.fetchInbox).mockResolvedValue([]);
  const mod = await import("@/stores/bottle");
  store = mod.useBottleStore as BottleStoreApi;
});

afterEach(() => vi.unstubAllGlobals());

describe("refreshInbox", () => {
  it("设置收件箱并按未读计数", async () => {
    vi.mocked(api.fetchInbox).mockResolvedValue([
      { bottle: bottle("b1", { readAt: null }), replies: [] },
      { bottle: bottle("b2", { readAt: 9 }), replies: [reply("r1", "b2")] },
      { bottle: bottle("b3", { readAt: null }), replies: [] },
    ]);
    await store.getState().refreshInbox();
    expect(store.getState().inbox).toHaveLength(3);
    expect(store.getState().unreadCount).toBe(2);
  });
});

describe("launch（投瓶）", () => {
  it("成功：返回结果、刷新限额、busy 释放", async () => {
    vi.mocked(api.launchBottle).mockResolvedValue({ ok: true, bottle: bottle("nb1") });
    vi.mocked(api.getDailyLimits).mockResolvedValue(limits({ launched: 1 }));
    const r = await store.getState().launch("这是一段足够长的瓶子内容", track, "paper");
    expect(r.ok).toBe(true);
    expect(store.getState().limits.launched).toBe(1);
    expect(store.getState().busy).toBe(false);
  });

  it("失败（limit）：返回原因、busy 释放", async () => {
    vi.mocked(api.launchBottle).mockResolvedValue({ ok: false, reason: "limit" });
    const r = await store.getState().launch("这是一段足够长的瓶子内容", track);
    expect(r).toEqual({ ok: false, reason: "limit" });
    expect(store.getState().busy).toBe(false);
  });

  it("busy 时防连点：直接返回 limit 且不调用底层", async () => {
    store.setState({ busy: true });
    const r = await store.getState().launch("这是一段足够长的瓶子内容", track);
    expect(r).toEqual({ ok: false, reason: "limit" });
    expect(api.launchBottle).not.toHaveBeenCalled();
  });
});

describe("pick（拾瓶）", () => {
  it("成功：返回瓶子并刷新限额", async () => {
    vi.mocked(api.pickBottle).mockResolvedValue({ ok: true, bottle: bottle("p1") });
    vi.mocked(api.getDailyLimits).mockResolvedValue(limits({ picked: 1 }));
    const r = await store.getState().pick();
    expect(r.ok).toBe(true);
    expect(store.getState().limits.picked).toBe(1);
    expect(store.getState().busy).toBe(false);
  });
});

describe("reply（回信）", () => {
  it("成功后刷新收件箱", async () => {
    vi.mocked(api.replyBottle).mockResolvedValue({ ok: true, reply: reply("r2", "b1") });
    vi.mocked(api.fetchInbox).mockResolvedValue([]);
    await store.getState().reply("b1", "这是一段回信内容");
    expect(api.fetchInbox).toHaveBeenCalled();
  });
});

describe("markRead", () => {
  it("标记已读并递减未读数", async () => {
    vi.mocked(api.fetchInbox).mockResolvedValue([
      { bottle: bottle("b1", { readAt: null }), replies: [] },
      { bottle: bottle("b2", { readAt: null }), replies: [] },
    ]);
    await store.getState().refreshInbox();
    expect(store.getState().unreadCount).toBe(2);
    await store.getState().markRead("b1");
    expect(store.getState().unreadCount).toBe(1);
    expect(store.getState().inbox[0].bottle.readAt).not.toBeNull();
  });
});
