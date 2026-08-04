"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useChatStore } from "@/stores/chat";
import { TRACKS } from "@/data/tracks";
import { todayTrackIndex } from "@/lib/chat/format";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import styles from "./ChatPage.module.css";

/** 角色聊天背景图命名约定：chat-bg-<roleId>.webp（美术出图） */
const ROLE_BG = ["sio", "lumen", "soku", "yoe"];

/** 错误横幅状态（R1 §5.5） */
export interface ChatBanner {
  text: string;
  /** 重试探测中 */
  retrying?: boolean;
}

interface ChatPageProps {
  roleId: string;
  /** P3-05 分享到聊天的预填文案（来自 /chat/[roleId]?share=…） */
  initialDraft?: string;
}

/**
 * 全屏沉浸聊天页（R1 V2.4）：
 * - 角色专属氛围主题（data-role → CSS 变量，见 ChatPage.module.css）
 * - 入场右滑淡入 / 返回左滑淡出（reduced-motion 禁用）
 * - 错误横幅：降级提示 + 重试（探测连通性）+ 5s 自动消失
 */
export function ChatPage({ roleId, initialDraft }: ChatPageProps) {
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const restore = useChatStore((s) => s.restore);
  const probe = useChatStore((s) => s.probe);
  // 播放器状态持久化已由根布局 PlayerBridge（V3.2 全局电台引擎）接管，聊天页无需再挂载；
  // 刷新后频道上下文由全局 restorePlayerState 恢复，频道联动开场白保持生效。
  /** R5.3 角色聊天背景图（未知角色兜底汐） */
  const bgSrc = `/images/chat-bg-${ROLE_BG.includes(roleId) ? roleId : "sio"}.webp`;

  const [draft, setDraft] = useState("");
  const [exiting, setExiting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // P3-05：分享预填文案挂载时写入输入框并聚焦（微任务内 setState，规避级联渲染 lint）
  useEffect(() => {
    if (!initialDraft) return;
    const t = window.setTimeout(() => {
      setDraft(initialDraft);
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅挂载一次
  }, []);
  const [banner, setBanner] = useState<ChatBanner | null>(null);
  const bannerTimer = useRef<number | null>(null);

  // 挂载时恢复该角色历史（restore 幂等，roleId 变化时自动切会话）
  useEffect(() => {
    restore(roleId);
  }, [restore, roleId]);

  // 错误横幅：5 秒无操作自动消失（R1 §5.5）
  useEffect(() => {
    if (!banner) return;
    if (bannerTimer.current) window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBanner(null), 5000);
    return () => {
      if (bannerTimer.current) window.clearTimeout(bannerTimer.current);
    };
  }, [banner]);

  /** 返回上一页；无历史（直达 URL）时回首页 */
  const handleBack = useCallback(() => {
    const leave = () => {
      if (window.history.length > 1) router.back();
      else router.replace("/");
    };
    if (reduced) {
      leave();
      return;
    }
    setExiting(true);
    window.setTimeout(leave, 300);
  }, [reduced, router]);

  /** send 降级本地回复时触发（API 失败不打断聊天） */
  const handleDegraded = useCallback(() => {
    setBanner({ text: "星海信号不稳，刚用本地回声替你接话了。" });
  }, []);

  /** 横幅「重试」：重新探测 AI 连通性，成功即关横幅 */
  const handleRetry = useCallback(async () => {
    setBanner({ text: "正在重新探测星海信号…", retrying: true });
    const ok = await probe();
    setBanner(ok ? null : { text: "星海信号仍不稳定，稍后再试试看。" });
  }, [probe]);

  const handleCloseBanner = useCallback(() => setBanner(null), []);

  /** 空状态「今日推荐」：把今日歌曲以 [music: 歌名] 插入输入框（R1 §5.1） */
  const handlePickToday = useCallback(() => {
    const track = TRACKS[todayTrackIndex(TRACKS.length)];
    const token = `[music: ${track.t}]`;
    setDraft((d) => {
      const base = d.trim() ? `${d.trimEnd()} ` : "";
      return base + token;
    });
    inputRef.current?.focus();
  }, []);

  return (
    <div
      className={`${styles.page}${exiting ? ` ${styles.exiting}` : ""}`}
      data-role={roleId}
    >
      {/* R5.3 角色背景图：淡化铺底（opacity 见 CSS），内容层在其上 */}
      <div className={styles.bg} aria-hidden="true">
        <Image src={bgSrc} alt="" fill sizes="100vw" priority />
      </div>
      <ChatHeader roleId={roleId} onBack={handleBack} />
      <MessageList
        roleId={roleId}
        banner={banner}
        onRetry={handleRetry}
        onCloseBanner={handleCloseBanner}
        onPickToday={handlePickToday}
        onDegraded={handleDegraded}
      />
      <ChatInput
        roleId={roleId}
        draft={draft}
        onDraftChange={setDraft}
        onDegraded={handleDegraded}
        inputRef={inputRef}
      />
    </div>
  );
}
