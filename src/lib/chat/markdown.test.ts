import { describe, expect, it } from "vitest";
import { parseMarkdown, plainTextOf } from "@/lib/chat/markdown";

/** R3 排版解析冒烟（对照验收 #1-#9/#11/#12 + 边界防误判） */

const p = (text: string) => ({
  type: "p",
  children: [{ type: "text", text }],
});

describe("行内排版（验收 #1-#3）", () => {
  it("**粗体** → strong", () => {
    expect(parseMarkdown("推荐**信风**吧")).toEqual([
      {
        type: "p",
        children: [
          { type: "text", text: "推荐" },
          { type: "strong", children: [{ type: "text", text: "信风" }] },
          { type: "text", text: "吧" },
        ],
      },
    ]);
  });

  it("*斜体* → em，不显示星号", () => {
    expect(parseMarkdown("*星海语录*")).toEqual([
      { type: "p", children: [{ type: "em", children: [{ type: "text", text: "星海语录" }] }] },
    ]);
  });

  it("~~删除线~~ → del", () => {
    expect(parseMarkdown("~~删掉这句~~")).toEqual([
      { type: "p", children: [{ type: "del", children: [{ type: "text", text: "删掉这句" }] }] },
    ]);
  });

  it("粗体内可嵌斜体（**A *B* C**）", () => {
    expect(parseMarkdown("**A *B* C**")).toEqual([
      {
        type: "p",
        children: [
          {
            type: "strong",
            children: [
              { type: "text", text: "A " },
              { type: "em", children: [{ type: "text", text: "B" }] },
              { type: "text", text: " C" },
            ],
          },
        ],
      },
    ]);
  });
});

describe("块级排版（验收 #4-#8）", () => {
  it("> 引用 → blockquote（多行合并）", () => {
    expect(parseMarkdown("> 第一行\n> 第二行")).toEqual([
      { type: "blockquote", children: [p("第一行\n第二行")] },
    ]);
  });

  it("- 无序列表 → ul 结构", () => {
    expect(parseMarkdown("- 星の声\n- 夜航")).toEqual([
      { type: "list", ordered: false, items: [p("星の声").children, p("夜航").children] },
    ]);
  });

  it("1. 有序列表 → ol 结构", () => {
    expect(parseMarkdown("1. 第一名\n2. 第二名")).toEqual([
      { type: "list", ordered: true, items: [p("第一名").children, p("第二名").children] },
    ]);
  });

  it("--- 分割线 → hr", () => {
    expect(parseMarkdown("上面\n---\n下面")).toEqual([p("上面"), { type: "hr" }, p("下面")]);
  });

  it("连续空行 → 段落分离（验收 #8）", () => {
    expect(parseMarkdown("第一段\n\n第二段")).toEqual([p("第一段"), p("第二段")]);
  });

  it("段落内单换行保留为文本换行", () => {
    expect(parseMarkdown("第一行\n第二行")).toEqual([p("第一行\n第二行")]);
  });
});

describe("音乐 chip 兼容（验收 #9）", () => {
  it("[music: 歌名] 解析为 music token", () => {
    expect(parseMarkdown("今晚听 [music: 信风] 吧")).toEqual([
      {
        type: "p",
        children: [
          { type: "text", text: "今晚听 " },
          { type: "music", name: "信风" },
          { type: "text", text: " 吧" },
        ],
      },
    ]);
  });

  it("与粗体共存于同一段落", () => {
    expect(parseMarkdown("推荐 **信风**：[music: 信风]")).toEqual([
      {
        type: "p",
        children: [
          { type: "text", text: "推荐 " },
          { type: "strong", children: [{ type: "text", text: "信风" }] },
          { type: "text", text: "：" },
          { type: "music", name: "信风" },
        ],
      },
    ]);
  });
});

describe("嵌套兼容（验收 #11）", () => {
  it("引用块内可含斜体与列表", () => {
    expect(parseMarkdown("> *语录*：听歌吧\n> - 星の声\n> - 夜航")).toEqual([
      {
        type: "blockquote",
        children: [
          {
            type: "p",
            children: [{ type: "em", children: [{ type: "text", text: "语录" }] }, { type: "text", text: "：听歌吧" }],
          },
          { type: "list", ordered: false, items: [p("星の声").children, p("夜航").children] },
        ],
      },
    ]);
  });

  it("列表项内可含粗体", () => {
    expect(parseMarkdown("- **重点**歌")).toEqual([
      {
        type: "list",
        ordered: false,
        items: [[
          { type: "strong", children: [{ type: "text", text: "重点" }] },
          { type: "text", text: "歌" },
        ]],
      },
    ]);
  });
});

