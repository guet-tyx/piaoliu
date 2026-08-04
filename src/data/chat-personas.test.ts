import { describe, expect, it } from "vitest";
import { CHAT_PERSONAS, personaOf } from "@/data/chat-personas";

describe("chat-personas（TTS 音色绑定）", () => {
  it("4 位角色 roleId 与 voicePrompt 均唯一且非空", () => {
    expect(CHAT_PERSONAS.length).toBe(4);
    const roleIds = CHAT_PERSONAS.map((p) => p.roleId);
    const voicePrompts = CHAT_PERSONAS.map((p) => p.voicePrompt);
    expect(new Set(roleIds).size).toBe(roleIds.length);
    expect(new Set(voicePrompts).size).toBe(voicePrompts.length);
    expect(voicePrompts.every((v) => typeof v === "string" && v.length > 0)).toBe(true);
  });

  it("personaOf 未知角色兜底汐（与 TTS 路由音色解析行为一致）", () => {
    expect(personaOf("nope").roleId).toBe("sio");
  });

  it("音色配置互异：每角色必有预置音色或 voicedesign，且四者不同（朔空为男声预置）", () => {
    const identities = CHAT_PERSONAS.map((p) => {
      if (p.voiceDesign) {
        expect(p.voiceId).toBeUndefined(); // voicedesign 不配预置 id
        return "design";
      }
      expect(p.voiceId, `${p.roleId} 有预置音色`).toBeTruthy();
      return `preset:${p.voiceId}`;
    });
    expect(new Set(identities).size).toBe(CHAT_PERSONAS.length);
    // 朔空是唯一男声角色：用男声预置（苏打/白桦），其余女声预置
    const soku = CHAT_PERSONAS.find((p) => p.roleId === "soku")!;
    expect(["苏打", "白桦"]).toContain(soku.voiceId);
  });
});
