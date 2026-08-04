/**
 * OpenAI 兼容 SSE 消费（V2.7 从 stores/chat.ts 拆出）：
 * 解析 `data: {json}` / `data: [DONE]`，逐 delta 回调。
 * 读流中断（abort / 网络）不抛错：返回 `interrupted: true` 与已收到的部分文本，
 * 由调用方决定收尾策略（部分文本落盘 / 降级），避免「已收到的内容因异常而丢失」。
 */

export interface SseResult {
  /** 累计完整文本（中断时为已收到的部分文本） */
  full: string;
  /** 是否读流中途中断（网络/abort；full 为部分内容） */
  interrupted: boolean;
}

export async function consumeSSE(
  res: Response,
  onDelta: (text: string) => void,
): Promise<SseResult> {
  const reader = res.body?.getReader();
  if (!reader) return { full: "", interrupted: false };
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        for (const line of part.split("\n")) {
          const m = line.match(/^data:\s*(.*)$/);
          if (!m) continue;
          const payload = m[1].trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              full += delta;
              onDelta(delta);
            }
          } catch {
            // 忽略不完整片段
          }
        }
      }
    }
  } catch {
    // 读流中断（abort/网络）：保留已收到的部分文本，标记 interrupted
    return { full, interrupted: true };
  }
  return { full, interrupted: false };
}
