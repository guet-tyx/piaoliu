/**
 * 本地降级回复的「打字机」模拟（V2.7 从 chat store 拆出，纯逻辑可测）：
 * 未配置服务端 key 时用本地回复池，逐字输出模拟流式，保证交互手感一致。
 */

/** 通用 sleep（运行期可用，Node/browser 均可用） */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 打字机初始停顿（ms）+ 随机抖动，模拟「思考后再开口」 */
export const THINK_DELAY_BASE = 400;
export const THINK_DELAY_JITTER = 500;
/** 单步输出间隔（ms） */
const TYPE_INTERVAL_MS = 28;

/**
 * 模拟打字机：按 step 逐段输出全文（每段触发 onChunk），返回全文。
 * 与真实流式对齐：draft 消息 text 随 chunk 增长，最终收敛为全文。
 */
export async function typewriter(
  text: string,
  step: number,
  onChunk: (chunk: string) => void,
): Promise<string> {
  for (let i = 0; i < text.length; i += step) {
    await sleep(TYPE_INTERVAL_MS);
    onChunk(text.slice(0, i + step));
  }
  return text;
}
