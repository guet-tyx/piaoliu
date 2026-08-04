/**
 * TTS 朗读文本清洗（2026-08-04）：
 * - [sticker:/[playlist:/[channel:] token 在朗读前剥掉（贴纸不朗读，PRD §5.2；
 *   歌单/频道推荐卡也不是可朗读内容）；
 * - [music: 歌名] 保留为歌名（plainTextOf 会转成「歌名」）；
 * - Markdown 标记（粗体/列表/引用等）一并剥离。
 * 纯函数，node 可单测。
 */

import { plainTextOf } from "@/lib/chat/markdown";

/** 朗读时整体忽略的 token（贴纸 + 推荐卡） */
const SKIP_TOKEN_RE = /\[(sticker|playlist|channel):[^\]]+\]/g;

export function ttsTextOf(text: string): string {
  return plainTextOf(text.replace(SKIP_TOKEN_RE, "")).trim();
}
