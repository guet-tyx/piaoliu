"use client";

import { useState } from "react";
import Link from "next/link";
import type { Playlist } from "@/types/music";
import { Modal } from "@/components/shared/Modal";
import { Toast } from "@/components/shared/Toast";
import { CHARACTERS } from "@/data/character";
import { copyShareLink, shareToChatUrl } from "@/lib/playlist/shareUtils";
import { ShareCard } from "./ShareCard";
import styles from "./ShareModal.module.css";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  playlist: Playlist;
}

/**
 * 歌单分享弹窗（P3-05）：
 * 📋 复制链接 / 🖼 生成分享卡片 / 💬 分享到聊天（选主持人跳 /chat/[roleId]?share=…）
 */
export function ShareModal({ open, onClose, playlist }: ShareModalProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<"actions" | "card" | "chat">("actions");

  const onCopy = async () => {
    const ok = await copyShareLink(playlist.id);
    setToast(ok ? "链接已复制，分享给朋友吧" : "复制失败，请手动复制地址栏链接");
  };

  const handleClose = () => {
    onClose();
    setView("actions");
  };

  return (
    <Modal open={open} onClose={handleClose} labelledBy="share-pl-title">
      <div className={styles.modal}>
        <div className={styles.head}>
          <h2 id="share-pl-title" className={styles.title}>
            ↗ 分享歌单
          </h2>
          <button type="button" className={styles.closeBtn} aria-label="关闭" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className={styles.playlistInfo}>
          <p className={styles.plName}>{playlist.name}</p>
          <p className={styles.plDesc}>「{playlist.desc}」</p>
        </div>

        {view === "actions" && (
          <div className={styles.actions}>
            <button type="button" className={styles.action} onClick={onCopy}>
              <span className={styles.actionIcon} aria-hidden="true">📋</span>
              <span className={styles.actionText}>
                <b>复制链接</b>
                <small>复制歌单链接到剪贴板</small>
              </span>
            </button>
            <button
              type="button"
              className={styles.action}
              onClick={() => setView("card")}
            >
              <span className={styles.actionIcon} aria-hidden="true">🖼</span>
              <span className={styles.actionText}>
                <b>生成分享卡片</b>
                <small>生成一张图片，可以保存分享</small>
              </span>
            </button>
            <button
              type="button"
              className={styles.action}
              onClick={() => setView("chat")}
            >
              <span className={styles.actionIcon} aria-hidden="true">💬</span>
              <span className={styles.actionText}>
                <b>分享到聊天</b>
                <small>给 AI 角色发一条带歌单的消息</small>
              </span>
            </button>
          </div>
        )}

        {view === "card" && (
          <div className={styles.cardView}>
            <ShareCard playlist={playlist} />
            <button type="button" className={styles.backBtn} onClick={() => setView("actions")}>
              ← 返回
            </button>
          </div>
        )}

        {view === "chat" && (
          <div className={styles.chatView}>
            <p className={styles.chatHint}>选一位星海守望者，把歌单推荐给它：</p>
            <div className={styles.roles}>
              {CHARACTERS.map((c) => (
                <Link
                  key={c.id}
                  href={shareToChatUrl(c.id, playlist)}
                  className={styles.role}
                  onClick={handleClose}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.avatar} alt={c.name} className={styles.roleAvatar} />
                  <span className={styles.roleName}>{c.name}</span>
                </Link>
              ))}
            </div>
            <button type="button" className={styles.backBtn} onClick={() => setView("actions")}>
              ← 返回
            </button>
          </div>
        )}

        <Toast text={toast} onDone={() => setToast(null)} />
      </div>
    </Modal>
  );
}