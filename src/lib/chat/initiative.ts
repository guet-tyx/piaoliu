/**
 * 对话主动性判定（人机感 P1-⑤）：
 * AI 不能永远被动回答——每隔几轮在回复末尾自然反问/开启新话题。
 * 频率随用户输入节奏自适应：短回复少主动（怕打扰），长回复多主动（聊得开），
 * 用户明确想休息时立即停止。纯逻辑可测。
 */

/** 明确想结束/休息的暗示：命中即不主动（尊重用户边界） */
const REST_HINTS = ["累了", "想休息", "休息一下", "困了", "不聊了", "晚安吧", "就这样吧"];

/** 短回复（字少，可能只是附和）→ 降低主动频率 */
const SHORT_LEN = 20;
/** 长回复（聊得开）→ 提高主动频率 */
const LONG_LEN = 80;
/** 默认主动间隔（轮） */
const DEFAULT_CYCLE = 4;
/** 短回复间隔（轮） */
const SHORT_CYCLE = 8;
/** 长回复间隔（轮） */
const LONG_CYCLE = 3;

/**
 * 本轮是否该主动反问/开启新话题。
 * @param userText 用户刚发的文本（长度决定节奏）
 * @param turnCount 该角色累计回合数（≥1 才可能主动）
 */
export function shouldInitiate(userText: string, turnCount: number): boolean {
  if (turnCount < 1) return false;
  if (REST_HINTS.some((w) => userText.includes(w))) return false;
  const cycle = userText.length < SHORT_LEN ? SHORT_CYCLE : userText.length > LONG_LEN ? LONG_CYCLE : DEFAULT_CYCLE;
  return turnCount % cycle === 0;
}
