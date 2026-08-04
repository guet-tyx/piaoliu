"use client";

import styles from "./MessageList.module.css";

/** R4 底部 Toast：编辑清除提示 / 复制成功（验收 #12/#18） */
export function MessageToast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className={styles.toast} role="status">
      {text}
    </div>
  );
}
