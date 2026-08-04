import { describe, expect, it } from "vitest";
import { ttsAudioBase64Of } from "@/lib/tts/mimo";

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
