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

/** 合法摘要类目行前缀（匹配「用户信息：」等，容忍「AI推荐」无空格写法） */
const SUMMARY_CATEGORY_RE = /^(用户信息|关键话题|AI推荐|AI 推荐|情绪状态|关系状态|关键记忆)\s*[:：]/;

/**
 * 模型原始输出 → { summary, memories }（人机感 P1-⑧）：
 * 「关键记忆：」行单独抽出（存 drift-memories-<roleId>，注入「你记得的关于用户的事」），
 * 其余类目（用户信息/关键话题/AI 推荐/情绪/关系）归入 summary（早期对话记忆）。
 * 「无」行与空行忽略；容错不匹配类目前缀的**中文**行（模型偶尔不按格式）。
 *
 * V2.8 防污染：模型跑偏时可能输出英文推理/思维链（如 "We need to extract memory…"）而非中文类目。
 * 此类垃圾若被存进 summary/memories 再注入聊天 system prompt，会带偏后续对话（英文泄漏）。
 * 因此：① ASCII 占比高的行（英文推理）整行丢弃；② 一行合法类目都没有时，多行无格式输出
 * 视为推理/复述垃圾整块作废（单行中文保留宽容，兼容模型省略类目前缀）。
 */
export function splitSummaryOutput(raw: string): { summary: string; memories: string } {
  const others: string[] = [];
  const memoryParts: string[] = [];
  let matched = 0; // 识别到的合法类目行数
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t === "无") continue;
    // 英文推理/思维链行过滤（模型跑偏输出英文时丢弃，避免注入聊天）
    const asciiRatio = (t.match(/[A-Za-z]/g) ?? []).length / Math.max(t.length, 1);
    if (asciiRatio > 0.4) continue;
    // 对话复述标记行（模型跑偏时复述聊天记录，如 "User: 中文内容"）→ 整行丢弃
    if (/^(user|assistant|human|ai|system|conversation)\s*[:：]/i.test(t)) continue;
    const memoryMatch = t.match(/^关键记忆[:：]\s*(.+)$/);
    if (memoryMatch) {
      const content = memoryMatch[1].trim();
      if (content && content !== "无") {
        memoryParts.push(content);
        matched++;
      }
      continue;
    }
    if (SUMMARY_CATEGORY_RE.test(t)) {
      others.push(t);
      matched++;
      continue;
    }
    // 非类目中文字行：保留（英文行已在上方过滤；模型偶尔省略类目前缀）
    others.push(t);
  }
  // 完全没有合法类目：
  //  - 单行且基本纯中文 → 保留（宽容模式，兼容「用户喜欢后摇音乐」这类省略类目的输出）
  //  - 多行无格式 / 含英文标记（如 "User: …" 复述行）/ 全空 → 视为推理复述垃圾，整块作废
  const total = others.length + memoryParts.length;
  if (matched === 0 && total === 1) {
    const only = others[0] ?? memoryParts[0] ?? "";
    const asciiRatio = (only.match(/[A-Za-z]/g) ?? []).length / Math.max(only.length, 1);
    if (asciiRatio < 0.15) return { summary: others.join("\n"), memories: memoryParts.join("\n") };
    return { summary: "", memories: "" };
  }
  if (matched === 0 || total === 0) return { summary: "", memories: "" };
  return { summary: others.join("\n"), memories: memoryParts.join("\n") };
}
