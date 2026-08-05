import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSchedule,
  explicitModels,
  isCooled,
  isProviderCooled,
  markCooled,
  markProviderCooled,
} from "./scheduler";
import type { LLMProvider } from "./providers";

/** 构造最小 provider（唯一 id 避免模块级 poolCache/cooled 串扰） */
function makeProvider(over: Partial<LLMProvider> & { id: string }): LLMProvider {
  return {
    name: over.id,
    keyEnv: `TEST_${over.id.toUpperCase()}_API_KEY`,
    baseUrlEnv: `TEST_${over.id.toUpperCase()}_BASE_URL`,
    defaultBaseUrl: `https://test-${over.id}.example/v1`,
    modelsEnv: `TEST_${over.id.toUpperCase()}_MODELS`,
    supportsPool: false,
    preferredModels: [],
    ...over,
  };
}

describe("explicitModels", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("按逗号拆分并过滤空项", () => {
    vi.stubEnv("TEST_A_MODELS", " m1 , m2 , , m3 ");
    const p = makeProvider({ id: "a" });
    expect(explicitModels(p)).toEqual(["m1", "m2", "m3"]);
  });

  it("未配置返回空数组", () => {
    const p = makeProvider({ id: "a" });
    expect(explicitModels(p)).toEqual([]);
  });
});

describe("buildSchedule", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("顺序：各 provider 显式 → 各 provider 优选；排除 excluded 并去重", async () => {
    vi.stubEnv("TEST_A_MODELS", "ax1");
    vi.stubEnv("TEST_B_MODELS", "bx1");
    const a = makeProvider({
      id: "a",
      preferredModels: ["ap1", "ap2"],
      excludedModels: ["ap1"],
    });
    const b = makeProvider({ id: "b", preferredModels: ["bp1"] });
    const schedule = await buildSchedule([a, b]);
    expect(schedule.map((s) => `${s.provider.id}:${s.model}`)).toEqual([
      "a:ax1",
      "b:bx1",
      "a:ap2", // ap1 被 excluded 过滤
      "b:bp1",
    ]);
  });

  it("显式与优选重复的模型只出现一次", async () => {
    vi.stubEnv("TEST_A_MODELS", "ap1");
    const a = makeProvider({ id: "a", preferredModels: ["ap1", "ap2"] });
    const schedule = await buildSchedule([a]);
    expect(schedule.map((s) => s.model)).toEqual(["ap1", "ap2"]);
  });

  it("supportsPool=false 时不调用 /models（无 fetch 网络请求）", async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new Error("should not fetch"));
    vi.stubGlobal("fetch", fetchSpy);
    const a = makeProvider({ id: "a", preferredModels: ["ap1"], supportsPool: false });
    const schedule = await buildSchedule([a]);
    expect(schedule.map((s) => s.model)).toEqual(["ap1"]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("supportsPool=true 时拉池：过滤 NON_CHAT、按字母序、追加在优选之后", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: "zp2" },
            { id: "audio-voice-model" }, // NON_CHAT 过滤
            { id: "zp1" },
            { id: "ap1" }, // 与优选重复 → 去重
            { id: "vision-model" }, // NON_CHAT 过滤
          ],
        }),
      }),
    );
    const a = makeProvider({ id: "a", preferredModels: ["ap1"], supportsPool: true });
    const schedule = await buildSchedule([a]);
    expect(schedule.map((s) => s.model)).toEqual(["ap1", "zp1", "zp2"]);
  });

  it("多 provider：显式全部排在前，再各 provider 优选，再各 provider 池", async () => {
    vi.stubEnv("TEST_A_MODELS", "ax1");
    vi.stubEnv("TEST_B_MODELS", "bx1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ id: "bpool1" }] }) }),
    );
    const a = makeProvider({ id: "a", preferredModels: ["ap1"], supportsPool: false });
    const b = makeProvider({ id: "b", preferredModels: ["bp1"], supportsPool: true });
    const schedule = await buildSchedule([a, b]);
    expect(schedule.map((s) => `${s.provider.id}:${s.model}`)).toEqual([
      "a:ax1",
      "b:bx1",
      "a:ap1",
      "b:bp1",
      "b:bpool1",
    ]);
  });
});

describe("冷却", () => {
  it("markCooled 后 isCooled 返回 true", () => {
    markCooled("p::m");
    expect(isCooled("p::m")).toBe(true);
  });

  it("未冷却的 key 返回 false", () => {
    expect(isCooled("nope::x")).toBe(false);
  });
});

describe("整家冷却（skipRestOnFail 网关短路）", () => {
  it("markProviderCooled 后 isProviderCooled 返回 true，且模型级 key 独立不受影响", () => {
    const gw = "freellmapi";
    markProviderCooled(gw);
    expect(isProviderCooled(gw)).toBe(true);
    // 模型级冷却与整家冷却互不干扰（不同 key 命名空间）
    expect(isCooled(`${gw}::auto`)).toBe(false);
    expect(isProviderCooled("other")).toBe(false);
  });
});
