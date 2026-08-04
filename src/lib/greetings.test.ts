import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readRecentGreetings, rememberGreeting, lastMessageAtOf } from "@/lib/greetings";

/** 开场白 localStorage 助手测试（node 环境 stub 范式照 chat.summary.test.ts） */

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readRecentGreetings / rememberGreeting（连续 3 次不出现相同）", () => {
  it("初始为空数组", () => {
    expect(readRecentGreetings("sio")).toEqual([]);
  });

  it("记住后读回，保留最近 2 条", () => {
    rememberGreeting("sio", "sio:default:0");
    rememberGreeting("sio", "sio:night:1");
    rememberGreeting("sio", "sio:channel:ch-night:0");
    expect(readRecentGreetings("sio")).toEqual(["sio:night:1", "sio:channel:ch-night:0"]);
  });

  it("每角色独立 key 互不影响", () => {
    rememberGreeting("sio", "sio:default:0");
    expect(readRecentGreetings("lumen")).toEqual([]);
  });

  it("数据损坏返回空数组（静默兜底）", () => {
    mem.set("drift-chat-greeting-sio", "{broken-json");
    expect(readRecentGreetings("sio")).toEqual([]);
  });
});

describe("lastMessageAtOf（久别重逢判定依据）", () => {
  it("读到最后一条消息的 at", () => {
    mem.set(
      "drift-chat-sio",
      JSON.stringify([
        { id: "a", role: "user", text: "hi", at: 100 },
        { id: "b", role: "assistant", text: "hello", at: 200 },
      ]),
    );
    expect(lastMessageAtOf("sio")).toBe(200);
  });

  it("无记录 / 空数组 / 损坏 → null（不触发久别重逢）", () => {
    expect(lastMessageAtOf("sio")).toBeNull();
    mem.set("drift-chat-sio", "[]");
    expect(lastMessageAtOf("sio")).toBeNull();
    mem.set("drift-chat-sio", "{oops");
    expect(lastMessageAtOf("sio")).toBeNull();
  });
});
