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
