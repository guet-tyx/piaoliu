/**
 * 开场白 localStorage 助手（PRD 需求⑤）：
 * - 「最近 2 次用过的台词 key」持久化（key 前缀 drift-chat-greeting-，
 *   避开首页每日一句已占用的 drift-greeting-<roleId>）；
 * - lastMessageAtOf：读 drift-chat-<roleId> 最后一条消息 at，用于久别重逢判定。
 * 全部 try/catch 包裹，损坏数据静默兜底（PRD §异常处理）。
 */

const GREETING_KEY_PREFIX = "drift-chat-greeting";

function greetingKey(roleId: string): string {
  return `${GREETING_KEY_PREFIX}-${roleId}`;
}

/** 读最近用过的开场白 key（最多 2 条；损坏/空 → []） */
export function readRecentGreetings(roleId: string): string[] {
  try {
    const raw = localStorage.getItem(greetingKey(roleId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { recent?: unknown };
    if (!Array.isArray(parsed?.recent)) return [];
    return parsed.recent
      .filter((x): x is string => typeof x === "string")
      .slice(-2);
  } catch {
    return [];
  }
}

/** 记录本次用过的开场白 key（保留最近 2 条，满足「连续 3 次不出现相同」） */
export function rememberGreeting(roleId: string, key: string) {
  const recent = [...readRecentGreetings(roleId), key].slice(-2);
  try {
    localStorage.setItem(greetingKey(roleId), JSON.stringify({ recent }));
  } catch {
    // 隐私模式等忽略写入失败
  }
}

/**
 * 该角色最后一条消息的时间戳（久别重逢判定依据，PRD §3.2）：
 * 直接读 localStorage drift-chat-<roleId>（restore 尚未执行的时序下也可用）；
 * 无历史/损坏 → null（不触发久别重逢）。
 */
export function lastMessageAtOf(roleId: string): number | null {
  try {
    const raw = localStorage.getItem(`drift-chat-${roleId}`);
    if (!raw) return null;
    const msgs = JSON.parse(raw) as { at?: unknown }[];
    if (!Array.isArray(msgs) || msgs.length === 0) return null;
    const last = msgs[msgs.length - 1];
    return typeof last?.at === "number" ? last.at : null;
  } catch {
    return null;
  }
}
