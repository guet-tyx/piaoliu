/**
 * OpenAI 兼容 SSE 消费（V2.7 从 stores/chat.ts 拆出）：
 * 解析 `data: {json}` / `data: [DONE]`，逐 delta 回调，返回累计完整文本。
 * 读循环异常透传（abort / 网络中断），由调用方决定收尾策略（部分文本落盘 / 降级）。
 * 中止由调用方通过 fetch 的 AbortSignal 控制（abort 后 read 抛错）。
 */

export async function consumeSSE(
  res: Response,
  onDelta: (text: string) => void,
): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
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
    // 读流中断（abort/网络）：透传给调用方收尾（已收到的部分文本在 full 中）
    throw new Error("sse-read-failed");
  }
  return full;
}
