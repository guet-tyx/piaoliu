"use client";

import { create } from "zustand";
import type { ChatMessage, ChatStatus, ChatSummary } from "@/types/chat";
import { isSafeText } from "@/lib/api/moderation";
import { localReply } from "@/lib/chat/local";
import { MAX_HISTORY, MAX_TEXT } from "@/lib/chat/limits";
import { nextSummaryChunk, formatSummaryChunk } from "@/lib/chat/summarize";
import { splitStickerMessages, stickerToModelText } from "@/lib/chat/split";
import { stickerOf } from "@/data/stickers";

/** localStorage 键：每角色独立会话（消息 + 对话总结摘要分 key 存储） */
const CHAT_KEY_PREFIX = "drift-chat";
const SUMMARY_KEY_PREFIX = "drift-chat-summary";

/** 无摘要的初始态（只读共享引用，更新时总是创建新对象） */
const EMPTY_SUMMARY: ChatSummary = { text: "", covered: 0 };

function genId(): string {
  // 运行期 action 内随机（非渲染期，SSR 安全）
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function chatKey(roleId: string): string {
  return `${CHAT_KEY_PREFIX}-${roleId}`;
}
function summaryKey(roleId: string): string {
  return `${SUMMARY_KEY_PREFIX}-${roleId}`;
}
function readLocal(roleId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(chatKey(roleId));
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}
function writeLocal(roleId: string, msgs: ChatMessage[]) {
  try {
    localStorage.setItem(chatKey(roleId), JSON.stringify(msgs));
  } catch {
    // 隐私模式等忽略写入失败
  }
}
/** 读摘要记录；数据损坏/缺字段时静默忽略，等价于无摘要（PRD 异常处理） */
function readSummaryLocal(roleId: string): ChatSummary {
  try {
    const raw = localStorage.getItem(summaryKey(roleId));
    if (!raw) return EMPTY_SUMMARY;
    const parsed = JSON.parse(raw) as Partial<ChatSummary>;
    if (typeof parsed?.text !== "string" || typeof parsed?.covered !== "number") {
      return EMPTY_SUMMARY;
    }
    return { text: parsed.text, covered: parsed.covered };
  } catch {
    return EMPTY_SUMMARY;
  }
}
function writeSummaryLocal(roleId: string, summary: ChatSummary) {
  try {
    localStorage.setItem(summaryKey(roleId), JSON.stringify(summary));
  } catch {
    // 隐私模式等忽略写入失败
  }
}

/**
 * 解析 OpenAI 兼容 SSE（data: {json} / data: [DONE]），逐 delta 回调。
 * 返回累计完整文本。
 */
async function consumeSSE(
  res: Response,
  onDelta: (text: string) => void,
): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      for (const line of part.split("\n")) {
        const m = line.match(/^data:\s*(.*)$/);
        if (!m) continue;
        const payload = m[1].trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            full += delta;
            onDelta(delta);
          }
        } catch {
          // 忽略不完整片段
        }
      }
    }
  }
  return full;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 角色 AI 聊天（V2.3 基础设施，V2.4 全屏聊天页使用）：
 * - 未配置服务端 key 时（apiReadyCache 记忆 503 no-key）走本地回复池降级；
 * - 有 key 时 fetch /api/chat 走 SSE 流式打字机；
 * - 每角色独立消息历史 + localStorage 持久化（drift-chat-<roleId>）。
 */
export interface ChatState {
  messages: Record<string, ChatMessage[]>;
  status: Record<string, ChatStatus>;
  /** 对话自动总结：每角色的累积摘要（随聊天持久化，清空时重置） */
  summaries: Record<string, ChatSummary>;
  /** 挂载时按需从 localStorage 恢复某角色（V2.4 页内只跑一次） */
  restore: (roleId: string) => void;
  /** 发送消息；ok.degraded 表示 AI 已降级为本地回复池（供错误横幅提示，V2.4） */
  send: (roleId: string, text: string) => Promise<
    | { ok: true; degraded?: boolean }
    | { ok: false; reason: "bad-word" | "too-long" | "empty" | "offline" }
  >;
  /** R5.2: 发送独立贴纸消息（表情与文字分开）；非法 sticker id 返回 ok:false */
  sendSticker: (roleId: string, stickerId: string) => Promise<{ ok: boolean; degraded?: boolean }>;
  /**
   * R4: 编辑用户消息——更新 text/at 并清除其后所有消息（后续上下文已不成立）。
   * 返回 { cleared } 供 UI 弹 Toast；非法目标（非 user 消息/空/超长）返回 null。
   */
  editMessage: (
    roleId: string,
    msgId: string,
    text: string,
  ) => { cleared: boolean } | null;
  /** R4: 删除任意消息（不影响其他消息） */
  deleteMessage: (roleId: string, msgId: string) => void;
  /** R4: 重试 AI 回复——删除该条 AI 消息但保留其后消息，用原始上下文重新生成并插回原位置 */
  retryMessage: (roleId: string, msgId: string) => Promise<{ ok: boolean; degraded?: boolean }>;
  /** 轻量探测 AI 连通性（错误横幅「重试」用；服务端仅检查 key，不调用模型） */
  probe: () => Promise<boolean>;
  /** 清空某角色会话 */
  clear: (roleId: string) => void;
}

