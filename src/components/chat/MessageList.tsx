"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { personaOf } from "@/data/chat-personas";
import type { ChatPersona } from "@/data/chat-personas";
import { TRACKS } from "@/data/tracks";
import { stickerOf, type Sticker } from "@/data/stickers";
import { useChatStore } from "@/stores/chat";
import { MessageActions } from "@/components/chat/MessageActions";
import { MessageEditInput } from "@/components/chat/MessageEditInput";
import { PlaylistRecommendCard } from "@/components/chat/PlaylistRecommendCard";
import { ChannelRecommendCard } from "@/components/chat/ChannelRecommendCard";
import { Modal } from "@/components/shared/Modal";
import { useLongPress } from "@/hooks/useLongPress";
import { parseMarkdown, plainTextOf, type MarkdownBlock, type MarkdownInline } from "@/lib/chat/markdown";
import type { ChatMessage, ChatStatus } from "@/types/chat";
import { formatTime } from "@/lib/chat/format";
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

/** 歌曲 chip：[music: X] 解析渲染（匹配 TRACKS 显示封面） */
function MusicChip({ name }: { name: string }) {
  const track = TRACKS.find((t) => t.t === name || t.t.includes(name) || name.includes(t.t));
  if (!track) {
    return (
      <span className={styles.musicChip}>
        <i className={styles.musicIcon} aria-hidden="true">
          ♪
        </i>
        {name}
      </span>
    );
  }
  return (
    <span className={styles.musicChip} title={`${track.t} · ${track.s}`}>
      <Image src={track.cover} alt="" width={18} height={18} className={styles.musicCover} />
      {track.t}
    </span>
  );
}

/** R5 表情包贴纸：块级居中大图（黑色贴纸底，气泡内融合） */
function StickerImage({ sticker }: { sticker: Sticker }) {
  return (
    <span className={styles.stickerWrap} title={sticker.name}>
      <Image src={sticker.path} alt={sticker.name} fill sizes="140px" />
    </span>
  );
}

/** R5.2 独立贴纸消息：气泡内大图居中（与文字消息分开） */
function StickerCard({ stickerId }: { stickerId: string }) {
  const st = stickerOf(stickerId);
  if (!st) {
    return <span className={styles.stickerMissing}>[贴纸不见了]</span>;
  }
  return (
    <span className={styles.stickerCard} title={st.name}>
      <Image src={st.path} alt={st.name} fill sizes="190px" />
    </span>
  );
}

/** 渲染 Markdown 行内节点（text / strong / em / del / music chip / sticker） */
function renderInline(nodes: MarkdownInline[], keyPrefix: string): ReactNode[] {
  return nodes.map((n, i) => {
    const key = `${keyPrefix}-i${i}`;
    switch (n.type) {
      case "text":
        return n.text;
      case "strong":
        return <strong key={key}>{renderInline(n.children, key)}</strong>;
      case "em":
        return <em key={key}>{renderInline(n.children, key)}</em>;
      case "del":
        return <del key={key}>{renderInline(n.children, key)}</del>;
      case "music":
        return <MusicChip key={key} name={n.name} />;
      case "sticker": {
        const st = stickerOf(n.id);
        // 未知 id：按字面文本兜底（不破图）
        return st ? <StickerImage key={key} sticker={st} /> : n.id;
      }
      case "playlist":
        return <PlaylistRecommendCard key={key} id={n.id} />;
      case "channel":
        return <ChannelRecommendCard key={key} id={n.id} />;
    }
  });
}

/** 渲染 Markdown 块级（p / blockquote / ul / ol / hr） */
function renderBlock(block: MarkdownBlock, key: string): ReactNode {
  switch (block.type) {
    case "p":
      return <p key={key}>{renderInline(block.children, key)}</p>;
    case "blockquote":
      return (
        <blockquote key={key}>
          {block.children.map((c, i) => renderBlock(c, `${key}-b${i}`))}
        </blockquote>
      );
    case "list": {
      const items = block.items.map((item, i) => (
        <li key={`${key}-li${i}`}>{renderInline(item, `${key}-li${i}`)}</li>
      ));
      return block.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>;
    }
    case "hr":
      return <hr key={key} />;
  }
}

/** 完成/历史消息：Markdown 解析 → JSX（R3 排版） */
function renderMarkdownText(text: string, keyPrefix: string): ReactNode[] {
  return parseMarkdown(text).map((b, i) => renderBlock(b, `${keyPrefix}-b${i}`));
}

