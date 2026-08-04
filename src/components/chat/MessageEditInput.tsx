"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_TEXT } from "@/lib/chat/limits";
import styles from "./MessageEditInput.module.css";

interface MessageEditInputProps {
  /** 预填原文本 */
  initial: string;
  /** AI 思考/流式时禁用（验收 #17） */
  busy: boolean;
  onCancel: () => void;
  onSave: (text: string) => void;
}

/**
 * R4 编辑输入框（§3.3）：单行略矮（约 40px）+ 字数计数 + [取消][保存]。
 * Enter 保存 / ESC 取消；空文本或超长时保存 disabled（验收 #6）。
 */
export function MessageEditInput({ initial, busy, onCancel, onSave }: MessageEditInputProps) {
  const [text, setText] = useState(initial);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const len = text.length;
  const over = len > MAX_TEXT;
  const canSave = !over && text.trim().length > 0 && !busy;

  // 进入编辑模式即聚焦
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSave) onSave(text);
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className={styles.edit}>
      <textarea
        ref={inputRef}
        className={`${styles.input}${over ? ` ${styles.inputOver}` : ""}`}
        value={text}
        rows={1}
        maxLength={MAX_TEXT}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="编辑消息内容"
      />
      {len > 0 && (
        <span className={`${styles.count}${over ? ` ${styles.countOver}` : ""}`}>
          {len}/{MAX_TEXT}
        </span>
      )}
      <div className={styles.foot}>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          取消
        </button>
        <button
          type="button"
          className={styles.save}
          disabled={!canSave}
          onClick={() => onSave(text)}
        >
          保存
        </button>
      </div>
    </div>
  );
}