import { personaOf } from "@/data/chat-personas";
import { isSafeText } from "@/lib/api/moderation";
import { mimoConfigured, synthesizeSpeech } from "@/lib/tts/mimo";
import { MAX_TTS_TEXT } from "@/lib/chat/limits";
import type { TtsApiRequest } from "@/types/api";

/**
 * TTS 语音合成代理（2026-08-04）：
 * POST /api/chat/tts
 * - { probe: true } → 探测 MiMo key 是否已配置（不调用模型）
 * - { roleId, text } → 按角色音色合成语音（MiMo 返回 base64 WAV），回传 audio/wav 二进制
 * 错误模式对齐现有路由：no-key(503) / bad-request(400) / too-long(400) / bad-word(400)。
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!mimoConfigured()) {
    return Response.json({ error: "no-key" }, { status: 503 });
  }

  let body: TtsApiRequest | null = null;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }
  if (!body) return Response.json({ error: "bad-request" }, { status: 400 });
  const { roleId, text, probe } = body;

  if (probe === true) {
    return Response.json({ ok: true }, { status: 200 });
  }
  if (!roleId || typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }
  if (text.length > MAX_TTS_TEXT) {
    return Response.json({ error: "too-long" }, { status: 400 });
  }
  if (!isSafeText(text).ok) {
    return Response.json({ error: "bad-word" }, { status: 400 });
  }

  // 音色按角色绑定（personaOf 未知角色兜底汐，与聊天行为一致）：
  // 预置音色（voiceId）打底区分男女声，voicedesign 文本设计音色给最独特的角色。
  const persona = personaOf(roleId);

  try {
    const result = await synthesizeSpeech({
      text,
      voicePrompt: persona.voicePrompt,
      ...(persona.voiceId ? { voiceId: persona.voiceId } : {}),
      ...(persona.voiceDesign ? { voiceDesign: true } : {}),
    });
    if (!result.ok) {
      if (result.detail === "no-key") {
        return Response.json({ error: "no-key" }, { status: 503 });
      }
      return Response.json({ error: "tts-failed", detail: result.detail }, { status: 502 });
    }

    return new Response(result.audio, {
      headers: {
        "Content-Type": result.mime,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    // 未预期异常：统一 500 JSON（避免裸抛 → 非 JSON 500）
    return Response.json({ error: "internal" }, { status: 500 });
  }
}
