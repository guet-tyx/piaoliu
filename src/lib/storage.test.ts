import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  chatGreetingKey,
  chatKey,
  chatSummaryKey,
  greetingKey,
  lifeStatusKey,
  readStorage,
  roleKey,
  STORAGE,
  writeStorage,
} from "./storage";

/** localStorage 内存存根（node 测试环境无原生 localStorage） */
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

beforeEach(() => {
  mem.clear();
  vi.stubGlobal("localStorage", localStorageMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("readStorage", () => {
  it("缺失键返回 fallback", () => {
    expect(readStorage("nope", [])).toEqual([]);
    expect(readStorage<number | null>("nope", null)).toBeNull();
  });

  it("有效 JSON 返回解析值", () => {
    mem.set("k", JSON.stringify({ a: 1 }));
    expect(readStorage<{ a: number }>("k", null)).toEqual({ a: 1 });
  });

  it("损坏 JSON 返回 fallback", () => {
    mem.set("k", "{broken-json");
    expect(readStorage("k", [])).toEqual([]);
  });

  it("guard 校验不通过返回 fallback（缺字段视为损坏）", () => {
    mem.set("k", JSON.stringify({ text: "x" })); // 缺 covered
    const guard = (v: unknown): boolean => {
      const s = v as { text?: unknown; covered?: unknown };
      return typeof s?.text === "string" && typeof s?.covered === "number";
    };
    expect(readStorage("k", null, guard)).toBeNull();
    mem.set("k", JSON.stringify({ text: "x", covered: 2 }));
    expect(readStorage("k", null, guard)).toEqual({ text: "x", covered: 2 });
  });
});

describe("writeStorage", () => {
  it("写入 JSON 序列化", () => {
    writeStorage("k", { a: 1 });
    expect(mem.get("k")).toBe('{"a":1}');
  });

  it("localStorage 抛错时静默忽略（隐私模式/配额超限）", () => {
    vi.stubGlobal(
      "localStorage",
      { setItem: () => void new Error("quota exceeded") } as unknown as Storage,
    );
    expect(() => writeStorage("k", { a: 1 })).not.toThrow();
  });
});

describe("键注册表", () => {
  it("每角色键构造器", () => {
    expect(roleKey("drift-chat", "sio")).toBe("drift-chat-sio");
    expect(chatKey("lumen")).toBe("drift-chat-lumen");
    expect(chatSummaryKey("soku")).toBe("drift-chat-summary-soku");
    expect(lifeStatusKey("yoe")).toBe("drift-life-status-yoe");
    expect(greetingKey("sio")).toBe("drift-greeting-sio");
    expect(chatGreetingKey("sio")).toBe("drift-chat-greeting-sio");
  });

  it("STORAGE 覆盖全部 drift-* 键（新增键须登记于此）", () => {
    for (const value of Object.values(STORAGE)) {
      expect(value).toMatch(/^drift-/);
    }
  });
});
