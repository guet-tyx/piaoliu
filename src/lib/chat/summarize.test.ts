import { describe, expect, it } from "vitest";
import { nextSummaryChunk, formatSummaryChunk } from "@/lib/chat/summarize";
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
