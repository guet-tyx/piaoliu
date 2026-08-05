import { isSafeText } from "@/lib/api/moderation";
import { activeProviders } from "@/lib/llm/providers";
import { buildSchedule, isCooled, markCooled } from "@/lib/llm/scheduler";
import { callChatCompletionOnce } from "@/lib/llm/upstream";
import { formatSummaryChunk, splitSummaryOutput } from "@/lib/chat/summarize";
import { MAX_API_MESSAGES, MAX_MODEL_TEXT } from "@/lib/chat/limits";
import type { SummarizeApiRequest } from "@/types/api";

/**
 * 对话自动总结（Summarize，2026-08-04，人机感 P1-⑧ 扩充）：
 * 把一块早期对话消息提取为六类关键信息（用户信息 / 关键话题 / AI 推荐 / 情绪状态 / 关系状态 / 关键记忆），
 * 供主聊天路由（/api/chat）注入 system prompt，修复长对话「失忆」。
 * 「关键记忆」单独抽出返回（memories 字段），由前端存为角色对用户的跨会话记忆。
 * 只做事实提取、不做情感评价；无可提取信息时返回空串。无 key 返回 503 no-key。
 */

/** 提取指令：只输出六类事实，类名前缀、一行一条、不做评价 */
const SUMMARY_SYSTEM_PROMPT = `你是对话内容提炼助手。从用户提供的对话片段中，只提取六类信息，每类一行，用「类名：」开头，不要解释、不要情感分析、不要评价对话质量：
1. 用户信息：用户提到的个人信息（名字、宠物、爱好、身份等）
2. 关键话题：用户聊过的核心话题
3. AI 推荐：AI 给出的推荐或建议（歌曲、歌单、频道、建议等）
4. 情绪状态：用户当前的情绪状态和语气
5. 关系状态：用户和角色之间的互动氛围（如「正在开玩笑」「倾诉心事」「普通闲聊」）
6. 关键记忆：用户提到的重要个人信息（生日、喜好、习惯、重要事件等），单独一行列出

示例输出：
用户信息：用户叫小明，养了一只猫叫咪咪
关键话题：聊过考试压力；喜欢后摇音乐
AI 推荐：推荐了深夜频道和星尘歌单
情绪状态：提到考试有些紧张
关系状态：正在倾诉心事
关键记忆：喜欢后摇音乐；养了一只猫；最近在准备考试

如果片段中没有可提取的信息，只输出「无」一个字，不要输出其他内容。`;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const providers = activeProviders();
  if (providers.length === 0) {
    return Response.json({ error: "no-key" }, { status: 503 });
  }

  let body: SummarizeApiRequest | null = null;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }
  if (!body) return Response.json({ error: "bad-request" }, { status: 400 });
  const { roleId, messages } = body;
  if (!roleId || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }
  if (messages.length > MAX_API_MESSAGES) {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }
  // 归一化（与主聊天路由一致）：跳过 text 非字符串的损坏消息；超长截断而非 400 拒绝
  // （否则一条超长 AI 回复会让 Summarize 永久 400，长对话记忆失效）
  const clean: (typeof messages)[number][] = [];
  for (const m of messages) {
    if (typeof m?.text !== "string") continue;
    clean.push(m.text.length > MAX_MODEL_TEXT ? { ...m, text: m.text.slice(0, MAX_MODEL_TEXT) } : m);
  }
  if (clean.length === 0) {
    return Response.json({ ok: true, summary: "" }, { status: 200 });
  }
  for (const m of clean) {
    // role 白名单校验：与主聊天路由一致，拒绝伪造 system 等角色
    if (m.role !== "user" && m.role !== "assistant") {
      return Response.json({ error: "bad-request" }, { status: 400 });
    }
    if (!isSafeText(m.text).ok) {
      return Response.json({ error: "bad-word" }, { status: 400 });
    }
  }

  const chunkText = formatSummaryChunk(clean);
  if (!chunkText) {
    // 整块都是贴纸：无可提取内容
    return Response.json({ ok: true, summary: "" }, { status: 200 });
  }

  const openaiMessages = [
    { role: "system", content: SUMMARY_SYSTEM_PROMPT },
    { role: "user", content: chunkText },
  ];

  try {
    const schedule = await buildSchedule(providers);
    let lastErr = "";
    for (const { provider, model } of schedule) {
      const coolKey = `${provider.id}::${model}`;
      if (isCooled(coolKey)) continue;
      const result = await callChatCompletionOnce(provider, model, openaiMessages, {
        maxTokens: 400,
      });
      if (!result.ok) {
        lastErr = result.detail;
        markCooled(coolKey);
        continue;
      }
      // 「无」= 无可提取信息；「关键记忆」单独抽出（前端存为跨会话记忆）
      const { summary, memories } = splitSummaryOutput(result.content.trim());
      return Response.json({ ok: true, summary, memories }, { status: 200 });
    }

    return Response.json(
      { error: "all-models-failed", detail: lastErr, tried: schedule.length },
      { status: 503 },
    );
  } catch {
    // 调度/上游未预期异常：统一 500 JSON
    return Response.json({ error: "internal" }, { status: 500 });
  }
}
