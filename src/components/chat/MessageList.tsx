"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { personaOf } from "@/data/chat-personas";
import type { ChatPersona } from "@/data/chat-personas";
import { stickerOf } from "@/data/stickers";
import { useChatStore } from "@/stores/chat";
import { useTtsStore } from "@/stores/tts";
import { useGreeting } from "@/hooks/useGreeting";
import { MessageRow } from "@/components/chat/MessageRow";
import { MessageActionSheet } from "@/components/chat/MessageActionSheet";
import { MessageDeleteConfirm } from "@/components/chat/MessageDeleteConfirm";
import { MessageToast } from "@/components/chat/MessageToast";
import { plainTextOf } from "@/lib/chat/markdown";
import type { ChatMessage, ChatStatus } from "@/types/chat";
import styles from "./MessageList.module.css";

/** 稳定空引用（避免 selector 返回新数组导致 Zustand 无限重渲染） */
const EMPTY_MESSAGES: ChatMessage[] = [];

/** 错误横幅（R1 §5.5），与 ChatPage 传递的 ChatBanner 结构一致 */
export interface BannerLike {
  text: string;
  retrying?: boolean;
}

interface MessageListProps {
  roleId: string;
  banner: BannerLike | null;
  onRetry: () => void;
  onCloseBanner: () => void;
  onPickToday: () => void;
  /** R4: retry 降级本地回复时通知页面显示错误横幅 */
  onDegraded: () => void;
}

/** 骨架屏占位（R1 §5.2 首次加载） */
function Skeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={`${styles.skelRow} ${styles.skelAi}`}>
        <span className={styles.skelAvatar} />
        <span className={`${styles.skelBubble} ${styles.skelW60}`} />
      </div>
      <div className={`${styles.skelRow} ${styles.skelAi}`}>
        <span className={styles.skelAvatar} />
        <span className={`${styles.skelBubble} ${styles.skelW85}`} />
      </div>
      <div className={`${styles.skelRow} ${styles.skelUser}`}>
        <span className={`${styles.skelBubble} ${styles.skelW45}`} />
      </div>
    </div>
  );
}

/** 空状态（R1 §5.1）：立绘 + 问候语 + 签名 + 今日推荐入口（问候语按时段/频道/久别重逢变化，PRD 需求⑤） */
function EmptyState({
  persona,
  greeting,
  onPickToday,
}: {
  persona: ChatPersona;
  greeting: string;
  onPickToday: () => void;
}) {
  return (
    <div className={styles.empty}>
      <div className={styles.portrait}>
        <Image src={persona.image} alt={persona.name} fill sizes="280px" />
      </div>
      <p className={styles.emptyGreet}>{greeting}</p>
      <p className={styles.emptySign}>{persona.signature}</p>
      <button type="button" className={styles.todayBtn} onClick={onPickToday}>
        ♪ 今日推荐歌曲
      </button>
    </div>
  );
}

