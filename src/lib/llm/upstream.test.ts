import { afterEach, describe, expect, it, vi } from "vitest";
import {
  callChatCompletionOnce,
  callChatCompletions,
  getDynamicTemperature,
} from "./upstream";
import { defaultEmotion } from "@/data/emotion";
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

  it("options.temperature 覆盖默认温度（人机感动态温度透传）", async () => {
    let sent: { temperature?: number } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (...args: unknown[]) => {
        sent = JSON.parse((args[1] as RequestInit).body as string);
        return new Response("data: [DONE]\n\n", { status: 200 });
      }),
    );
    const r = await callChatCompletions(makeProvider("a"), "m1", [], { temperature: 0.7 });
    expect(r.ok).toBe(true);
    expect(sent.temperature).toBe(0.7);
  });
});

describe("getDynamicTemperature 动态温度（人机感 P1-⑥）", () => {
  it("无情感状态回退默认 0.85", () => {
    expect(getDynamicTemperature()).toBe(0.85);
  });

  it("高激活高愉悦 → 温度升高（≤1.0）", () => {
    const e = { ...defaultEmotion("sio"), arousal: 100, valence: 100 };
    const t = getDynamicTemperature(e);
    expect(t).toBeGreaterThan(0.85);
    expect(t).toBeLessThanOrEqual(1.0);
  });

  it("低激活低愉悦 → 温度降低（≥0.6）", () => {
    const e = { ...defaultEmotion("sio"), arousal: 0, valence: 0 };
    const t = getDynamicTemperature(e);
    expect(t).toBeLessThan(0.85);
    expect(t).toBeGreaterThanOrEqual(0.6);
  });

  it("全取值域内始终落在 [0.6, 1.0]", () => {
    for (const v of [0, 25, 50, 75, 100]) {
      for (const a of [0, 25, 50, 75, 100]) {
        const t = getDynamicTemperature({ ...defaultEmotion("sio"), valence: v, arousal: a });
        expect(t).toBeGreaterThanOrEqual(0.6);
        expect(t).toBeLessThanOrEqual(1.0);
      }
    }
  });
});
