import { describe, expect, it } from "vitest";
import { ttsTextOf } from "@/lib/tts/clean";

describe("ttsTextOf 朗读文本清洗", () => {
  it("剥掉贴纸 token，只保留文字（PRD §5.2）", () => {
    const out = ttsTextOf("今天真开心~ [sticker: sio-05] 晚安");
    expect(out).not.toContain("[sticker:");
    expect(out).toContain("今天真开心~");
    expect(out).toContain("晚安");
  });

  it("剥掉歌单/频道推荐卡 token", () => {
    const out = ttsTextOf("推荐 [playlist: pl-stardust-electro] 和 [channel: ch-night] 给你");
    expect(out).not.toContain("[playlist:");
    expect(out).not.toContain("[channel:");
    expect(out).toContain("推荐");
  });

  it("保留 [music: 歌名] 为歌名（可朗读内容）", () => {
    const out = ttsTextOf("送你一首 [music: 星尘]");
    expect(out).toContain("星尘");
    expect(out).not.toContain("[music:");
  });

  it("剥离 Markdown 标记（粗体/斜体/列表/引用）", () => {
    const out = ttsTextOf("**晚安**\n- 第一首\n- 第二首\n> 星海语录");
    expect(out).not.toContain("**");
    expect(out).toContain("晚安");
    expect(out).toContain("第一首");
    expect(out).toContain("星海语录");
  });

  it("纯 token 文本清洗后为空串", () => {
    expect(ttsTextOf("[sticker: sio-05] [playlist: pl-rain-piano]")).toBe("");
  });

  it("空串/空白安全", () => {
    expect(ttsTextOf("")).toBe("");
    expect(ttsTextOf("   ")).toBe("");
  });
});
