"use client";

import { useEffect } from "react";
import { Modal } from "@/components/shared/Modal";
import { BottleCard } from "@/components/bottle/BottleCard";
import { useBottleStore, type InboxItem } from "@/stores/bottle";
import styles from "./InboxModal.module.css";

/**
 * 星海来讯（FR-7.5 收信）：投出的纸船收到回信后，靠岸强提醒
 * - 靠岸动画 + 汐旁白
 * - 回信仅投瓶人可见（RLS 保证；本地模拟池由查询层过滤）
 * - 每封收信可生成瓶面卡分享图（FR-7.6）
 */
export function InboxModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inbox = useBottleStore((s) => s.inbox);
  const markRead = useBottleStore((s) => s.markRead);

  // 打开时全部标为已读（星海来讯已阅）
  useEffect(() => {
    if (!open) return;
    inbox.forEach((item) => {
      if (item.bottle.readAt === null) markRead(item.bottle.id);
    });
  }, [open, inbox, markRead]);

  return (
    <Modal open={open} onClose={onClose} labelledBy="inbox-title">
      <div className={styles.head}>
        <h2 id="inbox-title" className={styles.title}>
          星海来讯
        </h2>
        <button className={styles.close} type="button" aria-label="关闭星海来讯" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* 靠岸动画 + 汐旁白 */}
      <div className={styles.landing} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" className={styles.landBoat}>
          <path d="M12 3v11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 4.5 19 11h-7z" fill="currentColor" />
          <path d="M2.5 13.5Q12 17.5 21.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p className={styles.narrate}>「有船靠岸了。」—— 汐</p>
      </div>

      {inbox.length === 0 ? (
        <p className={styles.empty}>
          还没有船靠岸。启航一艘纸船，装进想说的话，等风把回信带回来。
        </p>
      ) : (
        <ul className={styles.list}>
          {inbox.map((item) => (
            <InboxItemView key={item.bottle.id} item={item} />
          ))}
        </ul>
      )}
    </Modal>
  );
}

/** 单封收信：原文 + 回信 + 瓶面卡 */
function InboxItemView({ item }: { item: InboxItem }) {
  const { bottle, replies } = item;
  return (
    <li className={styles.item}>
      <div className={styles.orig}>
        <p className={styles.origMark}>
          你的纸船 <em>{bottle.anonMark}</em>
        </p>
        <p className={styles.origText}>{bottle.text}</p>
        <p className={styles.origSong}>
          🎵 {bottle.track.t} · {bottle.track.s}
        </p>
      </div>

      <div className={styles.replies}>
        {replies.map((r) => (
          <div key={r.id} className={styles.reply}>
            <p className={styles.replyMark}>{r.anonMark} 的回信</p>
            <p className={styles.replyText}>{r.text}</p>
          </div>
        ))}
      </div>

      <BottleCard bottle={bottle} replies={replies} />
    </li>
  );
}
