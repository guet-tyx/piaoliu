import { personaOf } from "@/data/chat-personas";
import { isSafeText } from "@/lib/api/moderation";
import { activeProviders } from "@/lib/llm/providers";
import { buildSchedule, isCooled, markCooled } from "@/lib/llm/scheduler";
import { stripThinking } from "@/lib/llm/strip";
import { callChatCompletions } from "@/lib/llm/upstream";
import { MAX_HISTORY, MAX_TEXT } from "@/lib/chat/limits";
import type { ChatMessage } from "@/types/chat";

/**
 * P3-03 推荐歌曲能力说明：追加到 system prompt 末尾，
 * 教会模型用 [playlist: id] / [channel: id] / [music: 歌名] 推荐。
 */
const RECOMMEND_PROMPT = `\n\n## 推荐歌曲能力
你可以给用户推荐歌曲/歌单/频道。使用以下格式：
- 推荐单曲：[music: 歌名]
- 推荐歌单：[playlist: 歌单ID]
- 推荐频道：[channel: 频道ID]

可推荐的歌单（ID → 名称/风格/场景）：
- pl-night-postrock: 深夜电台 · 后摇诗篇（后摇/氛围，适合深夜/独处）
- pl-jp-breeze: 日系 breeze · 风之旅（J-Pop/日系，适合通勤/放松）
- pl-study-piano: 学习自习室 · 轻音（纯音乐，适合学习/工作）
- pl-rain-piano: 雨の日 · 钢琴物语（钢琴/环境，适合雨天/冥想）
- pl-stardust-electro: 星尘歌单 · 电子漫游（电子，适合运动/专注）
- pl-anime-ost: 次元之门 · 动漫 OST（动漫原声，适合日常/怀旧）

可推荐的频道（ID → 名称）：
- ch-night: 深夜频道 / ch-jp: 日系频道 / ch-study: 学习频道 / ch-rain: 雨天频道 / ch-fm: 私人 FM

按用户情绪推荐：累/难过 → 深夜或雨天频道；开心/无聊 → 日系频道；学习/工作 → 学习频道；想听某风格 → 对应歌单。`;

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

  let body: { roleId?: string; messages?: ChatMessage[]; probe?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }
  const { roleId, messages, probe } = body ?? {};
  if (probe === true) {
    // 连通性探测：确认至少一个 provider 就绪，不调用模型
    return Response.json({ ok: true, providers: providers.map((p) => p.id) }, { status: 200 });
  }
  if (!roleId || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }

  const recent = messages.slice(-MAX_HISTORY);
  for (const m of recent) {
    if (typeof m?.text !== "string" || m.text.length > MAX_TEXT) {
      return Response.json({ error: "too-long" }, { status: 400 });
    }
    if (!isSafeText(m.text).ok) {
      return Response.json({ error: "bad-word" }, { status: 400 });
    }
  }

  const persona = personaOf(roleId);
  const openaiMessages = [
    { role: "system", content: persona.system + RECOMMEND_PROMPT },
    ...recent.map((m) => ({ role: m.role, content: m.text })),
  ];

  const schedule = await buildSchedule(providers);
  let lastErr = "";
  for (const { provider, model } of schedule) {
    const coolKey = `${provider.id}::${model}`;
    if (isCooled(coolKey)) continue;
    const result = await callChatCompletions(provider, model, openaiMessages);
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
}
