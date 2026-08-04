"use client";

import { Modal } from "@/components/shared/Modal";
import type { ChatMessage } from "@/types/chat";
import styles from "./MessageList.module.css";

interface MessageActionSheetProps {
  /** 当前长按的消息（null = 关闭） */
  msg: ChatMessage | null;
  onClose: () => void;
  onEdit: (m: ChatMessage) => void;
  onRetry: (m: ChatMessage) => void;
  onSpeak: (m: ChatMessage) => void;
  onCopy: (m: ChatMessage) => void;
  onDelete: (m: ChatMessage) => void;
}

/** R4 移动端长按底部操作菜单（验收 #14）：按消息角色/类型显示可用操作 */
export function MessageActionSheet({
  msg,
  onClose,
  onEdit,
  onRetry,
  onSpeak,
  onCopy,
  onDelete,
}: MessageActionSheetProps) {
  return (
    <Modal open={msg !== null} onClose={onClose} variant="bottom" labelledBy="msg-sheet-title">
      <div className={styles.sheet}>
        <p id="msg-sheet-title" className={styles.sheetTitle}>
          消息操作
        </p>
        {msg?.role === "user" && !msg.sticker && (
          <button
            type="button"
            className={styles.sheetItem}
            onClick={() => {
              const m = msg;
              onClose();
              if (m) onEdit(m);
            }}
          >
            ✏️ 编辑消息
          </button>
        )}
        {msg?.role === "assistant" && !msg.sticker && (
          <button
            type="button"
            className={styles.sheetItem}
            onClick={() => {
              const m = msg;
              onClose();
              if (m) onSpeak(m);
            }}
          >
            🔊 朗读
          </button>
        )}
        {msg?.role === "assistant" && !msg.sticker && (
          <button
            type="button"
            className={styles.sheetItem}
            onClick={() => {
              const m = msg;
              onClose();
              if (m) onRetry(m);
            }}
          >
            🔄 重新生成
          </button>
        )}
        <button
          type="button"
          className={styles.sheetItem}
          onClick={() => {
            const m = msg;
            onClose();
            if (m) onCopy(m);
          }}
        >
          📋 复制文字
        </button>
        <button
          type="button"
          className={`${styles.sheetItem} ${styles.sheetDanger}`}
          onClick={() => {
            const m = msg;
            onClose();
            if (m) onDelete(m);
          }}
        >
          🗑️ 删除消息
        </button>
        <button type="button" className={`${styles.sheetItem} ${styles.sheetCancel}`} onClick={onClose}>
          取消
        </button>
      </div>
    </Modal>
  );
}