/**
 * 流式消息：仅拆 [music: X] / [sticker: id] token，Markdown 标记按字面文本显示
 * （半成品 `**粗` 不闪烁，streaming → idle 整条切换为排版）。
 */
function renderPlainChips(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\[(music|sticker|playlist|channel):\s*([^\]]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const kind = m[1];
    const value = m[2].trim();
    if (kind === "music") {
      parts.push(<MusicChip key={`${keyPrefix}-m${i}`} name={value} />);
    } else if (kind === "playlist") {
      parts.push(<PlaylistRecommendCard key={`${keyPrefix}-p${i}`} id={value} />);
    } else if (kind === "channel") {
      parts.push(<ChannelRecommendCard key={`${keyPrefix}-c${i}`} id={value} />);
    } else {
      const st = stickerOf(value);
      parts.push(
        st ? (
          <StickerImage key={`${keyPrefix}-s${i}`} sticker={st} />
        ) : (
          `[sticker: ${value}]`
        ),
      );
    }
    last = m.index + m[0].length;
    i += 1;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
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

/** 空状态（R1 §5.1）：立绘 + 问候语 + 签名 + 今日推荐入口 */
function EmptyState({ persona, onPickToday }: { persona: ChatPersona; onPickToday: () => void }) {
  return (
    <div className={styles.empty}>
      <div className={styles.portrait}>
        <Image src={persona.image} alt={persona.name} fill sizes="280px" />
      </div>
      <p className={styles.emptyGreet}>{persona.greeting}</p>
      <p className={styles.emptySign}>{persona.signature}</p>
      <button type="button" className={styles.todayBtn} onClick={onPickToday}>
        ♪ 今日推荐歌曲
      </button>
    </div>
  );
}

interface MessageRowProps {
  roleId: string;
  message: ChatMessage;
  samePrev: boolean;
  /** 本条是否为流式输出中的 draft */
  streaming: boolean;
  /** AI 思考/流式：操作按钮全部禁用（验收 #17） */
  busy: boolean;
  /** 是否处于编辑模式（仅用户消息） */
  isEditing: boolean;
  onStartEdit: () => void;
  onEditSave: (text: string) => void;
  onEditCancel: () => void;
  onRetry: () => void;
  onCopy: () => void;
  onDelete: () => void;
  /** 移动端长按：弹出底部操作菜单 */
  onLongPress: () => void;
}

/**
 * R4 单条消息行：PC hover 悬浮操作栏（进入即显、离开 0.3s 后隐）+
 * 移动端长按触发底部菜单 + 编辑模式切换。
 */
function MessageRow({
  roleId,
  message,
  samePrev,
  streaming,
  busy,
  isEditing,
  onStartEdit,
  onEditSave,
  onEditCancel,
  onRetry,
  onCopy,
  onDelete,
  onLongPress,
}: MessageRowProps) {
  const persona = personaOf(roleId);
  const [hovered, setHovered] = useState(false);
  /** R5.2 独立贴纸消息（与文字分开） */
  const isSticker = Boolean(message.sticker);
  const hoverTimer = useRef<number | null>(null);
  const longPress = useLongPress(onLongPress);

  const handleEnter = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    setHovered(true);
  };
  const handleLeave = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHovered(false), 300);
  };
  useEffect(
    () => () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    },
    [],
  );

  if (message.role === "user") {
    return (
      <div
        className={`${styles.rowUser}${samePrev ? ` ${styles.groupedUser}` : ""}`}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        {...longPress}
      >
        <div className={`${styles.bubbleUser}${samePrev ? ` ${styles.flatUser}` : ""}`}>
          {isSticker ? (
            <>
              <StickerCard stickerId={message.sticker as string} />
              <span className={styles.timeUser}>{formatTime(message.at)}</span>
              <MessageActions
                message={message}
                visible={hovered}
                busy={busy}
                onEdit={onStartEdit}
                onRetry={onRetry}
                onCopy={onCopy}
                onDelete={onDelete}
              />
            </>
          ) : isEditing ? (
            <MessageEditInput
              initial={message.text}
              busy={busy}
              onCancel={onEditCancel}
              onSave={onEditSave}
            />
          ) : (
            <>
              <div className={styles.msgText}>{renderMarkdownText(message.text, message.id)}</div>
              <span className={styles.timeUser}>{formatTime(message.at)}</span>
              <MessageActions
                message={message}
                visible={hovered}
                busy={busy}
                onEdit={onStartEdit}
                onRetry={onRetry}
                onCopy={onCopy}
                onDelete={onDelete}
              />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.rowAi}${samePrev ? ` ${styles.groupedAi}` : ""}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      {...longPress}
    >
      {!samePrev && (
        <span className={styles.avatarAi}>
          <Image src={persona.avatar} alt={persona.name} fill sizes="44px" />
        </span>
      )}
      <div className={`${styles.bubbleAi}${samePrev ? ` ${styles.flatAi}` : ""}`}>
        <span className={styles.accent} aria-hidden="true" />
        {isSticker ? (
          <StickerCard stickerId={message.sticker as string} />
        ) : (
          <div className={styles.msgText}>
            {streaming ? renderPlainChips(message.text, message.id) : renderMarkdownText(message.text, message.id)}
          </div>
        )}
        <span className={styles.timeAi}>{formatTime(message.at)}</span>
        {streaming && <i className={styles.cursor} aria-hidden="true" />}
        <MessageActions
          message={message}
          visible={hovered}
          busy={busy}
          onEdit={onStartEdit}
          onRetry={onRetry}
          onCopy={onCopy}
          onDelete={onDelete}
        />
      </div>
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
  const persona = personaOf(roleId);
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
  const handleDeleteConfirmed = () => {
    if (!confirmMsg) return;
    deleteMessage(roleId, confirmMsg.id);
    if (editingId === confirmMsg.id) setEditingId(null);
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

          {showEmpty && <EmptyState persona={persona} onPickToday={onPickToday} />}

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
      <Modal
        open={sheetMsg !== null}
        onClose={() => setSheetMsg(null)}
        variant="bottom"
        labelledBy="msg-sheet-title"
      >
        <div className={styles.sheet}>
          <p id="msg-sheet-title" className={styles.sheetTitle}>
            消息操作
          </p>
          {sheetMsg?.role === "user" && !sheetMsg.sticker && (
            <button
              type="button"
              className={styles.sheetItem}
              onClick={() => {
                const m = sheetMsg;
                setSheetMsg(null);
                if (m) setEditingId(m.id);
              }}
            >
              ✏️ 编辑消息
            </button>
          )}
          {sheetMsg?.role === "assistant" && !sheetMsg.sticker && (
            <button
              type="button"
              className={styles.sheetItem}
              onClick={() => {
                const m = sheetMsg;
                setSheetMsg(null);
                void handleRetry(m.id);
              }}
            >
              🔄 重新生成
            </button>
          )}
          <button
            type="button"
            className={styles.sheetItem}
            onClick={() => {
              const m = sheetMsg;
              setSheetMsg(null);
              if (m) void handleCopy(m);
            }}
          >
            📋 复制文字
          </button>
          <button
            type="button"
            className={`${styles.sheetItem} ${styles.sheetDanger}`}
            onClick={() => {
              setConfirmMsg(sheetMsg);
              setSheetMsg(null);
            }}
          >
            🗑️ 删除消息
          </button>
          <button
            type="button"
            className={`${styles.sheetItem} ${styles.sheetCancel}`}
            onClick={() => setSheetMsg(null)}
          >
            取消
          </button>
        </div>
      </Modal>

      {/* R4 移动端删除确认框（验收 #15） */}
      <Modal
        open={confirmMsg !== null}
        onClose={() => setConfirmMsg(null)}
        labelledBy="msg-confirm-title"
      >
        <div className={styles.confirmCard}>
          <h3 id="msg-confirm-title" className={styles.confirmTitle}>
            删除这条消息？
          </h3>
          <p className={styles.confirmDesc}>删除后不可恢复</p>
          <div className={styles.confirmBtns}>
            <button
              type="button"
              className={styles.confirmCancel}
              onClick={() => setConfirmMsg(null)}
            >
              取消
            </button>
            <button type="button" className={styles.confirmDanger} onClick={handleDeleteConfirmed}>
              删除
            </button>
          </div>
        </div>
      </Modal>

      {/* R4 Toast：编辑清除提示 / 复制成功（验收 #12/#18） */}
      {toast && (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      )}
    </>
  );
}
