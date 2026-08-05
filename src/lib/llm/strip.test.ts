import { describe, expect, it } from "vitest";
import { stripThinkState, stripThinking } from "./strip";

/** 把一串分片帧依次喂入状态机，返回拼接后的剥离结果 */
function feed(frames: string[]): string {
  const strip = stripThinkState();
  return frames.map((f) => strip(f)).join("");
}

describe("stripThinkState 思维链剥离", () => {
  it("单帧完整标签：剥离 think 保留前后文", () => {
    expect(stripThinkState()("<think>推理内容</think>正式回复")).toBe("正式回复");
  });

  it("纯 think 无正文：返回空", () => {
    expect(stripThinkState()("<think>推理内容</think>")).toBe("");
  });

  it("前文 + think + 后文", () => {
    expect(stripThinkState()("前文<think>推理内容</think>后文")).toBe("前文后文");
  });

  it("无 think 标签：原样透传", () => {
    expect(stripThinkState()("普通文本，没有推理")).toBe("普通文本，没有推理");
  });

  it("跨帧切碎标签（智谱 <th / ink / > 分片）", () => {
    const out = feed([
      "<th",
      "ink",
      ">\n用户失眠，我应该用占卜师身份回应。",
      "继续推理……",
      "</th",
      "ink>",
      "「星图在说」今晚的星轨为你亮着。",
    ]);
    expect(out).not.toContain("<think>");
    expect(out).toContain("「星图在说」");
  });

  it("尾部开放标签前缀缓存到下一帧（成对闭合）", () => {
    const strip = stripThinkState();
    expect(strip("abc<th")).toBe("abc"); // 尾部 <th 疑似标签前缀，缓存
    expect(strip("ink>推理</th")).toBe(""); // 进入 think，尾部 </th 前缀缓存
    expect(strip("ink>正文")).toBe("正文"); // 闭合标签补全，正文输出
  });

  it("未闭合 think 持续丢弃直到闭合", () => {
    const strip = stripThinkState();
    expect(strip("开头<think>推理中")).toBe("开头");
    expect(strip("更多推理")).toBe("");
    expect(strip("</think>终于出正文")).toBe("终于出正文");
  });

  it("闭合标签跨帧切碎", () => {
    const strip = stripThinkState();
    expect(strip("<think>推理</th")).toBe("");
    expect(strip("ink>后文")).toBe("后文");
  });
});

/** 把 SSE 文本流经 stripThinking 后收集全部输出 */
async function feedStream(frames: string[]): Promise<string> {
  const encoder = new TextEncoder();
  const src = new ReadableStream<Uint8Array>({
    start(c) {
      for (const f of frames) c.enqueue(encoder.encode(f));
      c.close();
    },
  });
  const out = stripThinking(src);
  const reader = out.getReader();
  let all = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    all += new TextDecoder().decode(value);
  }
  return all;
}

describe("stripThinking reasoning_content 过滤（V2.8 网关 agnes/DeepSeek/Qwen）", () => {
  const frame = (delta: unknown) =>
    `data: ${JSON.stringify({ choices: [{ index: 0, delta }] })}\n\n`;

  it("纯 reasoning_content 帧被整帧丢弃", async () => {
    const out = await feedStream([
      frame({ reasoning_content: "思考中……", role: "assistant" }),
      frame({ content: "正式回复" }),
      frame({ reasoning_content: "更多推理" }),
      frame({ content: "尾巴" }),
      frame(""),
      "data: [DONE]\n\n",
    ]);
    expect(out).not.toContain("reasoning_content");
    expect(out).toContain("正式回复");
    expect(out).toContain("尾巴");
  });

  it("content 与 reasoning_content 同帧：保留 content 剥掉推理字段", async () => {
    const out = await feedStream([
      frame({ content: "你好", reasoning_content: "推理" }),
      "data: [DONE]\n\n",
    ]);
    expect(out).toContain("你好");
    expect(out).not.toContain("推理");
    expect(out).not.toContain("reasoning_content");
  });

  it("仍剥离 content 内的 <think> 标签", async () => {
    const out = await feedStream([
      frame({ content: "<think>推理</think>正文" }),
      "data: [DONE]\n\n",
    ]);
    expect(out).toContain("正文");
    expect(out).not.toContain("<think>");
  });
});
