import { describe, expect, it } from "vitest";
import { consumeSSE } from "./sse";

/** 组装 SSE 响应流：按 chunks 逐块推送（pull 驱动）；failAt 下标处的 pull 触发 stream.error（模拟读流中断） */
function sseOf(chunks: string[], failAt?: number): Response {
  const enc = new TextEncoder();
  let n = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (failAt === n) {
        controller.error(new Error("boom"));
        return;
      }
      if (n < chunks.length) {
        controller.enqueue(enc.encode(chunks[n]));
        n += 1;
      } else {
        controller.close();
      }
    },
  });
  return new Response(stream, { status: 200 });
}

const delta = (content: string) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;

describe("consumeSSE", () => {
  it("逐 delta 解析并回调，返回累计完整文本", async () => {
    const deltas: string[] = [];
    const { full, interrupted } = await consumeSSE(
      sseOf([delta("你"), delta("好"), "data: [DONE]\n\n"]),
      (d) => deltas.push(d),
    );
    expect(deltas).toEqual(["你", "好"]);
    expect(full).toBe("你好");
    expect(interrupted).toBe(false);
  });

  it("[DONE] 标记不产生 delta（流关闭才结束）", async () => {
    const deltas: string[] = [];
    const { full } = await consumeSSE(sseOf([delta("只"), "data: [DONE]\n\n"]), (d) =>
      deltas.push(d),
    );
    expect(deltas).toEqual(["只"]);
    expect(full).toBe("只");
  });

  it("忽略非 data 行与非法 JSON 片段（不中断）", async () => {
    const deltas: string[] = [];
    const { full } = await consumeSSE(
      sseOf(["event: foo\n\n", delta("好"), "data: {broken-json}\n\n", "data: [DONE]\n\n"]),
      (d) => deltas.push(d),
    );
    expect(deltas).toEqual(["好"]);
    expect(full).toBe("好");
  });

  it("读流中断：返回已收到的部分文本 + interrupted 标记（不抛错不丢内容）", async () => {
    const deltas: string[] = [];
    const { full, interrupted } = await consumeSSE(sseOf([delta("部分"), "x"], 1), (d) =>
      deltas.push(d),
    );
    expect(deltas).toEqual(["部分"]);
    expect(full).toBe("部分");
    expect(interrupted).toBe(true);
  });

  it("无 body 的响应返回空串且未中断", async () => {
    const res = new Response(null, { status: 200 });
    expect(await consumeSSE(res, () => {})).toEqual({ full: "", interrupted: false });
  });
});
