/** AI 聊天（V2.3）：角色对话消息模型 */

export interface ChatMessage {
  /** 稳定 id（列表 key / 增量 append 用） */
  id: string;
  role: "user" | "assistant";
  text: string;
  at: number;
  /** R5.2 独立贴纸消息：sticker 存在时 text 为空串，气泡只渲染贴纸（与 text 互斥） */
  sticker?: string;
}

/** 聊天会话状态 */
export type ChatStatus = "idle" | "thinking" | "streaming" | "error";

/**
 * 对话自动总结（Summarize）：早期消息压缩摘要，随会话持久化、对用户不可见。
 * - text：累积摘要文本（多块增量追加）；空串 = 无摘要
 * - covered：已被摘要覆盖的前置消息条数（单调推进，编辑不回溯）
 */
export interface ChatSummary {
  text: string;
  covered: number;
}

/** 一次完整的会话上下文（Route Handler 入参） */
export interface ChatRequest {
  roleId: string;
  messages: ChatMessage[];
}
