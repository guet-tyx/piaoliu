import { providerBaseUrl, providerKey, type LLMProvider } from "@/lib/llm/providers";

/** 发送给上游的 OpenAI 兼容消息（system + user/assistant） */
export interface ChatCompletionMessage {
  role: string;
  content: string;
}

export type UpstreamResult =
  | { ok: true; response: Response }
  | { ok: false; detail: string };

/** 默认生成参数（provider 可在 providers.json 里覆盖） */
const DEFAULT_TEMPERATURE = 0.85;
const DEFAULT_MAX_TOKENS = 400;

/**
 * 单次上游 chat/completions 请求（V2.6 从 route.ts 拆出）：
 * 统一 Bearer 鉴权 + SSE 流式；provider 可配置 temperature/maxTokens/extraHeaders。
 * 失败时记录 console.warn（Vercel 日志可观测）并返回失败详情。
 */
export async function callChatCompletions(
  provider: LLMProvider,
  model: string,
  messages: ChatCompletionMessage[],
): Promise<UpstreamResult> {
  const url = `${providerBaseUrl(provider)}/chat/completions`;
  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${providerKey(provider)}`,
        "Content-Type": "application/json",
        ...(provider.extraHeaders ?? {}),
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: provider.temperature ?? DEFAULT_TEMPERATURE,
        max_tokens: provider.maxTokens ?? DEFAULT_MAX_TOKENS,
      }),
    });
    if (!upstream.ok || !upstream.body) {
      const detail = `${provider.name}/${model} status=${upstream.status}`;
      console.warn(`[llm] ${detail}`);
      await upstream.body?.cancel().catch(() => {});
      return { ok: false, detail };
    }
    return { ok: true, response: upstream };
  } catch (e) {
    const detail = `${provider.name}/${model} ${String(e)}`;
    console.warn(`[llm] ${detail}`);
    return { ok: false, detail };
  }
}

export type UpstreamOnceResult =
  | { ok: true; content: string }
  | { ok: false; detail: string };

export interface CompletionOnceOptions {
  /** 输出上限（对话自动总结等短文场景默认 300 足够） */
  maxTokens?: number;
}

/**
 * 单次非流式 chat/completions（对话自动总结等「一次性产出短文」场景）：
 * 复用与 callChatCompletions 相同的鉴权/参数/失败日志，stream: false 直接解析
 * JSON choices[0].message.content。失败返回详情，调用方按调度器冷却。
 */
export async function callChatCompletionOnce(
  provider: LLMProvider,
  model: string,
  messages: ChatCompletionMessage[],
  options: CompletionOnceOptions = {},
): Promise<UpstreamOnceResult> {
  const url = `${providerBaseUrl(provider)}/chat/completions`;
  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${providerKey(provider)}`,
        "Content-Type": "application/json",
        ...(provider.extraHeaders ?? {}),
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        temperature: provider.temperature ?? DEFAULT_TEMPERATURE,
        max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      }),
    });
    if (!upstream.ok) {
      const detail = `${provider.name}/${model} status=${upstream.status}`;
      console.warn(`[llm] ${detail}`);
      return { ok: false, detail };
    }
    const data = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data?.choices?.[0]?.message?.content ?? "";
    return { ok: true, content };
  } catch (e) {
    const detail = `${provider.name}/${model} ${String(e)}`;
    console.warn(`[llm] ${detail}`);
    return { ok: false, detail };
  }
}
