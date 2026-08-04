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

  it("音色配置：四角色均配复刻参考文件且互异；朔空参考为男声描述；参考文件真实存在", async () => {
    const refs = CHAT_PERSONAS.map((p) => {
      expect(p.voiceClone, `${p.roleId} 有音色复刻参考文件`).toBeTruthy();
      return p.voiceClone!;
    });
    expect(new Set(refs).size).toBe(CHAT_PERSONAS.length);
    // 每个参考文件真实存在（部署漏传会静默回退预置音色）
    for (const ref of refs) {
      const exists = await import("node:fs").then((fs) => fs.existsSync(ref));
      expect(exists, `${ref} 存在`).toBe(true);
    }
    // 朔空是唯一男声角色：参考声线描述须体现男声（配合 gen-voice-refs.mjs）
    const soku = CHAT_PERSONAS.find((p) => p.roleId === "soku")!;
    expect(soku.voicePrompt).toMatch(/男声|青年男声/);
  });
});
