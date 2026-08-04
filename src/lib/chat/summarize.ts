/**
 * 多轮对话自动总结（Summarize）纯逻辑（2026-08-04）：
 * - nextSummaryChunk：触发判定——总消息数达标且存在新的未覆盖块（覆盖计数单调推进，编辑不回溯）；
 * - formatSummaryChunk：把消息块拼成「用户/角色」标注文本，供 /api/chat/summarize 提取。
 * 贴纸消息（sticker 字段非空）不计入提取范围。
 */

import type { ChatMessage } from "@/types/chat";
import { MIN_SUMMARY_MSGS, SUMMARY_CHUNK } from "@/lib/chat/limits";

export interface SummaryChunk {
  start: number;
  end: number;
}

/**
 * 返回下一个待提取的消息块下标区间；不满足触发条件返回 null。
 * 触发条件：总消息数 ≥ MIN_SUMMARY_MSGS，且已有未覆盖区 ≥ SUMMARY_CHUNK。
 */
export function nextSummaryChunk(
  messages: ChatMessage[],
  covered: number,
): SummaryChunk | null {
  if (messages.length < MIN_SUMMARY_MSGS) return null;
  if (messages.length - covered < SUMMARY_CHUNK) return null;
  return { start: covered, end: covered + SUMMARY_CHUNK };
}

/** 消息块 → 模型输入文本：跳过贴纸消息，按「用户/角色」标注 */
export function formatSummaryChunk(messages: ChatMessage[]): string {
  return messages
    .filter((m) => !m.sticker)
    .map((m) => `${m.role === "user" ? "用户" : "角色"}：${m.text}`)
    .join("\n");
}

/**
 * 模型原始输出 → { summary, memories }（人机感 P1-⑧）：
 * 「关键记忆：」行单独抽出（存 drift-memories-<roleId>，注入「你记得的关于用户的事」），
 * 其余类目（用户信息/关键话题/AI 推荐/情绪/关系）归入 summary（早期对话记忆）。
 * 「无」行与空行忽略；容错不匹配类目前缀的行（模型偶尔不按格式）。
 */
export function splitSummaryOutput(raw: string): { summary: string; memories: string } {
  const others: string[] = [];
  const memoryParts: string[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t === "无") continue;
    const memoryMatch = t.match(/^关键记忆[:：]\s*(.+)$/);
    if (memoryMatch) {
      const content = memoryMatch[1].trim();
      if (content && content !== "无") memoryParts.push(content);
      continue;
    }
    others.push(t);
  }
  return { summary: others.join("\n"), memories: memoryParts.join("\n") };
}
