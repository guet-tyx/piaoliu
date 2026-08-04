/**
 * 本地降级回复的「打字机」模拟（V2.7 从 chat store 拆出，纯逻辑可测）：
 * 未配置服务端 key 时用本地回复池，逐字输出模拟流式，保证交互手感一致。
 */

/** 通用 sleep（运行期可用，Node/browser 均可用） */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 打字机初始停顿（ms）+ 随机抖动，模拟「思考后再开口」 */
export const THINK_DELAY_BASE = 400;
export const THINK_DELAY_JITTER = 500;
/** 动作描写开场时的额外思考延迟（人机感 P2-⑦：模拟「正在想怎么表达」） */
export const ACTION_DELAY_EXTRA_MS = 400;
/** 单步输出间隔（ms） */
const TYPE_INTERVAL_MS = 28;
/** 动作描写前缀慢速区间长度（前 N 字符放慢，模拟「边说边想」） */
const SLOW_START_LEN = 12;

/** 动作描写前缀识别（「汐歪了歪头，」「她轻轻哼了一声，」等：角色名/人称 + 动作 + 逗号） */
const ACTION_PREFIX_RE = /^[汐流朔悠她他][^，。！？\n]{1,10}[，,]/u;

/** 回复是否以动作描写开场（决定思考延迟与首段打字节奏） */
export function hasActionPrefix(text: string): boolean {
  return ACTION_PREFIX_RE.test(text);
}

/** 思考延迟：普通回复 400-900ms；动作描写开场追加 400ms（模拟「想怎么开口」） */
export function thinkDelayFor(reply: string): number {
  return (
    THINK_DELAY_BASE +
    Math.random() * THINK_DELAY_JITTER +
    (hasActionPrefix(reply) ? ACTION_DELAY_EXTRA_MS : 0)
  );
}

/**
 * 模拟打字机：按 step 逐段输出全文（每段触发 onChunk），返回全文。
 * 与真实流式对齐：draft 消息 text 随 chunk 增长，最终收敛为全文。
 * 人机感 P2-⑦：动作描写开场时前段放慢（模拟「边说边想」）。
 */
export async function typewriter(
  text: string,
  step: number,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const slowStart = hasActionPrefix(text);
  for (let i = 0; i < text.length; i += step) {
    await sleep(slowStart && i < SLOW_START_LEN ? TYPE_INTERVAL_MS * 2 : TYPE_INTERVAL_MS);
    onChunk(text.slice(0, i + step));
  }
  return text;
}
