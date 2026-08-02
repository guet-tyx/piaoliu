import { BAD_WORDS } from "@/data/bad-words";

interface SafetyResult {
  ok: boolean;
  /** 命中的词（用于提示，不展示原文） */
  word?: string;
}

/**
 * 本地词库即时拦截（NFR-1 第一道防线，纯体验层）；
 * 真实模式下服务端 RPC 内 has_bad_word() 为权威校验（不可绕过）。
 */
export function isSafeText(text: string): SafetyResult {
  for (const w of BAD_WORDS) {
    if (w && text.includes(w)) {
      return { ok: false, word: w };
    }
  }
  return { ok: true };
}