describe("安全与边界（验收 #12）", () => {
  it("HTML 标签不解析，按字面文本输出", () => {
    expect(parseMarkdown("<b>不是粗体</b> <script>alert(1)</script>")).toEqual([
      p("<b>不是粗体</b> <script>alert(1)</script>"),
    ]);
  });

  it("2*3=6 不误判为斜体", () => {
    expect(parseMarkdown("2*3=6")).toEqual([p("2*3=6")]);
  });

  it("未闭合的 * 标记按字面输出（流式半成品安全）", () => {
    expect(parseMarkdown("**粗")).toEqual([p("**粗")]);
    expect(parseMarkdown("*斜")).toEqual([p("*斜")]);
    expect(parseMarkdown("~~删")).toEqual([p("~~删")]);
  });

  it("序号超 3 位不误判为有序列表（2026. 3月）", () => {
    expect(parseMarkdown("2026. 3月")).toEqual([p("2026. 3月")]);
  });
});

describe("plainTextOf（R4 复制：剥离标记，验收 #13）", () => {
  it("剥离粗体/斜体/删除线标记", () => {
    expect(plainTextOf("**粗体**和*斜体*和~~删除~~")).toBe("粗体和斜体和删除");
  });

  it("[music: 歌名] 只保留歌名", () => {
    expect(plainTextOf("今晚听 [music: 信风] 吧")).toBe("今晚听 信风 吧");
  });

  it("嵌套（引用内斜体/列表内粗体）同样剥离", () => {
    expect(plainTextOf("> *语录*\n\n- **重点**歌")).toBe("语录\n\n- 重点歌");
  });

  it("纯文本原样返回", () => {
    expect(plainTextOf("普通的一句话")).toBe("普通的一句话");
  });

  it("空文本返回空串", () => {
    expect(plainTextOf("")).toBe("");
  });
});

describe("表情包 token（R5）", () => {
  it("[sticker: id] 解析为 sticker token", () => {
    expect(parseMarkdown("来一张 [sticker: sio-01] 充实")).toEqual([
      {
        type: "p",
        children: [
          { type: "text", text: "来一张 " },
          { type: "sticker", id: "sio-01" },
          { type: "text", text: " 充实" },
        ],
      },
    ]);
  });

  it("与 Markdown / music token 共存于同段", () => {
    expect(parseMarkdown("**加油**！[music: 信风] [sticker: sio-03]")).toEqual([
      {
        type: "p",
        children: [
          { type: "strong", children: [{ type: "text", text: "加油" }] },
          { type: "text", text: "！" },
          { type: "music", name: "信风" },
          { type: "text", text: " " },
          { type: "sticker", id: "sio-03" },
        ],
      },
    ]);
  });

  it("未知 id 仍解析为 sticker token（渲染层兜底字面文本）", () => {
    expect(parseMarkdown("[sticker: nope-99]")).toEqual([
      { type: "p", children: [{ type: "sticker", id: "nope-99" }] },
    ]);
  });

  it("plainTextOf 剥离 token 输出表情名", () => {
    expect(plainTextOf("今天超开心 [sticker: sio-05]")).toBe("今天超开心 太棒了");
  });
});

describe("推荐 token（P3-03）", () => {
  it("[playlist: id] 解析为 playlist token", () => {
    expect(parseMarkdown("听听 [playlist: pl-night-postrock] 吧")).toEqual([
      {
        type: "p",
        children: [
          { type: "text", text: "听听 " },
          { type: "playlist", id: "pl-night-postrock" },
          { type: "text", text: " 吧" },
        ],
      },
    ]);
  });

  it("[channel: id] 解析为 channel token", () => {
    expect(parseMarkdown("去 [channel: ch-night] 放松")).toEqual([
      {
        type: "p",
        children: [
          { type: "text", text: "去 " },
          { type: "channel", id: "ch-night" },
          { type: "text", text: " 放松" },
        ],
      },
    ]);
  });

  it("与 music token 共存，顺序正确", () => {
    expect(parseMarkdown("[music: 信风] [playlist: pl-jp-breeze] [channel: ch-jp]")).toEqual([
      {
        type: "p",
        children: [
          { type: "music", name: "信风" },
          { type: "text", text: " " },
          { type: "playlist", id: "pl-jp-breeze" },
          { type: "text", text: " " },
          { type: "channel", id: "ch-jp" },
        ],
      },
    ]);
  });

  it("plainTextOf 剥离推荐 token 输出可读占位", () => {
    expect(plainTextOf("推荐 [playlist: pl-night-postrock]")).toBe("推荐 [歌单推荐:pl-night-postrock]");
  });

  it("playlist 冒号后含空格也能解析", () => {
    expect(parseMarkdown("[playlist: pl-study-piano]")).toEqual([
      { type: "p", children: [{ type: "playlist", id: "pl-study-piano" }] },
    ]);
  });
});
