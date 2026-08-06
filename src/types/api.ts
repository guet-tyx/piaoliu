/**
 * 服务端 API 路由契约（V2.7 收敛）：
 * 3 条 /api/chat* 路由的请求/响应类型在此共享，服务端与客户端（store）统一引用，
 * 避免路由各自内联声明、客户端另写一套的漂移。路由内仍做运行时校验（类型只是契约声明）。
 */

import type { ChatMessage } from "@/types/chat";
import type { EmotionState } from "@/data/emotion";

/** POST /api/chat 请求体（roleId/messages 为必填；probe/summary 可选） */
export interface ChatApiRequest {
  roleId: string;
  messages: ChatMessage[];
  /** 连通性探测：仅检查 provider 是否就绪，不调用模型 */
  probe?: boolean;
  /** 对话自动总结：早期对话摘要（非空时注入 system，修复长对话失忆） */
  summary?: string;
  /** 人机感 ⑤：本轮末尾主动反问/开启新话题（store 回合计数 + 输入节奏决定） */
  initiative?: boolean;
  /** 人机感 ④⑥：角色情感状态快照（服务端注入「当前状态」并计算动态温度） */
  emotion?: EmotionState;
  /** 人机感 ⑧：角色记得的关于用户的关键记忆（跨会话持久，注入 system） */
  memories?: string;
  /** P3 A-03 星海近况（客户端 localStorage 统计后携带；服务端中文+长度守卫后注入 system） */
  communityContext?: string;
  /** P3 A-04 被角色关注的用户瓶子提及（客户端挑选后携带；服务端同样守卫后注入） */
  bottleMention?: string;
  /** 非流式模式（小程序端 wx.request 无法消费 SSE；true 时返回 {ok, content} 整段 JSON） */
  stream?: boolean;
}

/** /api/chat 失败响应（no-key / bad-request / too-long / bad-word / all-models-failed） */
export interface ChatApiError {
  error: string;
  detail?: string;
  /** 全模型失败时已尝试的 provider::model 数量 */
  tried?: number;
}

/** /api/chat 探测成功响应 */
export interface ChatProbeResponse {
  ok: true;
  providers: string[];
}

/** POST /api/chat/summarize 请求体 */
export interface SummarizeApiRequest {
  roleId: string;
  messages: ChatMessage[];
}

/** /api/chat/summarize 成功响应（summary 为空串 = 无可提取信息；memories 为单独提取的关键记忆，可为空串） */
export interface SummarizeApiResponse {
  ok: true;
  summary: string;
  /** 人机感 ⑧：本次提取出的关键记忆（「关键记忆：xxx」行内容），为空串表示无新记忆 */
  memories?: string;
}

/** POST /api/chat/tts 请求体（roleId/text 可选：probe 模式只传 probe） */
export interface TtsApiRequest {
  roleId?: string;
  text?: string;
  probe?: boolean;
}
