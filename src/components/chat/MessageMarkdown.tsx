"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { TRACKS } from "@/data/tracks";
import { stickerOf, stickerSrc, type Sticker } from "@/data/stickers";
import { PlaylistRecommendCard } from "@/components/chat/PlaylistRecommendCard";
import { ChannelRecommendCard } from "@/components/chat/ChannelRecommendCard";
import { parseMarkdown, type MarkdownBlock, type MarkdownInline } from "@/lib/chat/markdown";
import styles from "./MessageList.module.css";

/** 歌曲 chip：[music: X] 解析渲染（匹配 TRACKS 显示封面） */
export function MusicChip({ name }: { name: string }) {
  const track = TRACKS.find((t) => t.t === name || t.t.includes(name) || name.includes(t.t));
  if (!track) {
    return (
      <span className={styles.musicChip}>
        <i className={styles.musicIcon} aria-hidden="true">
          ♪
        </i>
        {name}
      </span>
    );
  }
  return (
    <span className={styles.musicChip} title={`${track.t} · ${track.s}`}>
      <Image src={track.cover} alt="" width={18} height={18} className={styles.musicCover} />
      {track.t}
    </span>
  );
}

/** R5 表情包贴纸：块级居中大图（黑色贴纸底，气泡内融合）。
 * unoptimized：贴纸走原始路径 + 版本号（?v=），不经 next/image 优化器，
 * 避免优化器按 URL 缓存旧图（素材更新后强制拉新）。 */
export function StickerImage({ sticker }: { sticker: Sticker }) {
  return (
    <span className={styles.stickerWrap} title={sticker.name}>
      <Image src={stickerSrc(sticker)} alt={sticker.name} fill sizes="140px" unoptimized />
    </span>
  );
}

/** R5.2 独立贴纸消息：气泡内大图居中（与文字消息分开） */
export function StickerCard({ stickerId }: { stickerId: string }) {
  const st = stickerOf(stickerId);
  if (!st) {
    return <span className={styles.stickerMissing}>[贴纸不见了]</span>;
  }
  return (
    <span className={styles.stickerCard} title={st.name}>
      <Image src={stickerSrc(st)} alt={st.name} fill sizes="190px" unoptimized />
    </span>
  );
}

/** 渲染 Markdown 行内节点（text / strong / em / del / music chip / sticker） */
export function renderInline(nodes: MarkdownInline[], keyPrefix: string): ReactNode[] {
  return nodes.map((n, i) => {
    const key = `${keyPrefix}-i${i}`;
    switch (n.type) {
      case "text":
        return n.text;
      case "strong":
        return <strong key={key}>{renderInline(n.children, key)}</strong>;
      case "em":
        return <em key={key}>{renderInline(n.children, key)}</em>;
      case "del":
        return <del key={key}>{renderInline(n.children, key)}</del>;
      case "music":
        return <MusicChip key={key} name={n.name} />;
      case "sticker": {
        const st = stickerOf(n.id);
        // 未知 id：按字面文本兜底（不破图）
        return st ? <StickerImage key={key} sticker={st} /> : n.id;
      }
      case "playlist":
        return <PlaylistRecommendCard key={key} id={n.id} />;
      case "channel":
        return <ChannelRecommendCard key={key} id={n.id} />;
    }
  });
}

/** 渲染 Markdown 块级（p / blockquote / ul / ol / hr） */
export function renderBlock(block: MarkdownBlock, key: string): ReactNode {
  switch (block.type) {
    case "p":
      return <p key={key}>{renderInline(block.children, key)}</p>;
    case "blockquote":
      return (
        <blockquote key={key}>
          {block.children.map((c, i) => renderBlock(c, `${key}-b${i}`))}
        </blockquote>
      );
    case "list": {
      const items = block.items.map((item, i) => (
        <li key={`${key}-li${i}`}>{renderInline(item, `${key}-li${i}`)}</li>
      ));
      return block.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>;
    }
    case "hr":
      return <hr key={key} />;
  }
}

/** 完成/历史消息：Markdown 解析 → JSX（R3 排版） */
export function renderMarkdownText(text: string, keyPrefix: string): ReactNode[] {
  return parseMarkdown(text).map((b, i) => renderBlock(b, `${keyPrefix}-b${i}`));
}

/**
 * 流式消息：仅拆 [music: X] / [sticker: id] token，Markdown 标记按字面文本显示
 * （半成品 `**粗` 不闪烁，streaming → idle 整条切换为排版）。
 */
export function renderPlainChips(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\[(music|sticker|playlist|channel):\s*([^\]]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const kind = m[1];
    const value = m[2].trim();
    if (kind === "music") {
      parts.push(<MusicChip key={`${keyPrefix}-m${i}`} name={value} />);
    } else if (kind === "playlist") {
      parts.push(<PlaylistRecommendCard key={`${keyPrefix}-p${i}`} id={value} />);
    } else if (kind === "channel") {
      parts.push(<ChannelRecommendCard key={`${keyPrefix}-c${i}`} id={value} />);
    } else {
      const st = stickerOf(value);
      parts.push(
        st ? (
          <StickerImage key={`${keyPrefix}-s${i}`} sticker={st} />
        ) : (
          `[sticker: ${value}]`
        ),
      );
    }
    last = m.index + m[0].length;
    i += 1;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
