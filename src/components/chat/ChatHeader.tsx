"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CHARACTERS } from "@/data/character";
import { personaOf } from "@/data/chat-personas";
import { useChatStore } from "@/stores/chat";
import { useLifeStatus } from "@/hooks/useLifeStatus";
import type { ChatStatus, ChatMessage } from "@/types/chat";
import styles from "./ChatHeader.module.css";

/** 状态指示器（R1 §4.2）：idle 在线绿 / thinking 思考黄闪 / streaming 输入蓝跳 / error 异常红 */
const STATUS_META: Record<ChatStatus, { label: string; dot: string }> = {
  idle: { label: "在线", dot: "dotIdle" },
  thinking: { label: "思考中", dot: "dotThinking" },
  streaming: { label: "输入中", dot: "dotStreaming" },
  error: { label: "异常", dot: "dotError" },
};

/** 导出会话记录为 .txt（设置菜单） */
function exportChat(roleId: string, name: string, messages: ChatMessage[]) {
  const lines = messages.map((m) => {
    const who = m.role === "user" ? "我" : name;
    const time = new Date(m.at).toLocaleString("zh-CN", { hour12: false });
    return `[${time}] ${who}：${m.text}`;
  });
  const body = lines.join("\n") || "（还没有对话记录）";
  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chat-${roleId}-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

interface ChatHeaderProps {
  roleId: string;
  onBack: () => void;
}

/** 聊天页顶栏（R1 §4）：返回 + 角色信息 + 状态 + 预设占位 + 设置菜单 */
export function ChatHeader({ roleId, onBack }: ChatHeaderProps) {
  const persona = personaOf(roleId);
  const character = CHARACTERS.find((c) => c.id === roleId);
  const status = useChatStore((s) => s.status[roleId] ?? "idle");
  const messages = useChatStore((s) => s.messages[roleId]);
  const clear = useChatStore((s) => s.clear);

  const [infoOpen, setInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** 清空二次确认：第一次点击进入确认态，3 秒内再点才执行 */
  const [confirming, setConfirming] = useState(false);
  const confirmTimer = useRef<number | null>(null);

  const meta = STATUS_META[status];

  // 角色生活状态（PRD 需求③）：顶栏「● 在线 · 🎧 正在听歌」，点击可手动切换
  const { displayed, tooltip, rotate } = useLifeStatus(roleId);

  // 清空二次确认：3 秒未再点自动复位
  useEffect(() => {
    if (!confirming) return;
    confirmTimer.current = window.setTimeout(() => setConfirming(false), 3000);
    return () => {
      if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    };
  }, [confirming]);

  // 弹层 ESC 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setInfoOpen(false);
        setSettingsOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleClear = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    clear(roleId);
    setConfirming(false);
    setSettingsOpen(false);
  };

  const handleExport = () => {
    exportChat(roleId, persona.name, messages ?? []);
    setSettingsOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerIn}>
        <button type="button" className={styles.backBtn} onClick={onBack} aria-label="返回上一页">
          <span aria-hidden="true">←</span>
          <span className={styles.backText}>返回</span>
        </button>

        <div className={styles.avatarWrap}>
          <button
            type="button"
            className={styles.avatarBtn}
            onClick={() => setInfoOpen((v) => !v)}
            aria-label="查看角色信息"
            title={`${persona.name} · ${character?.lv ?? ""}`}
          >
            <Image src={persona.avatar} alt={persona.name} fill sizes="56px" />
          </button>
          {infoOpen && (
            <div className={styles.pop}>
              <button
                type="button"
                className={styles.maskClose}
                onClick={() => setInfoOpen(false)}
                aria-label="关闭角色信息"
              />
              <div className={`${styles.card} ${styles.infoCard}`}>
                <div className={styles.infoRow}>
                  <span className={styles.infoAvatar}>
                    <Image src={persona.avatar} alt="" fill sizes="72px" />
                  </span>
                  <span className={styles.infoText}>
                    <span className={styles.infoName}>
                      {character?.name ?? persona.name} <em>{character?.en}</em>
                    </span>
                    <span className={styles.infoLv}>{character?.lv}</span>
                  </span>
                </div>
                <div className={styles.infoTags}>
                  {character?.tags.map((t) => (
                    <span key={t.label} className={styles.infoTag}>
                      {t.label}
                    </span>
                  ))}
                </div>
                <p className={styles.infoDesc}>
                  {character?.desc.map((seg, i) =>
                    seg.bold ? <b key={i}>{seg.text}</b> : <span key={i}>{seg.text}</span>,
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className={styles.roleMeta}>
          <span className={styles.roleName}>{persona.name}</span>
            <span className={styles.status} role="status">
              <i className={`${styles.dot} ${styles[meta.dot]}`} aria-hidden="true" />
              {meta.label}
              {displayed && (
                <button
                  type="button"
                  className={styles.life}
                  onClick={rotate}
                  aria-label="切换角色状态"
                >
                  <span key={displayed.key} className={styles.lifeText}>
                    · {displayed.icon} {displayed.text}
                  </span>
                  {tooltip && (
                    <span className={styles.lifeTip} role="tooltip">
                      {tooltip}
                    </span>
                  )}
                </button>
              )}
            </span>
        </div>

        <div className={styles.spacer} />

        <select className={styles.preset} disabled aria-label="语气预设（占位）">
          <option>默认语气</option>
          <option>更多预设 · R7 敬请期待</option>
        </select>

        <div className={styles.settingsWrap}>
          <button
            type="button"
            className={styles.settingsBtn}
            onClick={() => setSettingsOpen((v) => !v)}
            aria-label="设置"
            aria-expanded={settingsOpen}
          >
            ⚙
          </button>
          {settingsOpen && (
            <div className={styles.pop}>
              <button
                type="button"
                className={styles.maskClose}
                onClick={() => setSettingsOpen(false)}
                aria-label="关闭菜单"
              />
              <div className={`${styles.card} ${styles.settingsCard}`}>
                <button
                  type="button"
                  className={styles.menuItem}
                  onClick={handleClear}
                  aria-label={confirming ? "再点一次确认清空对话" : "清空对话"}
                >
                  {confirming ? "再点一次确认清空" : "清空对话"}
                </button>
                <button type="button" className={styles.menuItem} onClick={handleExport}>
                  导出记录
                </button>
                <div className={styles.menuDivider} />
                {CHARACTERS.map((c) => (
                  <a key={c.id} className={styles.menuItem} href={`/chat/${c.id}`}>
                    <Image src={c.image} alt="" width={22} height={22} className={styles.menuAvatar} />
                    {c.id === roleId ? "当前 · " : ""}
                    {c.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
