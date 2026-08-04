import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UseBoundStore, StoreApi } from "zustand";
import type { ChatState } from "@/stores/chat";
import type { ChatMessage } from "@/types/chat";
import { MAX_STORED_MESSAGES } from "@/lib/chat/limits";

/** V2.7 健壮性回归：存储上限裁剪 + 流中途读取失败以部分文本收尾（不二次插入） */

type ChatStoreApi = UseBoundStore<StoreApi<ChatState>>;

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

/** 普通 SSE 响应（一次给出完整文本 + [DONE]） */
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

/** 先给出一段文本、随后读流报错的响应（模拟流中途断线；pull 计数器：第一块正常、第二次 pull 报错） */
function partialThenErrorStream(first: string): Response {
  const enc = new TextEncoder();
  const payload = `data: ${JSON.stringify({ choices: [{ delta: { content: first } }] })}\n\n`;
  let n = 0;
  const stream = new ReadableStream({
    pull(controller) {
      n += 1;
      if (n === 1) controller.enqueue(enc.encode(payload));
      else controller.error(new Error("stream-boom"));
    },
  });
  return new Response(stream, { status: 200 });
}

let store: ChatStoreApi;

beforeEach(async () => {
  mem.clear();
  vi.resetModules();
  vi.stubGlobal("localStorage", localStorageMock);
  const mod = await import("@/stores/chat");
  store = mod.useChatStore as ChatStoreApi;
});

afterEach(() => vi.unstubAllGlobals());

describe("存储上限（MAX_STORED_MESSAGES 裁剪最旧消息）", () => {
  it("消息数组超过上限时裁剪，新消息保留", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse("好")));
    const base: ChatMessage[] = Array.from({ length: MAX_STORED_MESSAGES }, (_, i) => ({
      id: `old-${i}`,
      role: "user",
      text: `旧消息${i}`,
      at: i,
    }));
    store.setState({ messages: { sio: base }, status: {} });

    await store.getState().send("sio", "新消息");

    const msgs = store.getState().messages.sio;
    expect(msgs.length).toBeLessThanOrEqual(MAX_STORED_MESSAGES);
    expect(msgs.some((m) => m.text === "新消息")).toBe(true);
    expect(msgs.some((m) => m.text === "旧消息0")).toBe(false); // 最旧被裁剪
    // localStorage 同步裁剪（不超限）
    const saved = JSON.parse(mem.get("drift-chat-sio") ?? "[]") as ChatMessage[];
    expect(saved.length).toBeLessThanOrEqual(MAX_STORED_MESSAGES);
  });
});

describe("流中途读取失败（部分文本收尾）", () => {
  it("以已收到文本 finalize，不降级本地、无重复草稿", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => partialThenErrorStream("部分回复")));
    store.setState({ messages: { sio: [] }, status: {} });

    const res = await store.getState().send("sio", "你好");

    expect(res).toEqual({ ok: true, degraded: false });
    const msgs = store.getState().messages.sio;
    expect(msgs).toHaveLength(2); // user + 部分 AI 回复（无本地二次插入）
    expect(msgs[1].text).toBe("部分回复");
    expect(store.getState().status.sio).toBe("idle");
  });
});
