import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UseBoundStore, StoreApi } from "zustand";
import type { ChatState } from "@/stores/chat";

/** 对话自动总结 store 集成（Summarize）：
 * 20 条首触发 → 每满 10 条增量 → 注入 /api/chat body → 清空重置 → 刷新恢复。
 * 沿用 chat.message.test.ts 范式：mock fetch（区分 /api/chat 与 /api/chat/summarize）+ localStorage 存根。
 */

type ChatStoreApi = UseBoundStore<StoreApi<ChatState>>;

let store: ChatStoreApi;

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

/** 记录每次 /api/chat 请求体，供断言摘要注入 */
let chatBodies: Record<string, unknown>[];
/** /api/chat/summarize 的响应序列（按调用次数取） */
let summarizeResponses: (() => Response)[];

beforeEach(async () => {
  mem.clear();
  chatBodies = [];
  summarizeResponses = [];
  vi.resetModules();
  vi.stubGlobal("localStorage", localStorageMock);

  const fetchMock = vi.fn(async (...args: unknown[]) => {
    const url = args[0] as string;
    const init = args[1] as RequestInit;
    if (url.includes("/api/chat/summarize")) {
      const next = summarizeResponses.shift();
      return next ? next() : Response.json({ ok: true, summary: "" });
    }
    chatBodies.push(JSON.parse((init?.body as string) ?? "{}"));
    return sseResponse("收到～");
  });
  vi.stubGlobal("fetch", fetchMock);

  const mod = await import("@/stores/chat");
  store = mod.useChatStore as ChatStoreApi;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** 连发 n 条消息（每条产生 user + assistant 两则），等摘要提取落定 */
async function sendTimes(n: number) {
  for (let i = 0; i < n; i += 1) {
    await store.getState().send("sio", `消息${i}`);
  }
}

describe("Summarize 触发与增量", () => {
  it("消息 < 20 条不生成摘要", async () => {
    await sendTimes(9); // 18 条
    expect(store.getState().summaries.sio).toBeUndefined();
    expect(summarizeResponses.length + chatBodies.length).toBe(9); // 只有聊天请求，无 summarize 请求
  });

  it("第 20 条起触发首次摘要（covered=10），后续聊天请求携带 summary", async () => {
    summarizeResponses.push(() => Response.json({ ok: true, summary: "用户叫小明，养了一只猫叫咪咪" }));
    await sendTimes(11); // 22 条 → 触发 [0,10)

    await vi.waitFor(() => {
      expect(store.getState().summaries.sio).toEqual({
        text: "用户叫小明，养了一只猫叫咪咪",
        covered: 10,
      });
    });

    // 下一条消息的 /api/chat 请求必须带上摘要（失忆修复的关键）
    await sendTimes(1);
    await vi.waitFor(() => {
      const body = chatBodies[chatBodies.length - 1];
      expect(body).toMatchObject({
        summary: "用户叫小明，养了一只猫叫咪咪",
      });
    });
  });

  it("每满 10 条增量追加，covered 单调推进", async () => {
    summarizeResponses.push(
      () => Response.json({ ok: true, summary: "用户叫小明" }),
      () => Response.json({ ok: true, summary: "聊过考试压力；喜欢后摇音乐" }),
    );
    await sendTimes(11); // 首块 [0,10)
    await vi.waitFor(() => {
      expect(store.getState().summaries.sio.covered).toBe(10);
    });
    await sendTimes(1); // 下一条消息（未覆盖区 ≥10）即触发第二块 [10,20)

    await vi.waitFor(() => {
      expect(store.getState().summaries.sio).toEqual({
        text: "用户叫小明\n聊过考试压力；喜欢后摇音乐",
        covered: 20,
      });
    });
  });

  it("提取为空：只推进 covered，不发空摘要", async () => {
    summarizeResponses.push(() => Response.json({ ok: true, summary: "" }));
    await sendTimes(11);

    await vi.waitFor(() => {
      expect(store.getState().summaries.sio).toEqual({ text: "", covered: 10 });
    });
  });

  it("提取失败（503）：covered 不动，下次发送自动重试成功", async () => {
    summarizeResponses.push(
      () => Response.json({ error: "no-key" }, { status: 503 }),
      () => Response.json({ ok: true, summary: "用户叫小明" }),
    );
    await sendTimes(11); // 首次失败

    await vi.waitFor(() => {
      expect(store.getState().summaries.sio).toBeUndefined();
    });

    await sendTimes(1); // 重试路径
    await vi.waitFor(() => {
      expect(store.getState().summaries.sio).toEqual({
        text: "用户叫小明",
        covered: 10,
      });
    });
  });
});

describe("Summarize 生命周期", () => {
  it("清空对话：摘要同步重置并清零计数（PRD §3.3）", async () => {
    summarizeResponses.push(() => Response.json({ ok: true, summary: "用户叫小明" }));
    await sendTimes(11);
    await vi.waitFor(() => {
      expect(store.getState().summaries.sio.covered).toBe(10);
    });

    store.getState().clear("sio");
    expect(store.getState().summaries.sio).toEqual({ text: "", covered: 0 });
  });

  it("刷新恢复：restore 从 localStorage 读回摘要（PRD §2.4/验收用例 2）", async () => {
    mem.set("drift-chat-summary-sio", JSON.stringify({ text: "用户叫小明，养了一只猫", covered: 10 }));
    store.setState({ messages: {}, status: {}, summaries: {} });

    store.getState().restore("sio");
    expect(store.getState().summaries.sio).toEqual({ text: "用户叫小明，养了一只猫", covered: 10 });
  });

  it("摘要数据损坏：静默忽略，等价于无摘要（PRD 异常处理）", async () => {
    mem.set("drift-chat-summary-sio", "{broken-json");
    store.setState({ messages: {}, status: {}, summaries: {} });

    store.getState().restore("sio");
    expect(store.getState().summaries.sio).toEqual({ text: "", covered: 0 });
  });
});