/** 消息列表（R1 §5）：空态/加载态/气泡分组/粘底滚动/错误横幅 + R4 消息操作 */
export function MessageList({
  roleId,
  banner,
  onRetry,
  onCloseBanner,
  onPickToday,
  onDegraded,
}: MessageListProps) {
  const messages = useChatStore((s) => s.messages[roleId] ?? EMPTY_MESSAGES);
  const status = useChatStore((s) => s.status[roleId] ?? ("idle" as ChatStatus));
  /** Summarize：早期对话摘要（非空时列表底部显示折叠提示，对用户低干扰） */
  const summary = useChatStore((s) => s.summaries[roleId]?.text ?? "");
  /** TTS：正在朗读的消息与进度（AI 气泡进度条用） */
  const ttsPlayingKey = useTtsStore((s) => s.playingKey);
  const ttsProgress = useTtsStore((s) => s.progress);
  const ttsDuration = useTtsStore((s) => s.duration);
  const persona = personaOf(roleId);
  /** 开场白（PRD 需求⑤）：空态问候语，每次打开页面只算一次 */
  const greeting = useGreeting(roleId);
  const editMessage = useChatStore((s) => s.editMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const retryMessage = useChatStore((s) => s.retryMessage);

  const listRef = useRef<HTMLDivElement | null>(null);
  /** 是否跟随底部（用户上滑阅读历史时置 false，滚回底部恢复——R1 §5.4） */
  const stickRef = useRef(true);
  const [loading, setLoading] = useState(true);

  /** R4：编辑目标 / 长按菜单目标 / 删除确认目标 / Toast */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sheetMsg, setSheetMsg] = useState<ChatMessage | null>(null);
  const [confirmMsg, setConfirmMsg] = useState<ChatMessage | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  /** Summarize：摘要折叠态（默认折叠，展开后点击其他区域收起，PRD §3.2） */
  const [summaryOpen, setSummaryOpen] = useState(false);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const busy = status === "thinking" || status === "streaming";

  /** 居中底部 Toast，2 秒自动消失 */
  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2000);
  };

  // 首次进入骨架屏（R1 §5.2）：短暂 shimmer 后呈现内容
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 420);
    return () => window.clearTimeout(t);
  }, []);

  // 新消息 / 流式增量自动滚底（仅当 stickToBottom）
  useEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  // 卸载清理 Toast 计时器
  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  // 摘要展开后，点击摘要框外任意区域折叠（PRD §3.2）
  useEffect(() => {
    if (!summaryOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (summaryRef.current && !summaryRef.current.contains(e.target as Node)) {
        setSummaryOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [summaryOpen]);

  // TTS：挂载时探测 MiMo 可用性；离开页面停止播放并释放音频（PRD 异常处理）
  useEffect(() => {
    void useTtsStore.getState().probe();
    return () => {
      useTtsStore.getState().stop();
    };
  }, []);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const thinking = status === "thinking";
  const showEmpty = !loading && messages.length === 0 && !thinking && status !== "streaming";
  const lastId = messages.length > 0 ? messages[messages.length - 1].id : null;

  /** R4 编辑保存：更新 + 清后续，有清除则 Toast 提示 */
  const handleEditSave = (text: string) => {
    if (!editingId) return;
    const res = editMessage(roleId, editingId, text);
    setEditingId(null);
    if (res?.cleared) showToast("已修改，后续对话已清除");
  };

  /** R4 重试：重新生成，降级时提示 */
  const handleRetry = async (msgId: string) => {
    const res = await retryMessage(roleId, msgId);
    if (res.degraded) onDegraded();
  };

  /** R4 复制：贴纸消息复制表情名，文字消息剥离 Markdown 标记（验收 #13） */
  const handleCopy = async (m: ChatMessage) => {
    try {
      const text = m.sticker ? (stickerOf(m.sticker)?.name ?? "贴纸") : plainTextOf(m.text);
      await navigator.clipboard.writeText(text);
      showToast("已复制");
    } catch {
      showToast("复制失败");
    }
  };

  /** R4 删除确认（移动端弹框路径） */
  const handleDeleteConfirmed = (m: ChatMessage) => {
    deleteMessage(roleId, m.id);
    if (editingId === m.id) setEditingId(null);
    setConfirmMsg(null);
  };

  return (
    <>
      <div className={styles.listWrap}>
        <div className={styles.listInner} ref={listRef} onScroll={handleScroll}>
          {banner && (
            <div className={styles.banner} role="alert">
              <span className={styles.bannerText}>{banner.text}</span>
              <button
                type="button"
                className={styles.bannerBtn}
                onClick={onRetry}
                disabled={banner.retrying}
              >
                {banner.retrying ? "探测中…" : "重试"}
              </button>
              <button
                type="button"
                className={styles.bannerClose}
                onClick={onCloseBanner}
                aria-label="关闭提示"
              >
                ✕
              </button>
            </div>
          )}

          {loading && <Skeleton />}

          {showEmpty && <EmptyState persona={persona} greeting={greeting} onPickToday={onPickToday} />}

          {!loading && !showEmpty && (
            <>
              {messages.map((m, idx) => {
                const prev = idx > 0 ? messages[idx - 1] : null;
                const samePrev = prev?.role === m.role;
                return (
                  <MessageRow
                    key={m.id}
                    roleId={roleId}
                    message={m}
                    samePrev={samePrev}
                    streaming={status === "streaming" && m.id === lastId}
                    busy={busy}
                    isEditing={editingId === m.id && !m.sticker}
                    playing={ttsPlayingKey === m.id}
                    playPct={
                      ttsPlayingKey === m.id && ttsDuration > 0
                        ? Math.min(100, (ttsProgress / ttsDuration) * 100)
                        : 0
                    }
                    onStartEdit={() => setEditingId(m.id)}
                    onEditSave={handleEditSave}
                    onEditCancel={() => setEditingId(null)}
                    onRetry={() => void handleRetry(m.id)}
                    onCopy={() => void handleCopy(m)}
                    onDelete={() => setConfirmMsg(m)}
                    onLongPress={() => setSheetMsg(m)}
                  />
                );
              })}

              {/* 思考中：AI 行 + 三点跳动 */}
              {thinking && (
                <div className={styles.rowAi}>
                  <span className={styles.avatarAi}>
                    <Image src={persona.avatar} alt={persona.name} fill sizes="44px" />
                  </span>
                  <div className={`${styles.bubbleAi} ${styles.thinking}`}>
                    <span className={styles.accent} aria-hidden="true" />
                    <span className={styles.dots} aria-label="思考中">
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                </div>
              )}

              {/* 对话自动总结：底部折叠摘要提示（滚动到底可见，PRD §3.2） */}
              {summary && (
                <div className={styles.summaryBox} ref={summaryRef}>
                  <button
                    type="button"
                    className={styles.summaryToggle}
                    onClick={() => setSummaryOpen((v) => !v)}
                    aria-expanded={summaryOpen}
                  >
                    📝 已压缩早期对话摘要
                    <span className={styles.summaryArrow} aria-hidden="true">
                      {summaryOpen ? "▲" : "▼"}
                    </span>
                  </button>
                  {summaryOpen && (
                    <div className={styles.summaryBody}>
                      <p className={styles.summaryText}>{summary}</p>
                      <button
                        type="button"
                        className={styles.summaryFold}
                        onClick={() => setSummaryOpen(false)}
                      >
                        收起
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* R4 移动端长按底部菜单（验收 #14） */}
      <MessageActionSheet
        msg={sheetMsg}
        onClose={() => setSheetMsg(null)}
        onEdit={(m) => setEditingId(m.id)}
        onRetry={(m) => void handleRetry(m.id)}
        onSpeak={(m) => void useTtsStore.getState().speak(m.id, m.text, roleId)}
        onCopy={(m) => void handleCopy(m)}
        onDelete={(m) => setConfirmMsg(m)}
      />

      {/* R4 移动端删除确认框（验收 #15） */}
      <MessageDeleteConfirm
        msg={confirmMsg}
        onClose={() => setConfirmMsg(null)}
        onConfirm={handleDeleteConfirmed}
      />

      {/* R4 Toast：编辑清除提示 / 复制成功（验收 #12/#18） */}
      <MessageToast text={toast} />
    </>
  );
}
