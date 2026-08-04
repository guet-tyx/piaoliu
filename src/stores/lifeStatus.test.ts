import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UseBoundStore, StoreApi } from "zustand";
import type { LifeStatusStore } from "@/stores/lifeStatus";

/** 角色生活状态 store 测试（PRD 需求③）：
 * localStorage 存根 + resetModules 范式（照 chat.summary.test.ts）。
 */

type StoreApiT = UseBoundStore<StoreApi<LifeStatusStore>>;

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

let store: StoreApiT;

beforeEach(async () => {
  mem.clear();
  vi.resetModules();
  vi.stubGlobal("localStorage", localStorageMock);
  const mod = await import("@/stores/lifeStatus");
  store = mod.useLifeStatusStore as StoreApiT;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("restore 恢复与兜底", () => {
  it("无记录：随机生成一条并落盘", () => {
    store.getState().restore("sio");
    const s = store.getState().byRole.sio;
    expect(s).toBeTruthy();
    expect(s.key).toBeTruthy();
    expect(s.icon).toBeTruthy();
    expect(typeof s.at).toBe("number");
    // 已写入 localStorage（key=drift-life-status-sio）
    expect(mem.has("drift-life-status-sio")).toBe(true);
  });

  it("有记录：恢复上次状态（刷新后记忆）", () => {
    mem.set(
      "drift-life-status-sio",
      JSON.stringify({ key: "sio-listen", icon: "🎧", text: "正在听歌", at: 123456 }),
    );
    store.getState().restore("sio");
    expect(store.getState().byRole.sio).toEqual({
      key: "sio-listen",
      icon: "🎧",
      text: "正在听歌",
      at: 123456,
    });
  });

  it("数据损坏：静默忽略并随机兜底", () => {
    mem.set("drift-life-status-sio", "{broken-json");
    store.getState().restore("sio");
    expect(store.getState().byRole.sio).toBeTruthy();
  });

  it("幂等：已初始化不再覆盖", () => {
    store.getState().restore("sio");
    const first = store.getState().byRole.sio;
    store.getState().restore("sio");
    expect(store.getState().byRole.sio).toEqual(first);
  });

  it("每角色独立 key 互不影响", () => {
    mem.set(
      "drift-life-status-lumen",
      JSON.stringify({ key: "lumen-book", icon: "📖", text: "翻着一本旧书", at: 1 }),
    );
    store.getState().restore("sio");
    store.getState().restore("lumen");
    expect(store.getState().byRole.sio.key).toBeTruthy();
    expect(store.getState().byRole.lumen.key).toBe("lumen-book");
  });
});

describe("setStatus / setJustBack", () => {
  it("setStatus 更新并持久化", () => {
    store.getState().setStatus("sio", { key: "sio-tea", icon: "☕", text: "泡了杯茶" }, 999);
    expect(store.getState().byRole.sio).toEqual({
      key: "sio-tea",
      icon: "☕",
      text: "泡了杯茶",
      at: 999,
    });
    expect(JSON.parse(mem.get("drift-life-status-sio") ?? "{}")).toMatchObject({
      key: "sio-tea",
      text: "泡了杯茶",
    });
  });

  it("setJustBack 设置/清除标记", () => {
    store.getState().setJustBack("sio", true);
    expect(store.getState().justBackByRole.sio).toBe(true);
    store.getState().setJustBack("sio", false);
    expect(store.getState().justBackByRole.sio).toBe(false);
  });
});
