import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as identityMod from "@/stores/identity";
import type * as sailorApiMod from "@/lib/api/sailor";
import type * as anonApiMod from "@/lib/supabase/anon";
import { SHIO_RESPONSES } from "@/data/shio-lines";
import type { Sailor } from "@/types/social";

/**
 * 身份 store 核心路径（V2.7 补测）：
 * sailor 查询层 mock，聚焦 respond 去重 / noteAction 首次投瓶 / rename / bond 里程碑 / claim。
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
  bumpStat: vi.fn(),
  checkBadges: vi.fn(),
  claimRecoveryCode: vi.fn(),
  earnBond: vi.fn(),
  genRecoveryCode: vi.fn(),
  getLocalSailorSync: vi.fn(),
  getOrCreateSailor: vi.fn(),
  pushListen: vi.fn(),
  resetListenStreak: vi.fn(),
  updateNickname: vi.fn(),
}));
vi.mock("@/lib/supabase/anon", () => ({
  ensureAnonSession: vi.fn(),
  isSupabaseReady: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ getSupabase: vi.fn(() => null) }));

type IdentityStoreApi = typeof identityMod.useIdentityStore;

let store: IdentityStoreApi;
let sailorApi: typeof sailorApiMod;
let anonApi: typeof anonApiMod;

/** 最小船员证 */
const sailor = (over: Partial<Sailor> = {}): Sailor => ({
  id: "g1",
  anonMark: "星尘船客",
  bottleStyle: "paper",
  nickname: null,
  bondValue: 0,
  level: 1,
  badges: [],
  createdAt: 1,
  ...over,
});

beforeEach(async () => {
  mem.clear();
  vi.resetModules();
  vi.stubGlobal("localStorage", localStorageMock);
  sailorApi = await import("@/lib/api/sailor");
  anonApi = await import("@/lib/supabase/anon");

  vi.mocked(anonApi.isSupabaseReady).mockReturnValue(false);
  vi.mocked(anonApi.ensureAnonSession).mockResolvedValue(() => {});
  vi.mocked(sailorApi.getLocalSailorSync).mockReturnValue(null);
  vi.mocked(sailorApi.bumpStat).mockReturnValue({
    launched: 0, picked: 0, replied: 0, listenStreak: 0, maxListenStreak: 0,
    trackCounts: {}, listenByDay: {}, updatedAt: 1,
  });
  vi.mocked(sailorApi.checkBadges).mockReturnValue([]);

  const mod = await import("@/stores/identity");
  store = mod.useIdentityStore as IdentityStoreApi;
});

afterEach(() => vi.unstubAllGlobals());

describe("respond（汐行为回应，同类 7 天不重复）", () => {
  it("从对应词池选句并记录去重记录", () => {
    store.getState().respond("listen3");
    const resp = store.getState().response;
    expect(resp).not.toBeNull();
    expect(SHIO_RESPONSES.listen3.some((l) => l.id === resp!.line.id)).toBe(true);

    const saved = JSON.parse(mem.get("drift-responses-recent") ?? "[]") as { kind: string }[];
    expect(saved).toHaveLength(1);
    expect(saved[0].kind).toBe("listen3");
  });

  it("预置最近记录后同类选句避开（7 天去重）", () => {
    const first = SHIO_RESPONSES.listen3[0];
    mem.set(
      "drift-responses-recent",
      JSON.stringify([{ kind: "listen3", lineId: first.id, at: Date.now() }]),
    );
    store.getState().respond("listen3");
    expect(store.getState().response!.line.id).not.toBe(first.id);
  });
});

describe("noteAction（行为计数 + 首次投瓶回应）", () => {
  it("首次投瓶（launched=1）触发 first-launch 回应", () => {
    store.setState({ sailor: sailor() });
    vi.mocked(sailorApi.bumpStat).mockReturnValue({
      launched: 1, picked: 0, replied: 0, listenStreak: 0, maxListenStreak: 0,
      trackCounts: {}, listenByDay: {}, updatedAt: 1,
    });
    store.getState().noteAction("launched");
    const resp = store.getState().response;
    expect(SHIO_RESPONSES["first-launch"].some((l) => l.id === resp!.line.id)).toBe(true);
  });

  it("非首次投瓶不触发 first-launch 回应", () => {
    store.setState({ sailor: sailor() });
    vi.mocked(sailorApi.bumpStat).mockReturnValue({
      launched: 2, picked: 0, replied: 0, listenStreak: 0, maxListenStreak: 0,
      trackCounts: {}, listenByDay: {}, updatedAt: 1,
    });
    store.getState().noteAction("launched");
    expect(store.getState().response).toBeNull();
  });
});

describe("rename", () => {
  it("成功更新船员证与称号", async () => {
    vi.mocked(sailorApi.updateNickname).mockResolvedValue({
      ok: true,
      sailor: sailor({ nickname: "小明", bondValue: 5 }),
    });
    store.setState({ sailor: null });
    const ok = await store.getState().rename("小明");
    expect(ok).toBe(true);
    expect(store.getState().sailor?.nickname).toBe("小明");
  });

  it("失败（bad-word）返回 false 不改状态", async () => {
    vi.mocked(sailorApi.updateNickname).mockResolvedValue({ ok: false, reason: "bad-word" });
    store.setState({ sailor: sailor() });
    const ok = await store.getState().rename("敏感词");
    expect(ok).toBe(false);
    expect(store.getState().sailor?.nickname).toBeNull();
  });
});

describe("bond（羁绊里程碑）", () => {
  it("羁绊值跨过 10 触发 bond-10 回应（BOND_MILESTONE_KINDS）", async () => {
    store.setState({ sailor: sailor({ bondValue: 9 }) });
    vi.mocked(sailorApi.earnBond).mockResolvedValue(sailor({ bondValue: 10, level: 2 }));
    await store.getState().bond("launch");
    const resp = store.getState().response;
    expect(SHIO_RESPONSES["bond-10"].some((l) => l.id === resp!.line.id)).toBe(true);
  });

  it("未跨过里程碑不触发回应", async () => {
    store.setState({ sailor: sailor({ bondValue: 9 }) });
    vi.mocked(sailorApi.earnBond).mockResolvedValue(sailor({ bondValue: 9 }));
    await store.getState().bond("launch");
    expect(store.getState().response).toBeNull();
  });
});

describe("claim（找回码恢复）", () => {
  it("成功恢复船员证", async () => {
    vi.mocked(sailorApi.claimRecoveryCode).mockResolvedValue({
      ok: true,
      sailor: sailor({ nickname: "老船客" }),
    });
    const ok = await store.getState().claim("abc-def");
    expect(ok).toBe(true);
    expect(store.getState().sailor?.nickname).toBe("老船客");
  });

  it("无效码返回 false", async () => {
    vi.mocked(sailorApi.claimRecoveryCode).mockResolvedValue({ ok: false, reason: "invalid" });
    const ok = await store.getState().claim("nope-xx");
    expect(ok).toBe(false);
  });
});
