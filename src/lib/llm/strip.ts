/**
 * SSE 思维链剥离（V2.6 从 route.ts 拆出，纯逻辑可单测）：
 * Qwen3 / MiniMax / 智谱 z1 等模型的 OpenAI 兼容流会输出 <think>…</think> 推理块，
 * 污染角色对话。方案：服务端重建 SSE 帧，仅剥离 delta.content 内的思维链。
 * 兼容标签被切碎成多帧发送（如智谱 <th / ink / >）：未完成的标签前缀先缓存，补全后剥除。
 */

/** 思维链状态机：跨 SSE 帧持续追踪 <think>…</think>，返回剥离后的内容 */
export function stripThinkState() {
  const OPEN = "<think>";
  const CLOSE = "</think>";
  // 最长优先的标签前缀（含完整标签本身，用于整帧都是前缀的情况）
  const OPEN_PREFIXES = ["<think", "<thin", "<thi", "<th", "<t", "<"];
  const CLOSE_PREFIXES = ["</think", "</thin", "</thi", "</th", "</t", "</"];

  let inThink = false;
  let pending = "";

  /** s 的尾部是否为某标签前缀；是则返回最长前缀，否则 null */
  const tailPrefix = (s: string, prefixes: string[]): string | null => {
    for (const p of prefixes) {
      if (s.endsWith(p)) return p;
    }
    return null;
  };

  return (content: string): string => {
    let buf = pending + content;
    pending = "";
    let out = "";
    while (buf.length > 0) {
      if (inThink) {
        const i = buf.indexOf(CLOSE);
        if (i === -1) {
          // 思维链未闭合：若尾部是闭合标签前缀则缓存等下一帧，否则整帧丢弃
          const tail = tailPrefix(buf, CLOSE_PREFIXES);
          if (tail) pending = tail;
          return out;
        }
        inThink = false;
        buf = buf.slice(i + CLOSE.length).replace(/^\s+/, "");
        continue;
      }
      const i = buf.indexOf(OPEN);
      if (i === -1) {
        const tail = tailPrefix(buf, OPEN_PREFIXES);
        if (tail) {
          out += buf.slice(0, buf.length - tail.length);
          pending = tail;
          return out;
        }
        out += buf;
        break;
      }
      out += buf.slice(0, i);
      buf = buf.slice(i + OPEN.length);
      inThink = true;
    }
    return out;
  };
}

/** 重建 SSE 流：逐帧解析，剥离 delta.content 内的思维链 */
export function stripThinking(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const strip = stripThinkState();
  let sseBuf = "";

  const processFrame = (frame: string): string | null => {
    const lines = frame.split("\n");
    const out: string[] = [];
    for (const line of lines) {
      const m = line.match(/^data:\s*(.*)$/);
      if (!m) {
        out.push(line);
        continue;
      }
      const payload = m[1].trim();
      if (!payload || payload === "[DONE]") {
        out.push(line);
        continue;
      }
      try {
        const json = JSON.parse(payload) as {
          choices?: { delta?: { content?: unknown } }[];
        };
        const delta = json?.choices?.[0]?.delta;
        if (delta && typeof delta.content === "string") {
          const stripped = strip(delta.content);
          delta.content = stripped;
          out.push(`data: ${JSON.stringify(json)}`);
          continue;
        }
      } catch {
        // 非标准帧原样保留
      }
      out.push(line);
    }
    if (out.length === 0) return null;
    return `${out.join("\n")}\n\n`;
  };

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuf += decoder.decode(value, { stream: true });
          const frames = sseBuf.split("\n\n");
          sseBuf = frames.pop() ?? "";
          for (const frame of frames) {
            const out = processFrame(frame);
            if (out) controller.enqueue(encoder.encode(out));
          }
        }
        if (sseBuf.trim()) {
          const out = processFrame(sseBuf);
          if (out) controller.enqueue(encoder.encode(out));
        }
      } catch (e) {
        controller.error(e);
      } finally {
        controller.close();
      }
    },
  });
}
