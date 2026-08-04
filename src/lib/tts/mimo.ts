/**
 * 小米 MiMo TTS adapter（服务端，2026-08-04，已按真实接口实测校准）：
 * 经 OpenAI 兼容网关调用，实测结论：
 * - base: https://api.xiaomimimo.com/v1（api.mimo.xiaomi.com 域名不存在）
 * - 端点: POST {base}/chat/completions + 模型 mimo-v2.5-tts
 * - 消息须含 assistant 角色：user 消息放音色指令，assistant 消息放要朗读的文本
 * - 返回 JSON: choices[0].message.audio.data = base64 WAV
 * 端点/字段集中在本文件，官方文档如有出入只改这里。
 *
 * env：
 * - MIMO_API_KEY   必填，MiMo 平台 API key
 * - MIMO_BASE_URL  默认 https://api.xiaomimimo.com/v1
 * - MIMO_TTS_MODEL 默认 mimo-v2.5-tts
 */

export type TtsSynthesizeResult =
  | { ok: true; audio: ArrayBuffer; mime: string }
  | { ok: false; detail: string };

import { fetchWithTimeout } from "@/lib/net/fetchWithTimeout";

const DEFAULT_BASE_URL = "https://api.xiaomimimo.com/v1";
const DEFAULT_MODEL = "mimo-v2.5-tts";

export function mimoConfigured(): boolean {
  return (process.env.MIMO_API_KEY ?? "").trim().length > 0;
}

/** 从 chat/completions 响应中取 TTS 音频 base64（纯函数，可单测） */
export function ttsAudioBase64Of(body: unknown): string | null {
  const data = (
    body as {
      choices?: { message?: { audio?: { data?: unknown } } }[];
    } | null
  )?.choices?.[0]?.message?.audio?.data;
  return typeof data === "string" && data.length > 0 ? data : null;
}

export async function synthesizeSpeech(options: {
  text: string;
  voicePrompt: string;
}): Promise<TtsSynthesizeResult> {
  const key = (process.env.MIMO_API_KEY ?? "").trim();
  if (!key) return { ok: false, detail: "no-key" };
  const base = (process.env.MIMO_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = (process.env.MIMO_TTS_MODEL ?? DEFAULT_MODEL).trim();

  try {
    const upstream = await fetchWithTimeout(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "user", content: `请用以下音色朗读，只输出 assistant 消息里的内容：${options.voicePrompt}` },
          { role: "assistant", content: options.text },
        ],
      }),
    });
    if (!upstream.ok) {
      const detail = `mimo/tts status=${upstream.status}`;
      console.warn(`[tts] ${detail}`);
      return { ok: false, detail };
    }
    const body: unknown = await upstream.json();
    const b64 = ttsAudioBase64Of(body);
    if (!b64) {
      return { ok: false, detail: "mimo/tts empty-audio" };
    }
    const buf = Buffer.from(b64, "base64");
    if (buf.length === 0) {
      return { ok: false, detail: "mimo/tts empty-audio" };
    }
    // 拷贝为 ArrayBuffer 背书（避免 Uint8Array<ArrayBufferLike> 无法作 BodyInit）
    const audio = new Uint8Array(buf);
    return { ok: true, audio: audio.buffer, mime: "audio/wav" };
  } catch (e) {
    const cause = (e as Error & { cause?: unknown })?.cause;
    const detail = `mimo/tts ${String(e)} cause=${JSON.stringify(cause)?.slice(0, 200) ?? "null"}`;
    console.warn(`[tts] ${detail}`);
    return { ok: false, detail };
  }
}
