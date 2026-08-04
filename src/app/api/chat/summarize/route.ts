import { isSafeText } from "@/lib/api/moderation";
import { activeProviders } from "@/lib/llm/providers";
import { buildSchedule, isCooled, markCooled } from "@/lib/llm/scheduler";
import { callChatCompletionOnce } from "@/lib/llm/upstream";
import { formatSummaryChunk } from "@/lib/chat/summarize";
import { MAX_TEXT } from "@/lib/chat/limits";
import type { ChatMessage } from "@/types/chat";

/**
 * 对话自动总结（Summarize，2026-08-04）：
 * 把一块早期对话消息提取为三类关键信息（用户信息 / 关键话题 / AI 推荐），
 * 供主聊天路由（/api/chat）注入 system prompt，修复长对话「失忆」。
 * 只做事实提取、不做情感评价；无可提取信息时返回空串。无 key 返回 503 no-key。
 */

/** 提取指令：只输出三类事实，类名前缀、一行一条、不做评价 */
const SUMMARY_SYSTEM_PROMPT = `你是对话内容提炼助手。从用户提供的对话片段中，只提取三类信息，每类一行，用「类名：」开头，不要解释、不要情感分析、不要评价对话质量：
1. 用户信息：用户提到的个人信息（名字、宠物、爱好、身份等）
2. 关键话题：用户聊过的核心话题
3. AI 推荐：AI 给出的推荐或建议（歌曲、歌单、频道、建议等）

示例输出：
用户信息：用户叫小明，养了一只猫叫咪咪
关键话题：聊过考试压力；喜欢后摇音乐
AI 推荐：推荐了深夜频道和星尘歌单

如果片段中没有可提取的信息，只输出「无」一个字，不要输出其他内容。`;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const providers = activeProviders();
  if (providers.length === 0) {
    return Response.json({ error: "no-key" }, { status: 503 });
  }

  let body: { roleId?: string; messages?: ChatMessage[] } | null = null;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }
  const { roleId, messages } = body ?? {};
  if (!roleId || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }
  for (const m of messages) {
    if (typeof m?.text !== "string" || m.text.length > MAX_TEXT) {
      return Response.json({ error: "too-long" }, { status: 400 });
    }
    if (!isSafeText(m.text).ok) {
      return Response.json({ error: "bad-word" }, { status: 400 });
    }
  }

  const chunkText = formatSummaryChunk(messages);
  if (!chunkText) {
    // 整块都是贴纸：无可提取内容
    return Response.json({ ok: true, summary: "" }, { status: 200 });
  }

  const openaiMessages = [
    { role: "system", content: SUMMARY_SYSTEM_PROMPT },
    { role: "user", content: chunkText },
  ];

  const schedule = await buildSchedule(providers);
  let lastErr = "";
  for (const { provider, model } of schedule) {
    const coolKey = `${provider.id}::${model}`;
    if (isCooled(coolKey)) continue;
    const result = await callChatCompletionOnce(provider, model, openaiMessages, {
      maxTokens: 300,
    });
    if (!result.ok) {
      lastErr = result.detail;
      markCooled(coolKey);
      continue;
    }
    const trimmed = result.content.trim();
    // 「无」= 无可提取信息，归一为空串
    const summary = trimmed === "无" ? "" : trimmed;
    return Response.json({ ok: true, summary }, { status: 200 });
  }

  return Response.json(
    { error: "all-models-failed", detail: lastErr, tried: schedule.length },
    { status: 503 },
  );
}
