"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { personaOf } from "@/data/chat-personas";
import type { ChatMessage } from "@/types/chat";
import { formatTime } from "@/lib/chat/format";
import { useLongPress } from "@/hooks/useLongPress";
import { MessageActions } from "@/components/chat/MessageActions";
import { MessageEditInput } from "@/components/chat/MessageEditInput";
import {
  StickerCard,
  renderMarkdownText,
  renderPlainChips,
} from "@/components/chat/MessageMarkdown";
import styles from "./MessageList.module.css";

interface MessageRowProps {
  roleId: string;
  message: ChatMessage;
  samePrev: boolean;
  /** 本条是否为流式输出中的 draft */
  streaming: boolean;
  /** AI 思考/流式：操作按钮全部禁用（验收 #17） */
  busy: boolean;
  /** 是否处于编辑模式（仅用户消息） */
  isEditing: boolean;
  /** TTS：本条 AI 回复是否正在朗读（气泡底部细进度条） */
  playing: boolean;
  /** TTS 播放进度 0-100（Web Speech 兜底无进度时为 0） */
  playPct: number;
  onStartEdit: () => void;
  onEditSave: (text: string) => void;
  onEditCancel: () => void;
  onRetry: () => void;
  onCopy: () => void;
  onDelete: () => void;
  /** 移动端长按：弹出底部操作菜单 */
  onLongPress: () => void;
}

/**
 * R4 单条消息行：PC hover 悬浮操作栏（进入即显、离开 0.3s 后隐）+
 * 移动端长按触发底部菜单 + 编辑模式切换。
 */
export function MessageRow({
  roleId,
  message,
  samePrev,
  streaming,
  busy,
  isEditing,
  playing,
  playPct,
  onStartEdit,
  onEditSave,
  onEditCancel,
  onRetry,
  onCopy,
  onDelete,
  onLongPress,
}: MessageRowProps) {
  const persona = personaOf(roleId);
  const [hovered, setHovered] = useState(false);
  /** R5.2 独立贴纸消息（与文字分开） */
  const isSticker = Boolean(message.sticker);
  const hoverTimer = useRef<number | null>(null);
  const longPress = useLongPress(onLongPress);

  const handleEnter = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    setHovered(true);
  };
  const handleLeave = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHovered(false), 300);
  };
  useEffect(
    () => () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    },
    [],
  );

  if (message.role === "user") {
    return (
      <div
        className={`${styles.rowUser}${samePrev ? ` ${styles.groupedUser}` : ""}`}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        {...longPress}
      >
        <div className={`${styles.bubbleUser}${samePrev ? ` ${styles.flatUser}` : ""}`}>
          {isSticker ? (
            <>
              <StickerCard stickerId={message.sticker as string} />
              <span className={styles.timeUser}>{formatTime(message.at)}</span>
              <MessageActions
                roleId={roleId}
                message={message}
                visible={hovered}
                busy={busy}
                onEdit={onStartEdit}
                onRetry={onRetry}
                onCopy={onCopy}
                onDelete={onDelete}
              />
            </>
          ) : isEditing ? (
            <MessageEditInput
              initial={message.text}
              busy={busy}
              onCancel={onEditCancel}
              onSave={onEditSave}
            />
          ) : (
            <>
              <div className={styles.msgText}>{renderMarkdownText(message.text, message.id)}</div>
              <span className={styles.timeUser}>{formatTime(message.at)}</span>
              <MessageActions
                roleId={roleId}
                message={message}
                visible={hovered}
                busy={busy}
                onEdit={onStartEdit}
                onRetry={onRetry}
                onCopy={onCopy}
                onDelete={onDelete}
              />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.rowAi}${samePrev ? ` ${styles.groupedAi}` : ""}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      {...longPress}
    >
      {!samePrev && (
        <span className={styles.avatarAi}>
          <Image src={persona.avatar} alt={persona.name} fill sizes="44px" />
        </span>
      )}
      <div className={`${styles.bubbleAi}${samePrev ? ` ${styles.flatAi}` : ""}`}>
        <span className={styles.accent} aria-hidden="true" />
        {isSticker ? (
          <StickerCard stickerId={message.sticker as string} />
        ) : (
          <div className={styles.msgText}>
            {streaming ? renderPlainChips(message.text, message.id) : renderMarkdownText(message.text, message.id)}
          </div>
        )}
        <span className={styles.timeAi}>{formatTime(message.at)}</span>
        {streaming && <i className={styles.cursor} aria-hidden="true" />}
        <MessageActions
          roleId={roleId}
          message={message}
          visible={hovered}
          busy={busy}
          onEdit={onStartEdit}
          onRetry={onRetry}
          onCopy={onCopy}
          onDelete={onDelete}
        />
        {/* TTS 朗读进度：气泡底部细进度条（Web Speech 兜底无进度不显示） */}
        {playing && playPct > 0 && (
          <span className={styles.ttsBar} aria-hidden="true">
            <i style={{ width: `${playPct}%` }} />
          </span>
        )}
      </div>
    </div>
  );
}
