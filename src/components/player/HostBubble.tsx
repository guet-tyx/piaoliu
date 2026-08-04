"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePlayerStore } from "@/stores/player";
import { useHostTrigger } from "@/hooks/useHostTrigger";
import { CHARACTERS } from "@/data/character";
import { CHANNELS } from "@/data/channels";
import styles from "./HostBubble.module.css";

/** 气泡自动消失时长（与 hostBubble keyframes 总时长一致，动画结束清 DOM） */
const HOST_BUBBLE_MS = 6000;

/**
 * 虚拟主持人气泡（P3-01）：
 * 进入频道打招呼 / 每 3 首换曲介绍 / 60s 空闲安慰（useHostTrigger 管理）。
 * 圆形头像（角色 avatar）+ 台词气泡；约 6s 停留后自动淡出（动画 + JS timer 同步）；
 * 点击头像 → /chat/[roleId]；右上角 ✕ 手动关闭；开关由 PlayerSection 的 HostToggle 控制。
 */
export function HostBubble() {
  const channelId = usePlayerStore((s) => s.channelId);
  const { text, trigger, bubbleKey, visible, close } = useHostTrigger();

  // 气泡停留约 6s 后自动关闭（key 重挂载时重置计时）
  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(close, HOST_BUBBLE_MS);
    return () => window.clearTimeout(t);
  }, [bubbleKey, visible, close]);

  if (!visible || !text || !channelId) return null;

  const channel = CHANNELS.find((c) => c.id === channelId);
  const host = channel?.host
    ? CHARACTERS.find((c) => c.id === channel.host)
    : null;
  if (!host) return null;

  return (
    <div className={styles.bubble} key={bubbleKey} role="status" aria-live="polite">
      <Link href={`/chat/${host.id}`} className={styles.avatarLink} aria-label={`和 ${host.name} 聊聊`}>
        <Image
          src={host.avatar}
          alt={host.name}
          width={52}
          height={52}
          className={styles.avatar}
        />
      </Link>
      <div className={styles.speech}>
        <p className={styles.text}>{text}</p>
        <p className={styles.meta}>
          ── {host.name} · {channel?.name}
          {trigger === "per3" ? " · 换曲介绍" : trigger === "idle" ? " · 陪伴" : ""}
        </p>
        <button
          type="button"
          className={styles.close}
          aria-label="关闭主持人台词"
          onClick={close}
        >
          ✕
        </button>
      </div>
    </div>
  );
}