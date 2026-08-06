import { personaOf } from "@/data/chat-personas";
import { affinityTextOf, emotionTextOf, isEmotionState } from "@/data/emotion";
import { isSafeText } from "@/lib/api/moderation";
import { activeProviders } from "@/lib/llm/providers";
import { buildSchedule, isCooled, isProviderCooled, markCooled, markProviderCooled } from "@/lib/llm/scheduler";
import { stripText, stripThinking } from "@/lib/llm/strip";
import {
  callChatCompletionOnce,
  callChatCompletions,
  getDynamicTemperature,
  type ChatCompletionMessage,
} from "@/lib/llm/upstream";
import { recommendPromptOf } from "@/lib/chat/recommendPrompt";
import { MAX_API_MESSAGES, MAX_HISTORY, MAX_MODEL_TEXT } from "@/lib/chat/limits";
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
  const { roleId, messages, probe, summary, initiative, emotion, memories, communityContext, bottleMention, stream } = body;
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

  // 归一化最近历史：① 跳过 text 非字符串的损坏消息（防御历史数据异常，不因一条脏数据永久 400 锁死聊天）
  // ② 超长消息截断到 MAX_MODEL_TEXT 而非拒绝——长 AI 回复写入历史后若每次 400，前端会永久降级本地回复池
  const recent: { role: string; text: string }[] = [];
  for (const m of messages.slice(-MAX_HISTORY)) {
    if (typeof m?.text !== "string") continue;
    const text = m.text.length > MAX_MODEL_TEXT ? m.text.slice(0, MAX_MODEL_TEXT) : m.text;
    recent.push({ role: m.role, text });
  }
  if (recent.length === 0) {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }
  for (const m of recent) {
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
  // 摘要/记忆注入前守卫（V2.8）：ASCII 占比过高的文本 = 模型跑偏的英文推理/垃圾（如 Summarize 英文思维链），
  // 注入 system prompt 会带偏对话（英文泄漏）。即使 localStorage 里已存垃圾也不注入。
  const mem = typeof memories === "string" && looksLikeChinese(memories.trim())
    ? memories.trim()
    : "";
  const summaryClean = typeof summary === "string" && looksLikeChinese(summary.trim())
    ? summary.trim()
    : "";
  // 摘要注入：作为「早期对话记忆」拼进 system，让模型记住窗口之外的关键事实（Summarize）
  const memoryNote = summaryClean
    ? `\n\n## 早期对话记忆（以下为更早之前聊过的内容摘要，请记住这些事实）\n${summaryClean}`
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
  // V2.8 语言硬约束：免费池混入英文模型（nemotron-nano 等）时会冒英文，统一注入简体中文要求
  const languageNote =
    "\n\n# 语言\n始终使用简体中文回复（除非用户明确要求其他语言）。不要夹杂英文整句，表情/语气词/歌名除外。";
  // P3 A-03/A-04 社区上下文注入守卫：客户端（localStorage）计算后携带，服务端只做长度与中文校验，
  // 防止脏数据/英文推理进入 system prompt（与摘要/记忆同款守卫）
  const communityNote =
    typeof communityContext === "string" &&
    communityContext.length <= 200 &&
    looksLikeChinese(communityContext.trim())
      ? communityContext.trim()
      : "";
  const bottleMentionNote =
    typeof bottleMention === "string" &&
    bottleMention.length <= 200 &&
    looksLikeChinese(bottleMention.trim())
      ? bottleMention.trim()
      : "";
  const openaiMessages: ChatCompletionMessage[] = [
    {
      role: "system",
      content:
        persona.system +
        recommendPromptOf() +
        communityNote +
        bottleMentionNote +
        memoryNote +
        userMemoryNote +
        stateNote +
        languageNote,
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
      // V2.8 网关短路：skipRestOnFail 的 provider（如 freellmapi）整家冷却后跳过其全部后续模型
      if (provider.skipRestOnFail && isProviderCooled(provider.id)) continue;
      if (isCooled(coolKey)) continue;
      // 非流式模式（小程序端 wx.request 无法消费 SSE）：callChatCompletionOnce 返回整段文本，
      // 经 stripText 剥离 <think> 思维链后以 JSON 返回
      if (stream === false) {
        const result = await callChatCompletionOnce(provider, model, openaiMessages, { temperature });
        if (!result.ok) {
          lastErr = result.detail;
          markCooled(coolKey);
          if (provider.skipRestOnFail) markProviderCooled(provider.id);
          continue;
        }
        return Response.json({ ok: true as const, content: stripText(result.content) });
      }
      const result = await callChatCompletions(provider, model, openaiMessages, { temperature });
      if (!result.ok) {
        lastErr = result.detail;
        markCooled(coolKey);
        if (provider.skipRestOnFail) markProviderCooled(provider.id);
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

/**
 * 注入守卫（V2.8）：摘要/记忆文本是否「像中文内容」而非模型跑偏的英文推理。
 * ASCII 字母占比 > 40% 判定为英文垃圾（如 Summarize 思维链 "We need to extract memory…"），不注入。
 */
function looksLikeChinese(text: string): boolean {
  if (!text) return false;
  const ascii = (text.match(/[A-Za-z]/g) ?? []).length;
  return ascii / text.length < 0.4;
}