/** 服务端 key 就绪缓存：首次 503 no-key 后记忆，避免每次空请求 */
let apiReadyCache: boolean | null = null;

/** 对话自动总结防并发：每个角色同时只允许一个 in-flight 提取请求（fire-and-forget） */
const summarizingRoles = new Set<string>();

export const useChatStore = create<ChatState>()((set, get) => {
  /** 更新某角色消息列表并持久化 */
  const commitMessages = (roleId: string, msgs: ChatMessage[]) => {
    set((s) => ({ messages: { ...s.messages, [roleId]: msgs } }));
    writeLocal(roleId, msgs);
  };
  /** 更新某角色摘要并持久化 */
  const commitSummary = (roleId: string, summary: ChatSummary) => {
    set((s) => ({ summaries: { ...s.summaries, [roleId]: summary } }));
    writeSummaryLocal(roleId, summary);
  };

  /**
   * 对话自动总结（Summarize）：达到阈值后异步提取新的一块早期对话并增量追加进摘要。
   * fire-and-forget 不阻塞消息发送；失败（503 no-key / 网络 / 全模型失败）不推进 covered，
   * 下次发送自动重试；提取为空仅推进 covered（不发空摘要，PRD 异常处理）。
   */
  const maybeSummarize = async (roleId: string) => {
    if (summarizingRoles.has(roleId)) return;
    const msgs = get().messages[roleId] ?? [];
    const summary = get().summaries[roleId] ?? EMPTY_SUMMARY;
    const chunk = nextSummaryChunk(msgs, summary.covered);
    if (!chunk) return;

    summarizingRoles.add(roleId);
    try {
      const block = msgs.slice(chunk.start, chunk.end);
      // 整块无文本（纯贴纸）：无可提取内容，仅推进计数
      const chunkText = formatSummaryChunk(block);
      const advanced = { ...summary, covered: chunk.end };
      if (!chunkText) {
        commitSummary(roleId, advanced);
        return;
      }
      const res = await fetch("/api/chat/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId, messages: block }),
      });
      if (!res.ok) return; // 失败不推进，静默等下次
      const data = (await res.json().catch(() => null)) as { summary?: string } | null;
      const gained = data?.summary?.trim() ?? "";
      const text = gained ? (summary.text ? `${summary.text}\n${gained}` : gained) : summary.text;
      commitSummary(roleId, { text, covered: chunk.end });
    } catch {
      // 网络异常：静默，不推进
    } finally {
      summarizingRoles.delete(roleId);
    }
  };

  /**
   * R4: 创建 AI 回复空消息（draft）。
   * draftIndex 指定插入位置（retry 时插回原 AI 消息位置），默认追加到末尾。
   */
  const appendDraft = (roleId: string, msgId: string, draftIndex?: number) => {
    const msgs = get().messages[roleId] ?? [];
    const draft: ChatMessage = { id: msgId, role: "assistant", text: "", at: Date.now() };
    const insert = draftIndex !== undefined && draftIndex >= 0 && draftIndex <= msgs.length;
    const next = insert
      ? [...msgs.slice(0, draftIndex), draft, ...msgs.slice(draftIndex)]
      : [...msgs, draft];
    commitMessages(roleId, next);
  };

  /**
   * R5.2 收敛 AI 回复：把单条 draft 替换为「文字 + 贴纸」拆分后的消息序列。
   * 首段沿用原 msgId 与 at（流式引用稳定），后续段同 at（供组重试识别整组）。
   */
  const finalizeReply = (roleId: string, msgId: string, full: string) => {
    const msgs = get().messages[roleId] ?? [];
    const draft = msgs.find((m) => m.id === msgId);
    if (!draft) return;
    const parts = splitStickerMessages(full || draft.text);
    const replaced: ChatMessage[] = parts.map((p, i) =>
      i === 0
        ? { ...draft, text: p.text ?? "", sticker: p.sticker }
        : {
            id: genId(),
            role: "assistant",
            text: p.text ?? "",
            at: draft.at,
            ...(p.sticker ? { sticker: p.sticker } : {}),
          },
    );
    set((s) => ({
      messages: {
        ...s.messages,
        [roleId]: (s.messages[roleId] ?? []).flatMap((m) => (m.id === msgId ? replaced : [m])),
      },
      status: { ...s.status, [roleId]: "idle" },
    }));
  };

  /** 真实 LLM：fetch /api/chat + SSE 流式；返回是否完成（false 需降级）。
   *  history 指定调用上下文（send 传完整列表 / retry 传重试点前），draftIndex 指定回复插入位置。 */
  const streamFromApi = async (
    roleId: string,
    history?: ChatMessage[],
    draftIndex?: number,
  ): Promise<boolean> => {
    const context = history ?? get().messages[roleId] ?? [];
    // 贴纸消息序列化为文本标记（route 校验 text 必填；模型与 AI 输出 token 同格式）
    const modelContext = context.map((m) =>
      m.sticker ? { ...m, text: stickerToModelText(m.sticker), sticker: undefined } : m,
    );
    // 非空摘要随请求携带，由服务端注入 system（Summarize：retry 路径同样生效）
    const summaryText = get().summaries[roleId]?.text ?? "";
    const body = {
      roleId,
      messages: modelContext.slice(-MAX_HISTORY),
      ...(summaryText ? { summary: summaryText } : {}),
    };
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 503) {
      // no-key / 全部模型失败：记忆并降级
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (data?.error === "no-key") apiReadyCache = false;
      return false;
    }
    if (!res.ok) return false;

    apiReadyCache = true;
    const msgId = genId();
    appendDraft(roleId, msgId, draftIndex);
    set((s) => ({ status: { ...s.status, [roleId]: "streaming" } }));

    const full = await consumeSSE(res, (delta) => {
      set((s) => ({
        messages: {
          ...s.messages,
          [roleId]: (s.messages[roleId] ?? []).map((m) =>
            m.id === msgId ? { ...m, text: m.text + delta } : m,
          ),
        },
      }));
    });
    // 收敛最终文本：含贴纸 token 时拆为独立贴纸消息（R5.2）
    finalizeReply(roleId, msgId, full);
    // 空流：上游 200 但全程无内容（如 V4-Flash 间歇空流）。
    // 移除空 AI 消息并视为失败，由 send() 降级本地回复，避免「发了没反应」。
    if (!full.trim()) {
      set((s) => ({
        messages: {
          ...s.messages,
          [roleId]: (s.messages[roleId] ?? []).filter((m) => m.id !== msgId),
        },
      }));
      writeLocal(roleId, get().messages[roleId] ?? []);
      return false;
    }
    writeLocal(roleId, get().messages[roleId] ?? []);
    return true;
  };

  /** 本地降级：延迟思考 + 逐字打字机（R4 起支持指定插入位置） */
  const replyFromLocal = async (
    roleId: string,
    text: string,
    draftIndex?: number,
  ) => {
    await sleep(400 + Math.random() * 500);
    const reply = localReply(roleId, text);
    const msgId = genId();
    appendDraft(roleId, msgId, draftIndex);
    set((s) => ({ status: { ...s.status, [roleId]: "streaming" } }));
    // 逐字打字机（模拟流式）
    const step = 2;
    for (let i = 0; i < reply.length; i += step) {
      await sleep(28);
      const chunk = reply.slice(0, i + step);
      set((s) => ({
        messages: {
          ...s.messages,
          [roleId]: (s.messages[roleId] ?? []).map((m) =>
            m.id === msgId ? { ...m, text: chunk } : m,
          ),
        },
      }));
    }
    // 收敛最终回复（含贴纸 token 时拆为独立贴纸消息，R5.2）
    finalizeReply(roleId, msgId, reply);
    writeLocal(roleId, get().messages[roleId] ?? []);
  };

  /**
   * R4: AI 回合统一入口（send / retryMessage 共用）：
   * thinking → 真实 LLM 流式 → 失败降级本地回复池；返回是否降级（true = degraded）。
   * history 为本次调用上下文；draftIndex 指定回复插入位置（retry 插回原位置）。
   */
  const startReply = async (
    roleId: string,
    history: ChatMessage[],
    draftIndex?: number,
  ): Promise<boolean> => {
    set((s) => ({ status: { ...s.status, [roleId]: "thinking" } }));
    const prompt =
      [...history].reverse().find((m) => m.role === "user")?.text ?? "";
    /** 降级路径：本地回复池（保证可玩性） */
    const degrade = async () => {
      await replyFromLocal(roleId, prompt, draftIndex);
      return true;
    };

    if (apiReadyCache === false) {
      // 记忆过 no-key：直接本地降级（V2.4 横幅提示 degraded）
      return degrade();
    }
    try {
      const done = await streamFromApi(roleId, history, draftIndex);
      // 503 no-key / 全部模型失败 / 网络异常 / 空流：一律降级本地
      if (!done) return degrade();
      return false;
    } catch {
      return degrade();
    }
  };

  return {
    messages: {},
    status: {},
    summaries: {},

    restore: (roleId) => {
      if (!(roleId in get().messages)) {
        set((s) => ({ messages: { ...s.messages, [roleId]: readLocal(roleId) } }));
      }
      if (!(roleId in get().summaries)) {
        set((s) => ({ summaries: { ...s.summaries, [roleId]: readSummaryLocal(roleId) } }));
      }
    },

    probe: async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [], probe: true }),
        });
        if (res.ok) {
          apiReadyCache = true;
          return true;
        }
        if (res.status === 503) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          if (data?.error === "no-key") apiReadyCache = false;
        }
        return false;
      } catch {
        return false;
      }
    },

    send: async (roleId, text) => {
      const trimmed = text.trim();
      if (!trimmed) return { ok: false, reason: "empty" };
      if (trimmed.length > MAX_TEXT) return { ok: false, reason: "too-long" };
      if (!isSafeText(trimmed).ok) return { ok: false, reason: "bad-word" };

      const userMsg: ChatMessage = { id: genId(), role: "user", text: trimmed, at: Date.now() };
      commitMessages(roleId, [...(get().messages[roleId] ?? []), userMsg]);
      // 后台触发对话总结（fire-and-forget，不阻塞本轮回复）
      void maybeSummarize(roleId);
      // 完整列表作为上下文（末尾即刚发的用户消息）
      const degraded = await startReply(roleId, [...(get().messages[roleId] ?? [])]);
      return { ok: true, degraded };
    },

    sendSticker: async (roleId, stickerId) => {
      // 防御：picker 只传合法 id
      if (!stickerOf(stickerId)) return { ok: false };
      const userMsg: ChatMessage = {
        id: genId(),
        role: "user",
        text: "",
        at: Date.now(),
        sticker: stickerId,
      };
      commitMessages(roleId, [...(get().messages[roleId] ?? []), userMsg]);
      void maybeSummarize(roleId);
      const degraded = await startReply(roleId, [...(get().messages[roleId] ?? [])]);
      return { ok: true, degraded };
    },

    editMessage: (roleId, msgId, text) => {
      const trimmed = text.trim();
      if (!trimmed || trimmed.length > MAX_TEXT) return null;
      const msgs = get().messages[roleId] ?? [];
      const idx = msgs.findIndex((m) => m.id === msgId);
      // 仅用户消息可编辑
      if (idx < 0 || msgs[idx].role !== "user") return null;
      const cleared = idx < msgs.length - 1;
      // 更新 text/at；删除其后所有消息（后续是基于旧文本生成的，逻辑上已不成立）
      commitMessages(roleId, [
        ...msgs.slice(0, idx),
        { ...msgs[idx], text: trimmed, at: Date.now() },
      ]);
      set((s) => ({ status: { ...s.status, [roleId]: "idle" } }));
      return { cleared };
    },

    deleteMessage: (roleId, msgId) => {
      const msgs = get().messages[roleId] ?? [];
      const next = msgs.filter((m) => m.id !== msgId);
      if (next.length === msgs.length) return;
      commitMessages(roleId, next);
    },

    retryMessage: async (roleId, msgId) => {
      const msgs = get().messages[roleId] ?? [];
      const idx = msgs.findIndex((m) => m.id === msgId);
      // 仅 AI 消息可重试
      if (idx < 0 || msgs[idx].role !== "assistant") return { ok: false };
      // 拆分组：目标 AI 消息 + 其后连续同 at 的 assistant 消息（同一次回复拆出的贴纸）
      let end = idx;
      while (
        end + 1 < msgs.length &&
        msgs[end + 1].role === "assistant" &&
        msgs[end + 1].at === msgs[idx].at
      ) {
        end += 1;
      }
      // 整组删除（重试不改变用户输入，后续上下文仍有效）
      commitMessages(roleId, [...msgs.slice(0, idx), ...msgs.slice(end + 1)]);
      // 上下文 = 重试位置之前（原用户问题结尾）；新回复插回组头位置
      const degraded = await startReply(roleId, msgs.slice(0, idx), idx);
      return { ok: true, degraded };
    },

    clear: (roleId) => {
      commitMessages(roleId, []);
      // 清空对话同时清除摘要并重置计数（PRD §3.3）
      commitSummary(roleId, EMPTY_SUMMARY);
    },
  };
});
