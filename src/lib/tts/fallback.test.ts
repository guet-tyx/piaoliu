import { describe, expect, it } from "vitest";
import { fallbackVoiceParams } from "@/lib/tts/fallback";
import { CHAT_PERSONAS } from "@/data/chat-personas";

describe("fallbackVoiceParams（Web Speech 兜底音色参数）", () => {
  it("4 位角色参数有效且听感可区分（pitch/rate 组合互异）", () => {
    const seen = new Set<string>();
    for (const p of CHAT_PERSONAS) {
      const params = fallbackVoiceParams(p.roleId);
      expect(params.lang).toBe("zh-CN");
      expect(params.pitch).toBeGreaterThan(0.5);
      expect(params.pitch).toBeLessThan(1.6);
      expect(params.rate).toBeGreaterThan(0.5);
      expect(params.rate).toBeLessThan(1.6);
      seen.add(`${params.pitch}|${params.rate}`);
    }
    expect(seen.size).toBe(CHAT_PERSONAS.length);
  });

  it("未知角色兜底汐（对齐 personaOf）", () => {
    expect(fallbackVoiceParams("nope")).toEqual(fallbackVoiceParams("sio"));
  });
});
