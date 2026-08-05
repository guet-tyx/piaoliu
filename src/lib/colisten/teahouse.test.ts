import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as teahouseMod from "@/lib/colisten/teahouse";
import type * as sailorApi from "@/lib/api/sailor";
import type * as anonApi from "@/lib/supabase/anon";

/**
 * P3 A-02 星海茶话会调度（本地分支）：
 * 排期窗口（周三/五/六/日 22:00-00:00）/ 固定房间 id（按自然周）/ 歌单规模 / 惰性建房幂等。
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

let api: typeof teahouseMod;
let anon: typeof anonApi;
let sailor: typeof sailorApi;

/** 构造本周某天的 22:15（本地时间） */
const at = (weekday: number, hour = 22, minute = 15): Date => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  const diff = weekday - d.getDay();
  d.setDate(d.getDate() + diff);
  return d;
};

beforeEach(async () => {
  mem.clear();
  vi.resetModules();
  vi.stubGlobal("localStorage", localStorageMock);
  api = await import("@/lib/colisten/teahouse");
  anon = await import("@/lib/supabase/anon");
  sailor = await import("@/lib/api/sailor");
  vi.mocked(anon.isSupabaseReady).mockReturnValue(false);
  vi.mocked(sailor.getOrCreateSailor).mockResolvedValue({
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

describe("茶话会排期窗口（getTeahouseFor）", () => {
  it("周五 22:15 → 汐主持；房间 id 固定 chat-party-{自然周}", () => {
    const info = api.getTeahouseFor(at(5));
    expect(info).not.toBeNull();
    expect(info!.roleId).toBe("sio");
    expect(info!.roleName).toBe("汐");
    expect(info!.roomId).toMatch(/^chat-party-\d+$/);
  });

  it("周六 → 朔空 / 周三 → 流明 / 周日 → 悠", () => {
    expect(api.getTeahouseFor(at(6))!.roleId).toBe("soku");
    expect(api.getTeahouseFor(at(3))!.roleId).toBe("lumen");
    expect(api.getTeahouseFor(at(0))!.roleId).toBe("yoe");
  });

  it("窗口外返回 null：非主持日 / 22:00 前 / 次日 00:00 后", () => {
    expect(api.getTeahouseFor(at(1))).toBeNull(); // 周一
    expect(api.getTeahouseFor(at(5, 21, 59))).toBeNull(); // 21:59
    expect(api.getTeahouseFor(at(5, 23, 59))).not.toBeNull(); // 23:59 仍在
    expect(api.getTeahouseFor(at(6, 0, 1))).toBeNull(); // 周六 00:01（周五场已散）
  });

  it("同一自然周内房间 id 稳定", () => {
    expect(api.getTeahouseFor(at(5))!.roomId).toBe(api.getTeahouseFor(at(5, 22, 40))!.roomId);
  });
});

describe("茶话会歌单与建房（ensureTeahouseRoom）", () => {
  it("歌单以主持频道曲目为主，规模 15-20 首", () => {
    const playlist = api.buildTeahousePlaylist("sio");
    expect(playlist.length).toBeGreaterThanOrEqual(15);
    expect(playlist.length).toBeLessThanOrEqual(20);
    // 汐主持深夜频道：歌单应包含频道池曲目
    expect(playlist.some((t) => t.t === "信风")).toBe(true);
  });

  it("惰性建房幂等：首次创建 AI 主持房间，再次调用复用", async () => {
    const info = api.getTeahouseFor(at(5))!;
    const first = await api.ensureTeahouseRoom(info);
    const second = await api.ensureTeahouseRoom(info);
    expect(first).not.toBeNull();
    expect(second!.id).toBe(first!.id);
    expect(first!.hostId).toBe("ghost-host");
    expect(first!.hostRole).toBe("sio");
    expect(first!.title).toContain("汐");
    expect(first!.ghosts?.length).toBeGreaterThan(0);
    expect(api.isTeahouseRoom(first!)).toBe(true);
  });

  it("普通房间（hostId 为用户 peer）不是茶话会房间", () => {
    expect(
      api.isTeahouseRoom({ hostId: "p-abc123" } as never),
    ).toBe(false);
  });
});