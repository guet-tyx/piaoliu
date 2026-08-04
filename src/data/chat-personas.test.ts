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
});
