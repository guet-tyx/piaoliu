import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as socialApiMod from "@/lib/api/social";
import type * as sailorApiMod from "@/lib/api/sailor";
import type * as anonApiMod from "@/lib/supabase/anon";

/**
 * 星海关注 + 漂流广场收藏查询层（P0 F-01 / F-04）本地分支：
 * 自我关注拒绝 / 关注与收藏上限 100 / toggle 去重语义。
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

vi.mock("@/lib/api/sailor", () => ({ getOrCreateSailor: vi.fn() }));
vi.mock("@/lib/supabase/anon", () => ({ isSupabaseReady: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ getSupabase: vi.fn(() => null) }));

let api: typeof socialApiMod;
let sailorApi: typeof sailorApiMod;
let anonApi: typeof anonApiMod;

beforeEach(async () => {
  mem.clear();
  vi.resetModules();
  vi.stubGlobal("localStorage", localStorageMock);
  api = await import("@/lib/api/social");
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

describe("toggleFollow（F-04）", () => {
  it("未关注 → 关注；再次 → 取消（toggle 语义）", async () => {
    const r1 = await api.toggleFollow("薄雾水手·C9E2");
    expect(r1).toEqual({ ok: true, followed: true });
    expect(api.readFollows().map((f) => f.followedMark)).toEqual(["薄雾水手·C9E2"]);

    const r2 = await api.toggleFollow("薄雾水手·C9E2");
    expect(r2).toEqual({ ok: true, followed: false });
    expect(api.readFollows()).toEqual([]);
  });

  it("禁止自我关注", async () => {
    const r = await api.toggleFollow("晚风船客·A7F3");
    expect(r).toEqual({ ok: false, reason: "self" });
    expect(api.readFollows()).toEqual([]);
  });

  it("关注上限 100，超出拒绝", async () => {
    for (let i = 0; i < 100; i++) {
      const r = await api.toggleFollow(`船客·${i.toString(36)}`);
      expect(r.ok).toBe(true);
    }
    const r = await api.toggleFollow("船客·OVER");
    expect(r).toEqual({ ok: false, reason: "limit" });
    expect(api.readFollows()).toHaveLength(100);
  });
});

describe("toggleBookmark（F-01）", () => {
  it("收藏/取消（toggle 语义）", async () => {
    const r1 = await api.toggleBookmark("b1");
    expect(r1).toEqual({ ok: true, bookmarked: true });
    expect(api.readBookmarks()).toEqual(["b1"]);

    const r2 = await api.toggleBookmark("b1");
    expect(r2).toEqual({ ok: true, bookmarked: false });
    expect(api.readBookmarks()).toEqual([]);
  });

  it("收藏上限 100，超出拒绝", async () => {
    for (let i = 0; i < 100; i++) await api.toggleBookmark(`b${i}`);
    const r = await api.toggleBookmark("b-over");
    expect(r).toEqual({ ok: false, reason: "limit" });
  });
});
