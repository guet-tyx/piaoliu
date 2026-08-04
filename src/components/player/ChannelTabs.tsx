"use client";

import { CHANNELS } from "@/data/channels";
import styles from "./ChannelTabs.module.css";

interface ChannelTabsProps {
  activeId: string | null;
  onSwitch: (channelId: string) => void;
  disabled?: boolean;
}

/**
 * 频道选择栏（P1-05）：5 个胶囊 tab（深夜/日系/学习/雨天/私人FM），
 * 选中项高亮 + 下划线；点击切换频道（切换逻辑在 PlayerSection）。
 */
export function ChannelTabs({ activeId, onSwitch, disabled = false }: ChannelTabsProps) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="电台频道">
      {CHANNELS.map((ch) => {
        const active = ch.id === activeId;
        return (
          <button
            key={ch.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`${styles.tab}${active ? ` ${styles.active}` : ""}`}
            disabled={disabled}
            onClick={() => onSwitch(ch.id)}
          >
            <span className={styles.tabIcon} aria-hidden="true">{ch.icon}</span>
            <span className={styles.tabName}>{ch.name}</span>
          </button>
        );
      })}
    </div>
  );
}
