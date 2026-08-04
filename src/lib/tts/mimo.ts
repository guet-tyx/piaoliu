/**
 * 小米 MiMo TTS adapter（服务端，2026-08-04，已按真实接口实测校准）：
 * 经 OpenAI 兼容网关调用，实测结论：
 * - base: https://api.xiaomimimo.com/v1（api.mimo.xiaomi.com 域名不存在）
 * - 端点: POST {base}/chat/completions + 模型 mimo-v2.5-tts
 * - 消息须含 assistant 角色：user 消息放音色指令，assistant 消息放要朗读的文本
 * - 预置音色：audio.voice 传中文音色 id（冰糖/茉莉/苏打/白桦），人物音色从此区分
 * - voicedesign：模型 mimo-v2.5-tts-voicedesign，user 消息直接传音色描述（无需 audio.voice）
 * - voiceclone：模型 mimo-v2.5-tts-voiceclone，audio.voice 传参考音频 data URI（data:audio/wav;base64,...），
 *   user 消息传空串。参考样本由 gen-voice-refs.mjs 用 voicedesign 生成后冻结，保证角色声线跨消息稳定
 * - 返回 JSON: choices[0].message.audio.data = base64 WAV
 * 端点/字段集中在本文件，官方文档如有出入只改这里。
 *
 * env：
 * - MIMO_API_KEY   必填，MiMo 平台 API key
 * - MIMO_BASE_URL  默认 https://api.xiaomimimo.com/v1
 * - MIMO_TTS_MODEL 默认 mimo-v2.5-tts（预置音色模型；voicedesign/voiceclone 恒用各自模型）
 */

export type TtsSynthesizeResult =
  | { ok: true; audio: ArrayBuffer; mime: string }
  | { ok: false; detail: string };

import { fetchWithTimeout } from "@/lib/net/fetchWithTimeout";

const DEFAULT_BASE_URL = "https://api.xiaomimimo.com/v1";
const DEFAULT_MODEL = "mimo-v2.5-tts";
/** voicedesign 文本设计音色模型（音色由 voicePrompt 文本描述生成，无需预置 id） */
const VOICE_DESIGN_MODEL = "mimo-v2.5-tts-voicedesign";
/** voiceclone 音色复刻模型（audio.voice 传参考音频 data URI） */
const VOICE_CLONE_MODEL = "mimo-v2.5-tts-voiceclone";

/** voiceclone 参考音频（服务端从文件读出后 base64，请求时拼 data URI） */
export interface VoiceCloneSample {
  /** 参考音频 MIME（audio/wav / audio/mpeg） */
  mime: string;
  /** 参考音频 base64 编码内容 */
  dataBase64: string;
}

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
  /** MiMo 预置音色 id（冰糖/茉莉/苏打/白桦）；缺省则纯文本控制（保持旧行为） */
  voiceId?: string;
  /** true → voicedesign 文本设计音色（voicePrompt 即音色描述，无预置 id） */
  voiceDesign?: boolean;
  /** 参考音频 → voiceclone 复刻（优先级最高；传了即用复刻模型，忽略 voiceId/voiceDesign） */
  voiceClone?: VoiceCloneSample;
}): Promise<TtsSynthesizeResult> {
  const key = (process.env.MIMO_API_KEY ?? "").trim();
  if (!key) return { ok: false, detail: "no-key" };
  const base = (process.env.MIMO_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  // 优先级：voiceclone > voicedesign > 预置音色（兼容旧行为）
  const model = options.voiceClone
    ? VOICE_CLONE_MODEL
    : options.voiceDesign
      ? VOICE_DESIGN_MODEL
      : (process.env.MIMO_TTS_MODEL ?? DEFAULT_MODEL).trim();
  // 预置音色：音色指令 = 朗读包装 + 风格描述；voicedesign：音色描述本体即 user 消息；voiceclone：空串
  const userContent = options.voiceClone
    ? ""
    : options.voiceDesign
      ? options.voicePrompt
      : `请用以下音色朗读，只输出 assistant 消息里的内容：${options.voicePrompt}`;
  const audio: Record<string, string> = { format: "wav" };
  if (options.voiceClone) {
    audio.voice = `data:${options.voiceClone.mime};base64,${options.voiceClone.dataBase64}`;
  } else if (options.voiceId) {
    audio.voice = options.voiceId;
  }

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
          { role: "user", content: userContent },
          { role: "assistant", content: options.text },
        ],
        audio,
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
    const wav = new Uint8Array(buf);
    return { ok: true, audio: wav.buffer, mime: "audio/wav" };
  } catch (e) {
    const cause = (e as Error & { cause?: unknown })?.cause;
    const detail = `mimo/tts ${String(e)} cause=${JSON.stringify(cause)?.slice(0, 200) ?? "null"}`;
    console.warn(`[tts] ${detail}`);
    return { ok: false, detail };
  }
}
