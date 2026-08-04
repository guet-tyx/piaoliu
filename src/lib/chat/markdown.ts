/**
 * R3/R5 轻量 Markdown 解析器：
 * - 纯函数、零 React 依赖，返回结构树由渲染层转 JSX（node 环境可单测）；
 * - 支持：**粗体** / *斜体* / ~~删除线~~ / > 引用 / - 无序列表 / 1. 有序列表 / --- 分割线 / 段落；
 * - [music: 歌名] / [sticker: id] / [playlist: id] / [channel: id] 作为行内 token 保留，
 *   由渲染层替换为 chip / 表情包 / 推荐卡片（P3-03）；
 * - 安全：不解析任何 HTML 标签，一律按纯文本输出。
 */

import { stickerOf } from "@/data/stickers";

/** 行内节点 */
export type MarkdownInline =
  | { type: "text"; text: string }
  | { type: "strong"; children: MarkdownInline[] }
  | { type: "em"; children: MarkdownInline[] }
  | { type: "del"; children: MarkdownInline[] }
  | { type: "music"; name: string }
  | { type: "sticker"; id: string }
  | { type: "playlist"; id: string }
  | { type: "channel"; id: string };

/** 块级节点 */
export type MarkdownBlock =
  | { type: "p"; children: MarkdownInline[] }
  | { type: "blockquote"; children: MarkdownBlock[] }
  | { type: "list"; ordered: boolean; items: MarkdownInline[][] }
  | { type: "hr" };

/** 行首有序列表序号（限 1-3 位，避免「2026. 3月」被误判） */
const OL_RE = /^\d{1,3}\.\s/;

/**
 * 行内解析：** 粗体 优先于 * 斜体；* 两侧必须为非空白字符（防 2*3 误判）；
 * 未闭合标记按字面文本输出（流式半成品天然安全）。
 * 相邻纯文本自动合并为单个 text 节点（如 2*3=6 拆段后拼接回 "2*3=6"）。
 */
export function parseInline(text: string): MarkdownInline[] {
  const nodes: MarkdownInline[] = [];
  /** 追加纯文本：与相邻 text 节点合并（避免同一句话被拆成多段节点） */
  const pushText = (chunk: string) => {
    const last = nodes[nodes.length - 1];
    if (last && last.type === "text") last.text += chunk;
    else nodes.push({ type: "text", text: chunk });
  };

  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    // ** 粗体
    if (ch === "*" && text[i + 1] === "*") {
      const close = text.indexOf("**", i + 2);
      if (close > i + 2) {
        nodes.push({ type: "strong", children: parseInline(text.slice(i + 2, close)) });
        i = close + 2;
        continue;
      }
      pushText("**");
      i += 2;
      continue;
    }
    // * 斜体：内容非空、首尾非空白、不含 *、且闭合后不紧跟 *（避免与 ** 冲突）
    if (ch === "*") {
      const close = text.indexOf("*", i + 1);
      const content = close > i + 1 ? text.slice(i + 1, close) : "";
      if (
        content.length > 0 &&
        !/^\s|\s$/.test(content) &&
        !content.includes("*") &&
        text[close + 1] !== "*"
      ) {
        nodes.push({ type: "em", children: parseInline(content) });
        i = close + 1;
        continue;
      }
      pushText("*");
      i += 1;
      continue;
    }
    // ~~ 删除线
    if (ch === "~" && text[i + 1] === "~") {
      const close = text.indexOf("~~", i + 2);
      if (close > i + 2) {
        nodes.push({ type: "del", children: parseInline(text.slice(i + 2, close)) });
        i = close + 2;
        continue;
      }
      pushText("~~");
      i += 2;
      continue;
    }
    // [music: 歌名] → 音乐 token（渲染层替换为 chip）
    if (ch === "[" && text.startsWith("[music:", i)) {
      const close = text.indexOf("]", i + 7);
      if (close > i + 7) {
        nodes.push({ type: "music", name: text.slice(i + 7, close).trim() });
        i = close + 1;
        continue;
      }
    }
    // [sticker: id] → 表情包 token（R5；未知 id 由渲染层兜底为字面文本）
    if (ch === "[" && text.startsWith("[sticker:", i)) {
      const close = text.indexOf("]", i + 9);
      if (close > i + 9) {
        nodes.push({ type: "sticker", id: text.slice(i + 9, close).trim() });
        i = close + 1;
        continue;
      }
    }
    // [playlist: id] → 歌单推荐 token（P3-03）
    if (ch === "[" && text.startsWith("[playlist:", i)) {
      const close = text.indexOf("]", i + 10);
      if (close > i + 10) {
        nodes.push({ type: "playlist", id: text.slice(i + 10, close).trim() });
        i = close + 1;
        continue;
      }
    }
    // [channel: id] → 频道推荐 token（P3-03）
    if (ch === "[" && text.startsWith("[channel:", i)) {
      const close = text.indexOf("]", i + 9);
      if (close > i + 9) {
        nodes.push({ type: "channel", id: text.slice(i + 9, close).trim() });
        i = close + 1;
        continue;
      }
    }
    // 普通文本：扫描到下一个特殊字符（* ~ [）为止
    const next = /[*~[]/.exec(text.slice(i));
    if (!next) {
      pushText(text.slice(i));
      break;
    }
    const idx = i + next.index;
    if (idx > i) pushText(text.slice(i, idx));
    i = idx;
  }
  return nodes;
}

