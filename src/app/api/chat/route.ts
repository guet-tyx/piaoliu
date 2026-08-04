import { personaOf } from "@/data/chat-personas";
import { affinityTextOf, emotionTextOf, isEmotionState } from "@/data/emotion";
import { isSafeText } from "@/lib/api/moderation";
import { activeProviders } from "@/lib/llm/providers";
import { buildSchedule, isCooled, markCooled } from "@/lib/llm/scheduler";
import { stripThinking } from "@/lib/llm/strip";
import {
  callChatCompletions,
  getDynamicTemperature,
  type ChatCompletionMessage,
} from "@/lib/llm/upstream";
import { recommendPromptOf } from "@/lib/chat/recommendPrompt";
import { MAX_API_MESSAGES, MAX_HISTORY, MAX_TEXT } from "@/lib/chat/limits";
import type { ChatApiRequest } from "@/types/api";

/** AI 聊天代理（V2.6 多 Provider 大池子；调度/剥离/上游请求已拆至 src/lib/llm/） */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Vercel 部署：默认函数超时 10s 会掐断聊天流式（Agnes/硅基慢模型常 >10s）。
 * Hobby 计划上限 60s；Pro 计划可调大（如 120）。本地开发忽略此值。 */
export const maxDuration = 60;

export async function POST(req: Request) {
  const providers = activeProviders();
  if (providers.length === 0) {
    return Response.json({ error: "no-key" }, { status: 503 });
  }

  let body: ChatApiRequest | null = null;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }
  if (!body) return Response.json({ error: "bad-request" }, { status: 400 });
  const { roleId, messages, probe, summary, initiative, emotion, memories } = body;
  if (probe === true) {
    // 连通性探测：确认至少一个 provider 就绪，不调用模型
    return Response.json({ ok: true, providers: providers.map((p) => p.id) }, { status: 200 });
  }
  if (!roleId || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }
  // 消息条数上限：正常客户端只发最近 MAX_HISTORY 条，异常大包直接拒绝
  if (messages.length > MAX_API_MESSAGES) {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }

  const recent = messages.slice(-MAX_HISTORY);
  for (const m of recent) {
    if (typeof m?.text !== "string" || m.text.length > MAX_TEXT) {
      return Response.json({ error: "too-long" }, { status: 400 });
    }
    // role 白名单校验：拒绝伪造 system 等角色注入 prompt
    if (m.role !== "user" && m.role !== "assistant") {
      return Response.json({ error: "bad-request" }, { status: 400 });
    }
    if (!isSafeText(m.text).ok) {
      return Response.json({ error: "bad-word" }, { status: 400 });
    }
  }

  const persona = personaOf(roleId);
  // 情感状态：字段校验通过才注入（人机感 ④：情绪影响回复风格；⑥：情绪影响动态温度）
  const emo = isEmotionState(emotion) ? emotion : undefined;
  const mem = typeof memories === "string" ? memories.trim() : "";
  // 摘要注入：作为「早期对话记忆」拼进 system，让模型记住窗口之外的关键事实（Summarize）
  const memoryNote = summary
    ? `\n\n## 早期对话记忆（以下为更早之前聊过的内容摘要，请记住这些事实）\n${summary}`
    : "";
  // 人机感 ⑧：关键记忆注入「你记得的关于用户的事」（跨会话持久，独立于摘要）
  const userMemoryNote = mem
    ? `\n\n## 你记得的关于用户的事\n${mem
        .split("\n")
        .map((l) => `- ${l.trim()}`)
        .filter(Boolean)
        .join("\n")}`
    : "";
  // 人机感 ④：当前情绪与关系阶段注入（影响回复语气）
  const stateNote = emo
    ? `\n\n## 当前状态\n- 情绪：${emotionTextOf(emo)}\n- 你和用户的关系：${affinityTextOf(emo.affinity)}`
    : "";
  const openaiMessages: ChatCompletionMessage[] = [
    {
      role: "system",
      content: persona.system + recommendPromptOf() + memoryNote + userMemoryNote + stateNote,
    },
    ...recent.map((m) => ({ role: m.role, content: m.text })),
  ];
  // 人机感 ⑤：主动反问——在末尾用户消息后追加隐式引导（不显示给用户，模型据此自然收尾反问/开新话题）
  if (initiative === true) {
    const last = openaiMessages[openaiMessages.length - 1];
    if (last.role === "user") {
      last.content += "\n（本轮回复请在末尾自然地追加一个反问或新话题，让对话继续下去）";
    }
  }

  try {
    const schedule = await buildSchedule(providers);
    // 人机感 ⑥：动态温度（随情感状态变化，0.6-1.0）
    const temperature = getDynamicTemperature(emo);
    let lastErr = "";
    for (const { provider, model } of schedule) {
      const coolKey = `${provider.id}::${model}`;
      if (isCooled(coolKey)) continue;
      const result = await callChatCompletions(provider, model, openaiMessages, { temperature });
      if (!result.ok) {
        lastErr = result.detail;
        markCooled(coolKey);
        continue;
      }
      // 转发 SSE 流（重建帧并剥离 <think> 思维链，OpenAI 兼容格式）
      return new Response(stripThinking(result.response.body as ReadableStream<Uint8Array>), {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    return Response.json(
      { error: "all-models-failed", detail: lastErr, tried: schedule.length },
      { status: 503 },
    );
  } catch {
    // 调度/上游未预期异常：统一 500 JSON（避免裸抛 → 非 JSON 500）
    return Response.json({ error: "internal" }, { status: 500 });
  }
}
