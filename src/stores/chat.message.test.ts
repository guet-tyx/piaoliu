import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UseBoundStore, StoreApi } from "zustand";
import type { ChatMessage } from "@/types/chat";
import type { ChatState } from "@/stores/chat";

/** R4 消息操作冒烟（验收 #4/#7/#8/#10：编辑清后续 / 重试替换并保留后续 / 删除不动他消息） */

type ChatStoreApi = UseBoundStore<StoreApi<ChatState>>;

let store: ChatStoreApi;

/** 组装一条消息 */
const msg = (id: string, role: "user" | "assistant", text: string): ChatMessage => ({
  id,
  role,
  text,
  at: 0,
});

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

beforeEach(async () => {
  vi.resetModules();
  const mod = await import("@/stores/chat");
  store = mod.useChatStore as ChatStoreApi;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("editMessage（验收 #4 保存清后续 / #5 不改他消息）", () => {
  it("更新被编辑消息的 text/at，并清除其后所有消息", () => {
    const u1 = msg("u1", "user", "原来");
    const a1 = msg("a1", "assistant", "回复");
    const u2 = msg("u2", "user", "后续");
    store.setState({ messages: { sio: [u1, a1, u2] }, status: {} });

    const res = store.getState().editMessage("sio", "u1", "修改后");
    expect(res).toEqual({ cleared: true });
    const msgs = store.getState().messages.sio;
    expect(msgs).toHaveLength(1);
    expect(msgs[0].text).toBe("修改后");
    expect(msgs[0].at).toBeGreaterThanOrEqual(u1.at);
  });

  it("编辑最后一条时不返回 cleared", async () => {
    store.setState({
      messages: { sio: [msg("u1", "user", "唯一")] },
    });
    const res = store.getState().editMessage("sio", "u1", "改了");
    expect(res).toEqual({ cleared: false });
    expect(store.getState().messages.sio[0].text).toBe("改了");
  });

  it("非法目标返回 null（AI 消息 / 空文本 / 超长）", async () => {
    const a1 = msg("a1", "assistant", "AI 回复");
    store.setState({ messages: { sio: [a1] } });
    expect(store.getState().editMessage("sio", "a1", "改")).toBeNull();
    expect(store.getState().editMessage("sio", "a1", "")).toBeNull();
    expect(store.getState().editMessage("sio", "a1", "x".repeat(201))).toBeNull();
  });
});

describe("deleteMessage（验收 #10 删除不动其他消息）", () => {
  it("移除目标消息，其余消息顺序不变", async () => {
    const u1 = msg("u1", "user", "A");
    const a1 = msg("a1", "assistant", "B");
    const u2 = msg("u2", "user", "C");
    store.setState({ messages: { sio: [u1, a1, u2] } });

    store.getState().deleteMessage("sio", "a1");
    expect(store.getState().messages.sio.map((m) => m.id)).toEqual(["u1", "u2"]);
    expect(store.getState().messages.sio[0].text).toBe("A");
    expect(store.getState().messages.sio[1].text).toBe("C");
  });
});

describe("retryMessage（验收 #7 替换重试 / #8 保留后续与上下文）", () => {
  it("删除旧 AI 回复，新回复插回原位置，后续消息保留，上下文为原始问题", async () => {
    let lastInit: RequestInit | undefined;
    const fetchMock = vi.fn(async (...args: unknown[]) => {
      lastInit = args[1] as RequestInit | undefined;
      return sseResponse("新的回复");
    });
    vi.stubGlobal("fetch", fetchMock);

    const u1 = msg("u1", "user", "推荐一首歌");
    const a1 = msg("a1", "assistant", "旧回复");
    const u2 = msg("u2", "user", "那再推荐一首");
    const a2 = msg("a2", "assistant", "第二首");
    store.setState({ messages: { sio: [u1, a1, u2, a2] }, status: {} });

    const res = await store.getState().retryMessage("sio", "a1");
    expect(res).toEqual({ ok: true, degraded: false });

    // 上下文 = 重试位置之前（仅原用户问题）
    const body = JSON.parse((lastInit?.body as string) ?? "{}");
    expect(body.messages.map((m: ChatMessage) => m.id)).toEqual(["u1"]);

    // 新回复插回第 1 位，后续保留
    const msgs = store.getState().messages.sio;
    expect(msgs.map((m) => m.id)).toEqual(["u1", expect.any(String) as string, "u2", "a2"]);
    expect(msgs[1].role).toBe("assistant");
    expect(msgs[1].text).toBe("新的回复");
  });

  it("只重试 AI 消息；用户消息不可重试", async () => {
    const fetchMock = vi.fn(async () => sseResponse("x"));
    vi.stubGlobal("fetch", fetchMock);
    const u1 = msg("u1", "user", "问题");
    store.setState({ messages: { sio: [u1] }, status: {} });

    const res = await store.getState().retryMessage("sio", "u1");
    expect(res).toEqual({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
describe("R5.2 贴纸独立消息", () => {
  it("sendSticker 追加贴纸消息，请求上下文序列化为文本标记", async () => {
    let lastInit: RequestInit | undefined;
    const fetchMock = vi.fn(async (...args: unknown[]) => {
      lastInit = args[1] as RequestInit | undefined;
      return sseResponse("收到～");
    });
    vi.stubGlobal("fetch", fetchMock);

    store.setState({ messages: { sio: [] }, status: {} });
    const res = await store.getState().sendSticker("sio", "sio-01");
    expect(res).toEqual({ ok: true, degraded: false });

    // 本地消息：独立贴纸消息（text 为空、sticker 字段）
    const msgs = store.getState().messages.sio;
    expect(msgs[0]).toMatchObject({ role: "user", text: "", sticker: "sio-01" });

    // 模型上下文：贴纸转 [sticker: id] 文本标记
    const body = JSON.parse((lastInit?.body as string) ?? "{}");
    expect(body.messages[0]).toMatchObject({ role: "user", text: "[sticker: sio-01]" });
    expect(body.messages[0].sticker).toBeUndefined();
  });

  it("sendSticker 非法 id 返回 ok:false 且不触发 AI", async () => {
    const fetchMock = vi.fn(async () => sseResponse("x"));
    vi.stubGlobal("fetch", fetchMock);
    store.setState({ messages: { sio: [] }, status: {} });

    const res = await store.getState().sendSticker("sio", "nope-99");
    expect(res).toEqual({ ok: false });
    expect(store.getState().messages.sio).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("AI 回复含贴纸 token 时，完成后拆为文字 + 贴纸两条消息（同 at）", async () => {
    const fetchMock = vi.fn(async () => sseResponse("今天真开心~ [sticker: sio-05]"));
    vi.stubGlobal("fetch", fetchMock);

    store.setState({ messages: { sio: [] }, status: {} });
    const res = await store.getState().send("sio", "哈哈");
    expect(res.ok).toBe(true);

    const msgs = store.getState().messages.sio;
    expect(msgs).toHaveLength(3); // user + 文字 + 贴纸
    expect(msgs[1]).toMatchObject({ role: "assistant", text: "今天真开心~ " });
    expect(msgs[1].sticker).toBeUndefined();
    expect(msgs[2]).toMatchObject({ role: "assistant", text: "", sticker: "sio-05" });
    expect(msgs[2].at).toBe(msgs[1].at); // 同 at 便于组重试
  });

  it("AI 回复纯贴纸 → 只拆出一条贴纸消息", async () => {
    const fetchMock = vi.fn(async () => sseResponse("[sticker: lumen-04]"));
    vi.stubGlobal("fetch", fetchMock);

    store.setState({ messages: { sio: [] }, status: {} });
    await store.getState().send("sio", "抱抱");

    const msgs = store.getState().messages.sio;
    expect(msgs).toHaveLength(2);
    expect(msgs[1]).toMatchObject({ role: "assistant", text: "", sticker: "lumen-04" });
  });

  it("重试拆分组：文字 + 贴纸同 at 时整组删除替换", async () => {
    const fetchMock = vi.fn(async () => sseResponse("好耶 [sticker: sio-02]"));
    vi.stubGlobal("fetch", fetchMock);

    store.setState({ messages: { sio: [] }, status: {} });
    await store.getState().send("sio", "来");
    const afterSend = store.getState().messages.sio;
    expect(afterSend).toHaveLength(3);

    // 重试文字条（拆分组头）→ 整组（文字+贴纸）删除并重新生成
    const res = await store.getState().retryMessage("sio", afterSend[1].id);
    expect(res.ok).toBe(true);
    const msgs = store.getState().messages.sio;
    // 新 user + 新生成的文字 + 新贴纸（再次拆分）
    expect(msgs).toHaveLength(3);
    expect(msgs[1].id).not.toBe(afterSend[1].id);
    expect(msgs[2]).toMatchObject({ role: "assistant", sticker: "sio-02" });
  });
});
