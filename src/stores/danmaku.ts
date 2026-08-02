import { create } from "zustand";
import type { DanmakuMessage } from "@/lib/realtime/types";

/**
 * 弹幕流状态（FR-11 真实弹幕）：同船广播 + 系统事件统一入池
 * - 展示约 10 秒后自动移除（PRD FR-10.2）
 * - 池上限 12 条（防刷屏）
 * - 模块级定时器管理（store 生命周期 = 应用生命周期，随 clear 全量释放）
 */

const MAX_ITEMS = 12;
const TTL_MS = 10_000;

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

const timers = new Map<string, number>();

function scheduleRemove(id: string, set: (fn: (s: DanmakuState) => Partial<DanmakuState>) => void) {
  const t = window.setTimeout(() => {
    set((s) => ({ items: s.items.filter((m) => m.id !== id) }));
    timers.delete(id);
  }, TTL_MS);
  timers.set(id, t);
}

export const useDanmakuStore = create<DanmakuState>()((set) => ({
  items: [],

  push: (msg) => {
    set((s) => ({ items: [...s.items.slice(-(MAX_ITEMS - 1)), msg] }));
    scheduleRemove(msg.id, set);
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
    scheduleRemove(msg.id, set);
  },

  clear: () => {
    timers.forEach((t) => window.clearTimeout(t));
    timers.clear();
    set({ items: [] });
  },
}));
