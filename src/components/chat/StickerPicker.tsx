"use client";

import { useEffect } from "react";
import Image from "next/image";
import { stickersOfRole } from "@/data/stickers";
import styles from "./StickerPicker.module.css";

interface StickerPickerProps {
  roleId: string;
  /** AI 思考/流式时禁用发送 */
  busy: boolean;
  onClose: () => void;
  /** 点击某张贴纸：以独立贴纸消息发送（R5.2 与文字分开） */
  onSend: (stickerId: string) => void;
}

/** R5 表情包选择浮层：当前角色 8 张贴纸网格，点击即发（微信式） */
export function StickerPicker({ roleId, busy, onClose, onSend }: StickerPickerProps) {
  const stickers = stickersOfRole(roleId);

  // ESC 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.mask} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <span className={styles.title}>表情包 · 点一下就发</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>
        <div className={styles.grid}>
          {stickers.map((s) => (
            <button
              key={s.id}
              type="button"
              className={styles.item}
              disabled={busy}
              title={`${s.name}（${s.vibe}）`}
              aria-label={`发送表情包 ${s.name}`}
              onClick={() => onSend(s.id)}
            >
              <Image src={s.path} alt={s.name} width={72} height={72} className={styles.img} />
              <span className={styles.itemName}>{s.name}</span>
            </button>
          ))}
        </div>
        {busy && <p className={styles.hint}>AI 正在回复，稍等一下再发～</p>}
      </div>
    </div>
  );
}
