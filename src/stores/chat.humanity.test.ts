import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UseBoundStore, StoreApi } from "zustand";
import type { ChatState } from "@/stores/chat";

/** 人机感改造接线回归：情感随请求携带 / 主动反问回合节奏 / 关键记忆累积与持久化 / clear 重置 */

type ChatStoreApi = UseBoundStore<StoreApi<ChatState>>;

let store: ChatStoreApi;

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

/** 模拟 /api/chat 成功返回的 SSE 流 */
function sseResponse(content: string): Response {
  const enc = new TextEncoder();
  const payload = `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(enc.encode(payload));
      controller.enqueue(enc.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

/** 捕获最近一次 /api/chat 请求体 */
let lastBody: Record<string, unknown> = {};

beforeEach(async () => {
  mem.clear();
  lastBody = {};
  vi.resetModules();
  vi.stubGlobal("localStorage", localStorageMock);
  const fetchMock = vi.fn(async (...args: unknown[]) => {
    const url = args[0] as string;
    const init = args[1] as RequestInit;
    if (url.includes("/summarize")) return Response.json({ ok: true, summary: "" });
    lastBody = JSON.parse((init?.body as string) ?? "{}");
    return sseResponse("收到～");
  });
  vi.stubGlobal("fetch", fetchMock);
  const mod = await import("@/stores/chat");
  store = mod.useChatStore as ChatStoreApi;
});

afterEach(() => vi.unstubAllGlobals());

describe("人机感 ④ 情感状态随请求携带", () => {
  it("send 更新角色情绪，请求体携带最新情感快照", async () => {
    store.setState({ messages: { sio: [] }, status: {} });
    const res = await store.getState().send("sio", "哈哈，我今天太开心了！");
    expect(res.ok).toBe(true);
    expect(lastBody.emotion).toMatchObject({ roleId: "sio", primary: "高兴" });
    // 情绪持久化到 drift-emotion-sio
    expect(mem.get("drift-emotion-sio")).toBeTruthy();
  });
});

describe("人机感 ⑤ 主动反问回合节奏", () => {
  it("默认节奏：第 4 轮携带 initiative=true，前几轮不携带", async () => {
    store.setState({ messages: { sio: [] }, status: {} });
    const mid = "今天过得怎么样？要不要一起去听新出的那首";
    const bodies: Record<string, unknown>[] = [];
    const fetchMock = vi.fn(async (...args: unknown[]) => {
      const init = args[1] as RequestInit;
      bodies.push(JSON.parse((init?.body as string) ?? "{}"));
      return sseResponse("收到～");
    });
    vi.stubGlobal("fetch", fetchMock);

    for (let i = 0; i < 4; i += 1) {
      await store.getState().send("sio", mid);
    }
    expect(bodies[0].initiative).toBeUndefined();
    expect(bodies[3].initiative).toBe(true);
  });

  it("短回复降低频率：第 4 轮不主动，第 8 轮才主动", async () => {
    store.setState({ messages: { sio: [] }, status: {} });
    const bodies: Record<string, unknown>[] = [];
    const fetchMock = vi.fn(async (...args: unknown[]) => {
      const init = args[1] as RequestInit;
      bodies.push(JSON.parse((init?.body as string) ?? "{}"));
      return sseResponse("收到～");
    });
    vi.stubGlobal("fetch", fetchMock);

    for (let i = 0; i < 8; i += 1) {
      await store.getState().send("sio", "嗯嗯");
    }
    expect(bodies[3].initiative).toBeUndefined();
    expect(bodies[7].initiative).toBe(true);
  });
});

describe("人机感 ⑧ 关键记忆累积与持久化", () => {
  it("摘要返回关键记忆 → memories 状态累积并持久化", async () => {
    const fetchMock = vi.fn(async (...args: unknown[]) => {
      const url = args[0] as string;
      const init = args[1] as RequestInit;
      if (url.includes("/summarize")) {
        return Response.json({
          ok: true,
          summary: "用户喜欢后摇音乐",
          memories: "喜欢后摇音乐；养了一只猫",
        });
      }
      lastBody = JSON.parse((init?.body as string) ?? "{}");
      return sseResponse("收到～");
    });
    vi.stubGlobal("fetch", fetchMock);
    store.setState({ messages: { sio: [] }, status: {} });

    for (let i = 0; i < 11; i += 1) {
      await store.getState().send("sio", `消息${i}`);
    }

    await vi.waitFor(() => {
      expect(store.getState().memories.sio).toContain("喜欢后摇音乐");
    });
    // 持久化到 drift-memories-sio
    expect(mem.get("drift-memories-sio")).toContain("养了一只猫");
    // 后续聊天请求携带 memories
    await store.getState().send("sio", "消息");
    expect(lastBody.memories).toContain("喜欢后摇音乐");
  });

  it("restore 从 localStorage 恢复记忆（刷新不丢）", () => {
    mem.set("drift-memories-sio", JSON.stringify("用户养了一只猫叫团子"));
    store.setState({ messages: {}, status: {}, summaries: {}, turns: {}, memories: {} });
    store.getState().restore("sio");
    expect(store.getState().memories.sio).toBe("用户养了一只猫叫团子");
  });

  it("restore 同步恢复情绪（刷新后保持历史情绪，不重置）", async () => {
    const saved = {
      roleId: "sio",
      valence: 80,
      arousal: 70,
      primary: "高兴",
      decayRate: 0.1,
      affinity: 40,
    };
    mem.set("drift-emotion-sio", JSON.stringify(saved));
    store.setState({ messages: {}, status: {}, summaries: {}, turns: {}, memories: {} });
    store.getState().restore("sio");
    const emoMod = await import("@/stores/emotion");
    expect(emoMod.useEmotionStore.getState().emotions.sio).toEqual(saved);
  });

  it("clear 重置回合计数/记忆，并清空情感状态（全新开始）", async () => {
    store.setState({ messages: { sio: [] }, status: {} });
    await store.getState().send("sio", "哈哈好开心");
    expect(store.getState().turns.sio).toBe(1);
    expect(mem.get("drift-emotion-sio")).toBeTruthy();

    const emoMod = await import("@/stores/emotion");
    store.getState().clear("sio");

    expect(store.getState().turns.sio).toBe(0);
    expect(store.getState().memories.sio).toBe("");
    expect(emoMod.useEmotionStore.getState().emotions.sio).toBeUndefined();
    expect(mem.get("drift-emotion-sio")).toBeUndefined();
  });
});
