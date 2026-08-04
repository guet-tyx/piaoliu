/**
 * R5.2 贴纸消息拆分（2026-08-03）：
 * - splitStickerMessages：把含 [sticker: id] 的完整回复文本拆为「文字消息 + 贴纸消息」序列，
 *   使表情与文字成为独立消息（用户侧发送与 AI 侧回复统一）；
 * - 未知 sticker id 的 token 不拆，连续字面文本合并为单一文字段（防错 token 破坏内容）；
 * - stickerToModelText：贴纸消息发给模型时序列化为文本标记（route 校验 text 必填）。
 */

import { stickerOf } from "@/data/stickers";

const STICKER_TOKEN_RE = /\[sticker:\s*([^\]]+)\]/g;

/** 拆分结果：text 与 sticker 互斥的片段 */
export interface StickerSplitPart {
  text?: string;
  sticker?: string;
}

/**
 * 按 [sticker: id] 把整段回复拆成交替的文字段 / 贴纸段：
 * "今天真开心~ [sticker: sio-05] 晚安" →
 * [{ text: "今天真开心~ " }, { sticker: "sio-05" }, { text: " 晚安" }]；
 * 未知 id 的 token 留在文字段；无 token 时返回原样单段。
 */
export function splitStickerMessages(text: string): StickerSplitPart[] {
  const parts: StickerSplitPart[] = [];
  let buf = "";
  const flushText = () => {
    if (buf) {
      parts.push({ text: buf });
      buf = "";
    }
  };

  const re = new RegExp(STICKER_TOKEN_RE.source, STICKER_TOKEN_RE.flags);
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    buf += text.slice(last, m.index);
    const id = m[1].trim();
    if (stickerOf(id)) {
      flushText();
      parts.push({ sticker: id });
    } else {
      // 未知 id：按字面文本继续累积
      buf += m[0];
    }
    last = m.index + m[0].length;
  }
  buf += text.slice(last);
  flushText();
  return parts.length > 0 ? parts : [{ text }];
}

/** 贴纸消息 → 模型可见文本标记（与 AI 输出 token 同格式） */
export function stickerToModelText(stickerId: string): string {
  return `[sticker: ${stickerId}]`;
}