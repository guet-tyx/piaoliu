"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Channel } from "@/data/channels";
import { CHARACTERS } from "@/data/character";
import styles from "./ChannelInfo.module.css";

interface ChannelInfoProps {
  channel: Channel | null;
}

/**
 * 频道信息卡（P1-05）：
 * 图标 + 名称 + 描述 + 主持人（host 角色头像 + greeting + 聊天入口；
 * 私人 FM 无主持人）。切频道时展示「正在切换…」占位（淡入动画兜底）。
 */
export function ChannelInfo({ channel }: ChannelInfoProps) {
  if (!channel) return null;
  const host = channel.host ? CHARACTERS.find((c) => c.id === channel.host) : null;

  return (
    <div className={styles.info} key={channel.id}>
      <div className={styles.infoText}>
        <p className={styles.kicker}>
          <span className={styles.icon} aria-hidden="true">{channel.icon}</span>
          {channel.name}
        </p>
        <p className={styles.desc}>「{channel.desc}」</p>
        {host && (
          <p className={styles.greeting}>
            <span className={styles.greetMark} aria-hidden="true">♪</span>
            {channel.greeting}
          </p>
        )}
      </div>
      {host ? (
        <Link href={`/chat/${host.id}`} className={styles.host} aria-label={`和 ${host.name} 聊聊`}>
          <Image
            src={host.avatar}
            alt={host.name}
            width={52}
            height={52}
            className={styles.hostAvatar}
          />
          <span className={styles.hostMeta}>
            <span className={styles.hostName}>{host.name}</span>
            <span className={styles.hostRole}>{host.lv}</span>
          </span>
          <span className={styles.hostCta}>和 TA 聊聊 →</span>
        </Link>
      ) : (
        <div className={styles.fmNote} role="note">
          <span className={styles.fmBars} aria-hidden="true">
            <i style={{ "--d": "0s" } as CSSProperties} />
            <i style={{ "--d": "-0.25s" } as CSSProperties} />
            <i style={{ "--d": "-0.5s" } as CSSProperties} />
          </span>
          每一首都为你现调
        </div>
      )}
    </div>
  );
}
