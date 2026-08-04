/**
 * 开场白 localStorage 助手（PRD 需求⑤）：
 * - 「最近 2 次用过的台词 key」持久化（drift-chat-greeting-<roleId>，
 *   避开首页每日一句已占用的 drift-greeting-<roleId>；键统一走 storage 注册表）；
 * - lastMessageAtOf：读 drift-chat-<roleId> 最后一条消息 at，用于久别重逢判定。
 * 全部 try/catch 包裹，损坏数据静默兜底（PRD §异常处理）。
 */

import { chatGreetingKey, chatKey, readStorage, writeStorage } from "@/lib/storage";

/** 读最近用过的开场白 key（最多 2 条；损坏/空 → []） */
export function readRecentGreetings(roleId: string): string[] {
  const parsed = readStorage<{ recent?: unknown } | null>(chatGreetingKey(roleId), null);
  if (!parsed || !Array.isArray(parsed.recent)) return [];
  return parsed.recent.filter((x): x is string => typeof x === "string").slice(-2);
}

/** 记录本次用过的开场白 key（保留最近 2 条，满足「连续 3 次不出现相同」） */
export function rememberGreeting(roleId: string, key: string) {
  const recent = [...readRecentGreetings(roleId), key].slice(-2);
  writeStorage(chatGreetingKey(roleId), { recent });
}

/**
 * 该角色最后一条消息的时间戳（久别重逢判定依据，PRD §3.2）：
 * 直接读 localStorage drift-chat-<roleId>（restore 尚未执行的时序下也可用）；
 * 无历史/损坏 → null（不触发久别重逢）。
 */
export function lastMessageAtOf(roleId: string): number | null {
  const msgs = readStorage<{ at?: unknown }[]>(chatKey(roleId), [], Array.isArray);
  if (msgs.length === 0) return null;
  const last = msgs[msgs.length - 1];
  return typeof last?.at === "number" ? last.at : null;
}
