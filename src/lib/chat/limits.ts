/** 聊天消息/文本上限（V2.6 共享常量：route 与前端 store 共用，避免双份维护） */

/** 发送给模型的历史条数上限（人机感 P0-③：12→24，约 12 轮对话，配合摘要防失忆） */
export const MAX_HISTORY = 24;
/** 单条用户文本长度上限 */
export const MAX_TEXT = 200;
/** 聊天消息 localStorage 存储上限（防无限增长；远超当前用量，裁剪最旧消息） */
export const MAX_STORED_MESSAGES = 300;
/** 单次 /api/chat 请求体消息条数上限（防异常大包；正常客户端只发最近 MAX_HISTORY 条） */
export const MAX_API_MESSAGES = 200;
/** 对话自动总结：首次触发所需总消息数（约 10 轮） */
export const MIN_SUMMARY_MSGS = 20;
/** 对话自动总结：每次提取的消息块大小 */
export const SUMMARY_CHUNK = 10;
/** TTS 朗读：单条文本长度上限（超长不朗读，体验差） */
export const MAX_TTS_TEXT = 500;
/** TTS 朗读：浏览器内存缓存条数上限（LRU 淘汰） */
export const TTS_CACHE_MAX = 50;
