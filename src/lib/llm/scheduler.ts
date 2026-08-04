import { providerBaseUrl, providerKey, type LLMProvider } from "@/lib/llm/providers";
import { fetchWithTimeout } from "@/lib/net/fetchWithTimeout";

/**
 * 多 Provider 调度器（V2.6 从 route.ts 拆出，纯逻辑可单测）：
 * 调度顺序 = ① 各 provider 显式配置(MODELS env) → ② 各 provider 内置优选 → ③ 各 provider 动态池其余。
 * 失败「provider::model」进入 5 分钟冷却；模型池 GET {base}/models 按 provider 缓存 10 分钟。
 */

/** 明显非 chat 的模型（多模态/图像/音频/思考变体等），自动调度时跳过 */
export const NON_CHAT =
  /image|embedding|audio|voice|tts|asr|rerank|gui|ocr|video|\bvl\b|vision|think/i;

/** 模型池缓存（按 provider，TTL 10 分钟） */
const poolCache = new Map<string, { ids: string[]; at: number }>();
export const POOL_TTL = 10 * 60 * 1000;

/** 失败「provider::model」冷却（TTL 5 分钟），避免反复尝试已限流/不可用的模型 */
const cooled = new Map<string, number>();
export const COOLDOWN_TTL = 5 * 60 * 1000;

/** 读 <PROVIDER>_MODELS 环境变量的显式优先级列表 */
export function explicitModels(p: LLMProvider): string[] {
  return (process.env[p.modelsEnv] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 拉取 provider 全量模型池（带鉴权，10 分钟缓存；失败回退空） */
async function fetchPool(p: LLMProvider): Promise<string[]> {
  const cached = poolCache.get(p.id);
  if (cached && Date.now() - cached.at < POOL_TTL) return cached.ids;
  try {
    const res = await fetchWithTimeout(`${providerBaseUrl(p)}/models`, {
      headers: { Authorization: `Bearer ${providerKey(p)}` },
    }, 15_000);
    if (res.ok) {
      const data = (await res.json()) as { data?: { id?: string }[] };
      const ids = (data?.data ?? [])
        .map((m) => m.id)
        .filter((id): id is string => Boolean(id));
      poolCache.set(p.id, { ids, at: Date.now() });
      return ids;
    }
  } catch {
    // 拉取失败回退（显式配置 / 内置优选）
  }
  return [];
}

/**
 * 组装跨 provider 调度顺序（去重）：
 * ① 各 provider 显式配置 → ② 各 provider 内置优选 → ③ 各 provider 动态池其余 chat 模型（字母序）。
 */
export async function buildSchedule(
  providers: LLMProvider[],
): Promise<{ provider: LLMProvider; model: string }[]> {
  const seen = new Set<string>();
  const out: { provider: LLMProvider; model: string }[] = [];
  const push = (p: LLMProvider, model: string) => {
    const key = `${p.id}::${model}`;
    if (model && !seen.has(key) && !(p.excludedModels ?? []).includes(model)) {
      seen.add(key);
      out.push({ provider: p, model });
    }
  };

  for (const p of providers) explicitModels(p).forEach((m) => push(p, m));
  for (const p of providers) p.preferredModels.forEach((m) => push(p, m));
  for (const p of providers) {
    if (!p.supportsPool) continue;
    const pool = await fetchPool(p);
    pool
      .filter((id) => !NON_CHAT.test(id) && !seen.has(`${p.id}::${id}`))
      .sort()
      .forEach((m) => push(p, m));
  }
  return out;
}

/** 是否处于冷却期（key = "providerId::modelId"） */
export function isCooled(key: string): boolean {
  const at = cooled.get(key);
  return at != null && Date.now() - at < COOLDOWN_TTL;
}

/** 标记冷却（key = "providerId::modelId"） */
export function markCooled(key: string) {
  cooled.set(key, Date.now());
}
