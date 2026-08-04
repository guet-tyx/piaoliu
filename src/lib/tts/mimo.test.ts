import { afterEach, describe, expect, it, vi } from "vitest";
import { synthesizeSpeech, ttsAudioBase64Of } from "@/lib/tts/mimo";

describe("ttsAudioBase64Of（MiMo chat/completions 响应解析）", () => {
  it("正常响应提取 audio.data base64", () => {
    const body = {
      choices: [
        {
          message: {
            role: "assistant",
            content: "",
            audio: { id: "abc", data: "UklGRiT+AQBXQVZFZm10" },
          },
        },
      ],
    };
    expect(ttsAudioBase64Of(body)).toBe("UklGRiT+AQBXQVZFZm10");
  });

  it("缺少 audio 字段返回 null（无可朗读音频）", () => {
    expect(ttsAudioBase64Of({ choices: [{ message: { content: "hi" } }] })).toBeNull();
    expect(ttsAudioBase64Of({})).toBeNull();
    expect(ttsAudioBase64Of(null)).toBeNull();
  });

  it("data 为空串返回 null", () => {
    expect(
      ttsAudioBase64Of({ choices: [{ message: { audio: { data: "" } } }] }),
    ).toBeNull();
  });
});

describe("synthesizeSpeech 请求体组装（预置音色 / voicedesign / 纯文本控制）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  /** stub key + fetch，返回捕获的请求体 */
  async function captureRequest(opts: {
    voiceId?: string;
    voiceDesign?: boolean;
  }): Promise<{ model: string; messages: { role: string; content: string }[]; audio: Record<string, string> }> {
    let captured: { model: string; messages: { role: string; content: string }[]; audio: Record<string, string> } | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: unknown, init: RequestInit) => {
        captured = JSON.parse(init.body as string);
        return Response.json({ choices: [{ message: { audio: { data: "UklGRiT+AQBXQVZFZm10" } } }] });
      }),
    );
    const r = await synthesizeSpeech({
      text: "你好呀",
      voicePrompt: "测试音色描述",
      ...opts,
    });
    expect(r.ok).toBe(true);
    return captured!;
  }

  it("预置音色：audio.voice=预置 id，默认模型，user 消息带朗读包装", async () => {
    vi.stubEnv("MIMO_API_KEY", "k");
    const body = await captureRequest({ voiceId: "苏打" });
    expect(body.model).toBe("mimo-v2.5-tts");
    expect(body.audio).toEqual({ format: "wav", voice: "苏打" });
    expect(body.messages[0].content).toContain("请用以下音色朗读");
    expect(body.messages[1]).toEqual({ role: "assistant", content: "你好呀" });
  });

  it("voicedesign：模型切换 + user 消息为原始音色描述 + 无 audio.voice", async () => {
    vi.stubEnv("MIMO_API_KEY", "k");
    const body = await captureRequest({ voiceDesign: true });
    expect(body.model).toBe("mimo-v2.5-tts-voicedesign");
    expect(body.audio).toEqual({ format: "wav" }); // 不含 voice
    expect(body.messages[0].content).toBe("测试音色描述"); // 无朗读包装
  });

  it("无 voiceId/voiceDesign（纯文本控制）：audio 仅 format，保持兼容", async () => {
    vi.stubEnv("MIMO_API_KEY", "k");
    const body = await captureRequest({});
    expect(body.model).toBe("mimo-v2.5-tts");
    expect(body.audio).toEqual({ format: "wav" });
  });

  it("未配置 MIMO_API_KEY：返回 no-key 且不发请求", async () => {
    vi.unstubAllEnvs();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const r = await synthesizeSpeech({ text: "hi", voicePrompt: "x" });
    expect(r).toEqual({ ok: false, detail: "no-key" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
