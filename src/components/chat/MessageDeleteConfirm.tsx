"use client";

import { Modal } from "@/components/shared/Modal";
import type { ChatMessage } from "@/types/chat";
import styles from "./MessageList.module.css";

interface MessageDeleteConfirmProps {
  /** 待删除的消息（null = 关闭） */
  msg: ChatMessage | null;
  onClose: () => void;
  onConfirm: (m: ChatMessage) => void;
}

/** R4 移动端删除确认框（验收 #15） */
export function MessageDeleteConfirm({ msg, onClose, onConfirm }: MessageDeleteConfirmProps) {
  return (
    <Modal open={msg !== null} onClose={onClose} labelledBy="msg-confirm-title">
      <div className={styles.confirmCard}>
        <h3 id="msg-confirm-title" className={styles.confirmTitle}>
          删除这条消息？
        </h3>
        <p className={styles.confirmDesc}>删除后不可恢复</p>
        <div className={styles.confirmBtns}>
          <button type="button" className={styles.confirmCancel} onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className={styles.confirmDanger}
            onClick={() => {
              if (msg) onConfirm(msg);
            }}
          >
            删除
          </button>
        </div>
      </div>
    </Modal>
  );
}
