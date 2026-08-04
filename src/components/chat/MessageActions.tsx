"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/types/chat";
import { MAX_TTS_TEXT } from "@/lib/chat/limits";
import { useTtsStore } from "@/stores/tts";
import styles from "./MessageActions.module.css";

interface MessageActionsProps {
  roleId: string;
  message: ChatMessage;
  /** 是否显示（父级 hover/长按控制）；显隐带淡入上浮动效 */
  visible: boolean;
  /** AI 思考/流式时全部禁用（验收 #17） */
  busy: boolean;
  onEdit: () => void;
  onRetry: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

/**
 * R4 PC 悬浮操作栏（§2.1/§7.1）：
 * 用户消息 ✏️📋🗑️ / AI 消息 🔊🔁📋🗑️；删除走二次确认（3s 复位）。
 * 🔊 朗读（TTS）：仅 AI 文字消息；流式期间禁用，播放中变 ⏹（再点停止）。
 */
export function MessageActions({
  roleId,
  message,
  visible,
  busy,
  onEdit,
  onRetry,
  onCopy,
  onDelete,
}: MessageActionsProps) {
  const isUser = message.role === "user";
  /** R5.2 独立贴纸消息：无编辑（user）/重试（AI），仅复制/删除；贴纸也不朗读 */
  const isSticker = Boolean(message.sticker);
  const isAiText = !isUser && !isSticker && Boolean(message.text.trim());
  const tooLong = message.text.length > MAX_TTS_TEXT;

  // TTS 全局播放状态（仅本消息相关）
  const loading = useTtsStore((s) => s.loadingKey === message.id);
  const playing = useTtsStore((s) => s.playingKey === message.id);
  const error = useTtsStore((s) => s.errorKey === message.id);
  const errorText = useTtsStore((s) => s.errorText);

  const [confirming, setConfirming] = useState(false);
  const confirmTimer = useRef<number | null>(null);
  // 渲染期调整：操作栏隐藏时复位确认态（下次悬停从初始态开始）
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (!visible && confirming) setConfirming(false);
  }

  // 删除二次确认：3 秒未再点自动复位
  useEffect(() => {
    if (!confirming) return;
    confirmTimer.current = window.setTimeout(() => setConfirming(false), 3000);
    return () => {
      if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    };
  }, [confirming]);

  const handleDelete = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onDelete();
  };

  /** 🔊 朗读：播放中再点 = 停止；否则触发（流式/超长不可用） */
  const handleSpeak = () => {
    if (playing) {
      useTtsStore.getState().stop();
    } else {
      void useTtsStore.getState().speak(message.id, message.text, roleId);
    }
  };

  return (
    <div
      className={`${styles.bar}${visible ? ` ${styles.barVisible}` : ""}`}
      role="group"
      aria-label="消息操作"
    >
      {isAiText && (
        <button
          type="button"
          className={`${styles.btn}${error ? ` ${styles.err}` : ""}`}
          disabled={busy || loading || tooLong}
          onClick={handleSpeak}
          aria-label={playing ? "停止朗读" : "朗读"}
          title={
            tooLong
              ? "文字较长，暂不支持朗读"
              : playing
                ? "停止"
                : loading
                  ? "加载中…"
                  : error
                    ? (errorText ?? "语音加载失败")
                    : "朗读"
          }
        >
          {loading ? "⏳" : playing ? "⏹" : error ? "⚠️" : "🔊"}
        </button>
      )}
      {isUser && !isSticker ? (
        <button
          type="button"
          className={styles.btn}
          disabled={busy}
          onClick={onEdit}
          aria-label="编辑消息"
          title="编辑"
        >
          ✏️
        </button>
      ) : (
        !isUser &&
        !isSticker && (
          <button
            type="button"
            className={styles.btn}
            disabled={busy}
            onClick={onRetry}
            aria-label="重新生成"
            title="重试"
          >
            🔄
          </button>
        )
      )}
      <button
        type="button"
        className={styles.btn}
        disabled={busy}
        onClick={onCopy}
        aria-label="复制文字"
        title="复制"
      >
        📋
      </button>
      <button
        type="button"
        className={`${styles.btn}${confirming ? ` ${styles.confirm}` : ""}`}
        disabled={busy}
        onClick={handleDelete}
        aria-label={confirming ? "再点一次确认删除" : "删除消息"}
        title="删除"
      >
        {confirming ? "确认删除？" : "🗑️"}
      </button>
    </div>
  );
}
