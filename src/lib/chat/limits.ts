/** 聊天消息/文本上限（V2.6 共享常量：route 与前端 store 共用，避免双份维护） */

/** 发送给模型的历史条数上限（保持上下文窗口可控） */
export const MAX_HISTORY = 12;
/** 单条用户文本长度上限 */
export const MAX_TEXT = 200;
/** 对话自动总结：首次触发所需总消息数（约 10 轮） */
export const MIN_SUMMARY_MSGS = 20;
/** 对话自动总结：每次提取的消息块大小 */
export const SUMMARY_CHUNK = 10;
