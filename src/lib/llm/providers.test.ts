import { describe, expect, it } from "vitest";
import { LLM_PROVIDERS } from "./providers";

describe("providers.json 注册表数据合法性", () => {
  it("至少 5 家 provider", () => {
    expect(LLM_PROVIDERS.length).toBeGreaterThanOrEqual(5);
  });

  it("id 全局唯一", () => {
    const ids = LLM_PROVIDERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("每个 provider 的 env 键名与 preferredModels 非空", () => {
    for (const p of LLM_PROVIDERS) {
      expect(p.keyEnv).toBeTruthy();
      expect(p.baseUrlEnv).toBeTruthy();
      expect(p.modelsEnv).toBeTruthy();
      expect(p.preferredModels.length).toBeGreaterThan(0);
      expect(p.defaultBaseUrl.startsWith("https://")).toBe(true);
    }
  });

  it("preferredModels 内无重复", () => {
    for (const p of LLM_PROVIDERS) {
      expect(new Set(p.preferredModels).size).toBe(p.preferredModels.length);
    }
  });

  it("excludedModels（若有）与 preferredModels 无交集", () => {
    for (const p of LLM_PROVIDERS) {
      const excluded = p.excludedModels ?? [];
      const overlap = p.preferredModels.filter((m) => excluded.includes(m));
      expect(overlap).toEqual([]);
    }
  });
});
