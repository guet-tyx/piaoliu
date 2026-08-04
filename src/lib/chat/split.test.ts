import { describe, expect, it } from "vitest";
import { splitStickerMessages, stickerToModelText } from "@/lib/chat/split";

/** R5.2 贴纸消息拆分冒烟（表情与文字独立成消息） */

describe("splitStickerMessages", () => {
  it("无 token 原样单段", () => {
    expect(splitStickerMessages("普通回复")).toEqual([{ text: "普通回复" }]);
  });

  it("句尾带贴纸 → 文字 + 贴纸两段", () => {
    expect(splitStickerMessages("今天真开心~ [sticker: sio-05]")).toEqual([
      { text: "今天真开心~ " },
      { sticker: "sio-05" },
    ]);
  });

  it("句首贴纸 → 贴纸 + 文字", () => {
    expect(splitStickerMessages("[sticker: sio-01] 早上好")).toEqual([
      { sticker: "sio-01" },
      { text: " 早上好" },
    ]);
  });

  it("多个贴纸保持顺序", () => {
    expect(splitStickerMessages("A [sticker: sio-02] B [sticker: sio-03] C")).toEqual([
      { text: "A " },
      { sticker: "sio-02" },
      { text: " B " },
      { sticker: "sio-03" },
      { text: " C" },
    ]);
  });

  it("纯贴纸（无文字）只出贴纸段", () => {
    expect(splitStickerMessages("[sticker: lumen-04]")).toEqual([{ sticker: "lumen-04" }]);
  });

  it("未知 id 不拆，字面文本合并为单一文字段", () => {
    expect(splitStickerMessages("咦 [sticker: nope-99] 呢")).toEqual([
      { text: "咦 [sticker: nope-99] 呢" },
    ]);
  });

  it("已知与未知 token 混排：未知留在文字段", () => {
    expect(splitStickerMessages("好耶 [sticker: sio-05] 再 [sticker: bad-1] 看")).toEqual([
      { text: "好耶 " },
      { sticker: "sio-05" },
      { text: " 再 [sticker: bad-1] 看" },
    ]);
  });
});

describe("stickerToModelText", () => {
  it("输出 [sticker: id] 标记（与 AI 输出 token 同格式）", () => {
    expect(stickerToModelText("sio-01")).toBe("[sticker: sio-01]");
  });
});