/**
 * 块级解析：
 * 1. 按连续空行切分段落（\n\s*\n）；
 * 2. 段内逐行分类并合并相邻同类行：> 引用（块内递归）、- 无序列表、1. 有序列表、--- 分割线、段落；
 * 3. 段落内单换行保留（渲染层 white-space: pre-wrap 呈现）。
 */
export function parseMarkdown(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  for (const raw of text.split(/\n\s*\n/)) {
    const lines = raw.split("\n");
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      // 引用块：连续 > 行合并，去前缀后递归（支持块内段落/列表/行内）
      if (/^>\s?/.test(line)) {
        const refs: string[] = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          refs.push(lines[i].replace(/^>\s?/, ""));
          i += 1;
        }
        blocks.push({ type: "blockquote", children: parseMarkdown(refs.join("\n")) });
        continue;
      }
      // 无序列表
      if (/^-\s/.test(line)) {
        const items: MarkdownInline[][] = [];
        while (i < lines.length && /^-\s/.test(lines[i])) {
          items.push(parseInline(lines[i].replace(/^-\s/, "").trim()));
          i += 1;
        }
        blocks.push({ type: "list", ordered: false, items });
        continue;
      }
      // 有序列表
      if (OL_RE.test(line)) {
        const items: MarkdownInline[][] = [];
        while (i < lines.length && OL_RE.test(lines[i])) {
          items.push(parseInline(lines[i].replace(OL_RE, "").trim()));
          i += 1;
        }
        blocks.push({ type: "list", ordered: true, items });
        continue;
      }
      // 分割线（≥3 个 - 的独立行）
      if (/^-{3,}\s*$/.test(line.trim())) {
        blocks.push({ type: "hr" });
        i += 1;
        continue;
      }
      // 段落：合并至下一个块级标记行
      const para: string[] = [];
      while (
        i < lines.length &&
        !/^>\s?/.test(lines[i]) &&
        !/^-\s/.test(lines[i]) &&
        !OL_RE.test(lines[i]) &&
        !/^-{3,}\s*$/.test(lines[i].trim())
      ) {
        para.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: "p", children: parseInline(para.join("\n").trim()) });
    }
  }
  return blocks;
}

/** 行内节点递归拼接为纯文本（R4 复制用：剥离 Markdown 标记与 [music:] 标签） */
function inlineText(nodes: MarkdownInline[]): string {
  let out = "";
  for (const n of nodes) {
    if (n.type === "text") out += n.text;
    else if (n.type === "music") out += n.name;
    else if (n.type === "sticker") out += stickerOf(n.id)?.name ?? n.id;
    else if (n.type === "playlist") out += `[歌单推荐:${n.id}]`;
    else if (n.type === "channel") out += `[频道推荐:${n.id}]`;
    else out += inlineText(n.children);
  }
  return out;
}

/** 块数组 → 纯文本：引用递归展开、列表每项前加 -、分割线跳过 */
function blocksText(blocks: MarkdownBlock[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === "p") parts.push(inlineText(b.children));
    else if (b.type === "blockquote") parts.push(blocksText(b.children));
    else if (b.type === "list")
      parts.push(b.items.map((item) => `- ${inlineText(item)}`).join("\n"));
    // hr：跳过
  }
  return parts.filter((s) => s.length > 0).join("\n\n");
}

/**
 * 消息原始文本 → 复制用的纯文本：
 * **粗** → 粗；*斜* → 斜；[music: 信风] → 信风；列表/引用/段落按块分隔。
 */
export function plainTextOf(text: string): string {
  return blocksText(parseMarkdown(text));
}
