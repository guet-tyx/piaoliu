import { create } from "zustand";
import type { DanmakuMessage } from "@/lib/realtime/types";

/**
 * 弹幕流状态（FR-11 真实弹幕）：同船广播 + 系统事件统一入池
 * 弹幕循环漂移（用户选择）：入池后持续显示（CSS 无限循环动画），
 * 池上限 12 条（满则挤掉最旧），直到弹幕开关关闭（显隐）或切歌（clear）
 */

const MAX_ITEMS = 12;

/** 系统事件弹幕频控：同类型 30s 内最多 1 条（防刷屏） */
const RATE_LIMIT_MS = 30_000;
const lastSystemAt = new Map<string, number>();

function genId(): string {
  return `dm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface DanmakuState {
  items: DanmakuMessage[];
  /** 推送弹幕（同船广播消息） */
  push: (msg: DanmakuMessage) => void;
  /** 推送系统事件弹幕（kind 用于 30s 频控） */
  pushSystem: (text: string, kind: string, variant?: "pink" | "blue") => void;
  /** 清空（切歌时） */
  clear: () => void;
}

export const useDanmakuStore = create<DanmakuState>()((set) => ({
  items: [],

  push: (msg) => {
    set((s) => ({ items: [...s.items.slice(-(MAX_ITEMS - 1)), msg] }));
  },

  pushSystem: (text, kind, variant) => {
    // 频控：同类型 30s 内最多 1 条
    const now = Date.now();
    const last = lastSystemAt.get(kind) ?? 0;
    if (now - last < RATE_LIMIT_MS) return;
    lastSystemAt.set(kind, now);

    const msg: DanmakuMessage = {
      id: genId(),
      text,
      variant,
      system: true,
      at: now,
    };
    set((s) => ({ items: [...s.items.slice(-(MAX_ITEMS - 1)), msg] }));
  },

  clear: () => {
    set({ items: [] });
  },
}));
