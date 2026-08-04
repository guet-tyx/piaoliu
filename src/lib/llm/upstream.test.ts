import { afterEach, describe, expect, it, vi } from "vitest";
import { callChatCompletionOnce, callChatCompletions } from "./upstream";
import type { LLMProvider } from "./providers";

/** 构造最小 provider（唯一 id 避免 env/模块级状态串扰） */
function makeProvider(id: string): LLMProvider {
  const upper = id.toUpperCase();
  return {
    id,
    name: id,
    keyEnv: `TEST_${upper}_API_KEY`,
    baseUrlEnv: `TEST_${upper}_BASE_URL`,
    defaultBaseUrl: `https://test-${id}.example/v1`,
    modelsEnv: `TEST_${upper}_MODELS`,
    supportsPool: false,
    preferredModels: [],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("callChatCompletionOnce", () => {
  it("成功：解析 choices[0].message.content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({ choices: [{ message: { content: "提取的摘要内容" } }] }),
      ),
    );
    const r = await callChatCompletionOnce(makeProvider("a"), "m1", [
      { role: "user", content: "hi" },
    ]);
    expect(r).toEqual({ ok: true, content: "提取的摘要内容" });
  });

  it("上游非 2xx：返回失败详情并 console.warn", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({}, { status: 429 })));
    const r = await callChatCompletionOnce(makeProvider("a"), "m1", []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toContain("status=429");
    expect(warn).toHaveBeenCalled();
  });

  it("网络异常：返回失败详情", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const r = await callChatCompletionOnce(makeProvider("a"), "m1", []);
    expect(r.ok).toBe(false);
    expect(warn).toHaveBeenCalled();
  });

  it("content 缺失时返回空串", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ choices: [] })));
    const r = await callChatCompletionOnce(makeProvider("a"), "m1", []);
    expect(r).toEqual({ ok: true, content: "" });
  });
});

describe("callChatCompletions", () => {
  it("成功：透传上游 Response（含 body 流）", async () => {
    const res = new Response("data: [DONE]\n\n", { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res));
    const r = await callChatCompletions(makeProvider("a"), "m1", []);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.response).toBe(res);
  });

  it("上游非 2xx：返回失败详情", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 500 })));
    const r = await callChatCompletions(makeProvider("a"), "m1", []);
    expect(r.ok).toBe(false);
    expect(warn).toHaveBeenCalled();
  });
});
