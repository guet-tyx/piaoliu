"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/stores/chat";
import { personaOf } from "@/data/chat-personas";
import { MAX_TEXT } from "@/lib/chat/limits";
import { MusicPicker } from "@/components/chat/MusicPicker";
import { StickerPicker } from "@/components/chat/StickerPicker";
import styles from "./ChatInput.module.css";

/** 接近上限提示阈值（字数变黄） */
const WARN_AT = 160;
/** 多行 textarea 最大高度（约 6 行） */
const MAX_HEIGHT = 150;

interface ChatInputProps {
  roleId: string;
  draft: string;
  onDraftChange: (text: string) => void;
  /** API 失败降级本地回复时通知页面显示错误横幅 */
  onDegraded: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

/** 输入栏（R1 §6）：选歌/语音占位 + 多行自适应 + 字数提示 + 发送 */
export function ChatInput({ roleId, draft, onDraftChange, onDegraded, inputRef }: ChatInputProps) {
  const persona = personaOf(roleId);
  const status = useChatStore((s) => s.status[roleId] ?? "idle");
  const send = useChatStore((s) => s.send);
  const sendSticker = useChatStore((s) => s.sendSticker);
  const busy = status === "thinking" || status === "streaming";

  const [pickerOpen, setPickerOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [voiceHint, setVoiceHint] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const voiceTimer = useRef<number | null>(null);

  const len = draft.length;
  const over = len > MAX_TEXT;
  const near = len >= WARN_AT && !over;
  const canSend = !busy && !over && draft.trim().length > 0;

  // 多行自动伸缩：draft 变化后按内容高度调整（最大 ~6 行）
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [draft, inputRef]);

  const handleChange = (value: string) => {
    onDraftChange(value);
    setErr(null);
  };

  /** 在光标处插入歌曲 token（[music: 歌名]），保持焦点与光标位置 */
  const insertToken = (token: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    const before = draft.slice(0, start);
    const after = draft.slice(end);
    const gap = before && !/\s$/.test(before) ? " " : "";
    const next = `${before}${gap}${token}${after}`;
    onDraftChange(next);
    setPickerOpen(false);
    setErr(null);
    window.setTimeout(() => {
      el?.focus();
      const pos = start + gap.length + token.length;
      el?.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleSubmit = async () => {
    const text = draft.trim();
    if (busy || !text || over) return;
    const res = await send(roleId, text);
    if (res.ok) {
      onDraftChange("");
      if (res.degraded) onDegraded();
    } else if (res.reason === "bad-word") {
      setErr("话里有不能上船的字。");
    } else {
      setErr("发点什么再聊吧。");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
    if (e.key === "Escape") {
      setPickerOpen(false);
      setStickerOpen(false);
    }
  };

  const handleVoice = () => {
    setVoiceHint(true);
    if (voiceTimer.current) window.clearTimeout(voiceTimer.current);
    voiceTimer.current = window.setTimeout(() => setVoiceHint(false), 2200);
  };

  /** R5.2 表情包：点选即发独立贴纸消息（与文字消息分开），降级时提示 */
  const handleStickerSend = async (stickerId: string) => {
    setStickerOpen(false);
    const res = await sendSticker(roleId, stickerId);
    if (res.ok && res.degraded) onDegraded();
  };

  return (
    <div className={styles.inputBar}>
      <form
        className={styles.inputRow}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <div className={styles.tools}>
          <button
            type="button"
            className={`${styles.toolBtn}${pickerOpen ? ` ${styles.toolActive}` : ""}`}
            onClick={() => setPickerOpen((v) => !v)}
            aria-label="选择歌曲"
            title="选一首歌"
            aria-expanded={pickerOpen}
          >
            🎵
          </button>
          <button
            type="button"
            className={`${styles.toolBtn}${stickerOpen ? ` ${styles.toolActive}` : ""}`}
            onClick={() => setStickerOpen((v) => !v)}
            aria-label="表情包"
            title="发表情包"
            aria-expanded={stickerOpen}
          >
            😊
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={handleVoice}
            aria-label="语音（语音输入即将上线）"
            title="语音输入 · 即将上线"
          >
            🎤
          </button>
        </div>

        <div className={styles.inputWrap}>
          <textarea
            ref={inputRef}
            className={`${styles.input}${over ? ` ${styles.inputOver}` : ""}`}
            value={draft}
            rows={1}
            maxLength={MAX_TEXT}
            placeholder={busy ? `${persona.name}正在星海里想怎么回…` : `和${persona.name}说点什么……`}
            disabled={busy}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {len > 0 && (
            <span
              className={`${styles.count}${near ? ` ${styles.countNear}` : ""}${over ? ` ${styles.countOver}` : ""}`}
            >
              {len}/{MAX_TEXT}
            </span>
          )}
        </div>

        <button type="submit" className={styles.sendBtn} disabled={!canSend}>
          {busy ? <span className={styles.sendSpinner} aria-hidden="true" /> : "发送"}
        </button>
      </form>

      {voiceHint && (
        <p className={styles.voiceHint} role="status">
          🎤 语音输入即将上线，先试试朗读功能吧（点 AI 回复上的 🔊）。
        </p>
      )}
      {err && <p className={styles.err}>{err}</p>}

      {pickerOpen && <MusicPicker onClose={() => setPickerOpen(false)} onPick={insertToken} />}
      {stickerOpen && (
        <StickerPicker
          roleId={roleId}
          busy={busy}
          onClose={() => setStickerOpen(false)}
          onSend={handleStickerSend}
        />
      )}
    </div>
  );
}
