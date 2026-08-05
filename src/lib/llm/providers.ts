import raw from "./providers.json";

/**
 * 大模型 API Provider 注册表（V2.6 单一数据源）：
 * 数据本体在 providers.json（TS 与 verify 脚本共用，改 provider 只动一处）。
 * 本文件只提供类型与读取 helpers。
 * 调度顺序（跨 provider）：① 各 provider 显式配置(MODELS env) → ② 各 provider 内置优选 → ③ 各 provider 动态池其余。
 */

export interface LLMProvider {
  /** 唯一 id（env 前缀 / 冷却键 / 日志用） */
  id: string;
  name: string;
  /** API key 环境变量名 */
  keyEnv: string;
  /** base URL 环境变量名（可覆盖默认） */
  baseUrlEnv: string;
  /** 默认 OpenAI 兼容 base URL */
  defaultBaseUrl: string;
  /** 显式模型优先级环境变量名（逗号分隔） */
  modelsEnv: string;
  /** 内置优选模型（显式配置 > 内置优选 > 动态池其余） */
  preferredModels: string[];
  /** 是否走 GET /models 动态池（OpenRouter/Gemini/NVIDIA 需人工清单，不开池避免误调付费模型） */
  supportsPool: boolean;
  /** 账户级不可用模型（硬排除，即使动态池里出现） */
  excludedModels?: string[];
  /** 整家失败短路（V2.8 网关）：true 时该 provider 任一模型失败 → 整家冷却 5 分钟，不再试其后续模型（避免网关 auto/auto:fast 重复吃超时） */
  skipRestOnFail?: boolean;
  /** 请求温度（默认 0.85，见 upstream.ts） */
  temperature?: number;
  /** 最大输出 token（默认 400） */
  maxTokens?: number;
  /** 附加请求头（如 OpenRouter 的站标识） */
  extraHeaders?: Record<string, string>;
  /** 上游首字节超时（毫秒，覆盖默认 45s）。V2.8：网关兜底链慢时快速失败 → 落直连快模型 */
  timeoutMs?: number;
}

interface ProvidersData {
  providers: LLMProvider[];
}

export const LLM_PROVIDERS: LLMProvider[] = (raw as ProvidersData).providers;

/** 已配置 API key 的 provider（启用列表） */
export function activeProviders(): LLMProvider[] {
  return LLM_PROVIDERS.filter((p) => (process.env[p.keyEnv] ?? "").trim().length > 0);
}

/** provider 实际 base URL（env 覆盖默认） */
export function providerBaseUrl(p: LLMProvider): string {
  return (process.env[p.baseUrlEnv] ?? p.defaultBaseUrl).replace(/\/$/, "");
}

/** provider 实际 API key */
export function providerKey(p: LLMProvider): string {
  return (process.env[p.keyEnv] ?? "").trim();
}
