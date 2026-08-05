import { describe, expect, it } from "vitest";
import {
  nextSummaryChunk,
  formatSummaryChunk,
  splitSummaryOutput,
} from "@/lib/chat/summarize";
import type { ChatMessage } from "@/types/chat";

/** 组装一条消息（sticker 参数可选） */
const msg = (
  id: string,
  role: "user" | "assistant",
  text: string,
  sticker?: string,
): ChatMessage => (sticker ? { id, role, text, at: 0, sticker } : { id, role, text, at: 0 });

/** 生成交替 user/assistant 的 n 条消息 */
const msgs = (n: number): ChatMessage[] =>
  Array.from({ length: n }, (_, i) =>
    msg(`m${i}`, i % 2 === 0 ? "user" : "assistant", `内容${i}`),
  );

describe("nextSummaryChunk 触发判定（PRD：20 条首触发，之后每满 10 条增量）", () => {
  it("少于 20 条不触发", () => {
    expect(nextSummaryChunk(msgs(19), 0)).toBeNull();
  });

  it("恰好 20 条触发第一块 [0,10)", () => {
    expect(nextSummaryChunk(msgs(20), 0)).toEqual({ start: 0, end: 10 });
  });

  it("20 条且已覆盖 10 条时继续触发第二块 [10,20)（每新增 10 条增量）", () => {
    expect(nextSummaryChunk(msgs(20), 10)).toEqual({ start: 10, end: 20 });
  });

  it("30 条且 covered=10 触发第二块 [10,20)", () => {
    expect(nextSummaryChunk(msgs(30), 10)).toEqual({ start: 10, end: 20 });
  });

  it("未覆盖区不足一块不触发（25 条 covered=20）", () => {
    expect(nextSummaryChunk(msgs(25), 20)).toBeNull();
  });

  it("covered 超过消息数（编辑截断）不触发", () => {
    expect(nextSummaryChunk(msgs(15), 20)).toBeNull();
  });
});

describe("formatSummaryChunk 消息块格式化", () => {
  it("按「用户/角色」标注并跳过贴纸消息", () => {
    const chunk = [
      msg("u1", "user", "我叫小明"),
      msg("s1", "user", "", "sio-01"),
      msg("a1", "assistant", "你好小明"),
    ];
    expect(formatSummaryChunk(chunk)).toBe("用户：我叫小明\n角色：你好小明");
  });

  it("纯贴纸块返回空串（无可提取内容）", () => {
    const chunk = [msg("s1", "user", "", "sio-01"), msg("s2", "user", "", "sio-02")];
    expect(formatSummaryChunk(chunk)).toBe("");
  });
});

describe("splitSummaryOutput 输出拆分（人机感 P2-⑧：关键记忆单独抽出）", () => {
  it("普通输出：关键记忆行抽出为 memories，其余归 summary", () => {
    const raw = [
      "用户信息：用户叫小明，养了一只猫叫咪咪",
      "关键话题：聊过考试压力；喜欢后摇音乐",
      "情绪状态：提到考试有些紧张",
      "关键记忆：喜欢后摇音乐；养了一只猫；最近在准备考试",
    ].join("\n");
    expect(splitSummaryOutput(raw)).toEqual({
      summary:
        "用户信息：用户叫小明，养了一只猫叫咪咪\n关键话题：聊过考试压力；喜欢后摇音乐\n情绪状态：提到考试有些紧张",
      memories: "喜欢后摇音乐；养了一只猫；最近在准备考试",
    });
  });

  it("无关键记忆：memories 为空串", () => {
    expect(splitSummaryOutput("用户信息：无\n关键话题：无")).toEqual({
      summary: "用户信息：无\n关键话题：无",
      memories: "",
    });
  });

  it("关键记忆为「无」时不计入", () => {
    expect(splitSummaryOutput("用户信息：用户叫小明\n关键记忆：无")).toEqual({
      summary: "用户信息：用户叫小明",
      memories: "",
    });
  });

  it("「无」单字输出 → 全空", () => {
    expect(splitSummaryOutput("无")).toEqual({ summary: "", memories: "" });
  });

  it("容错：未按类名前缀的行保留在 summary", () => {
    expect(splitSummaryOutput("用户喜欢后摇音乐")).toEqual({
      summary: "用户喜欢后摇音乐",
      memories: "",
    });
  });

  it("V2.8 防污染：英文推理思维链输出 → 整块作废，不注入聊天", () => {
    const raw = [
      'We need to extract memory: user name "uu".',
      "Also note earlier info: user wanted to go camping.",
      "Output categories: user info, key topics, AI recommendation, emotion state, relationship state, key memory.",
    ].join("\n");
    expect(splitSummaryOutput(raw)).toEqual({ summary: "", memories: "" });
  });

  it("V2.8 防污染：多行无格式的中英混合复述垃圾 → 整块作废", () => {
    const raw = [
      "Conversation history:",
      "User: 周末想去露营，你觉得会碰到什么样的风景呀？",
      "Assistant: (response about stars, recommending pl-night-postrock, etc)",
      "Thus we have user name: uu.",
    ].join("\n");
    expect(splitSummaryOutput(raw)).toEqual({ summary: "", memories: "" });
  });

  it("V2.8 防污染：合法类目 + 混入英文推理行 → 英文行丢弃、中文类目保留", () => {
    const raw = [
      "用户信息：用户叫uu，喜欢露营",
      'We need to extract memory: user name "uu"',
      "关键记忆：喜欢露营；名字是uu",
    ].join("\n");
    expect(splitSummaryOutput(raw)).toEqual({
      summary: "用户信息：用户叫uu，喜欢露营",
      memories: "喜欢露营；名字是uu",
    });
  });
});
