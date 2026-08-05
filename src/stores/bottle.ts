import { create } from "zustand";
import {
  fetchInbox,
  getDailyLimits,
  launchBottle,
  markInboxRead,
  pickBottle,
  replyBottle,
} from "@/lib/api/bottles";
import type {
  Bottle,
  DailyLimits,
  LaunchResult,
  PickResult,
  Reply,
  ReplyResult,
  TrackSnapshot,
} from "@/types/social";

export interface InboxItem {
  bottle: Bottle;
  replies: Reply[];
}

/**
 * 纸船漂流状态（FR-7）：收件箱/unread + 限额提示 + 各动作提交
 * UI 层只读只调 actions（STYLE_GUIDE 4.5）
 */
interface BottleState {
  inbox: InboxItem[];
  unreadCount: number;
  /** 今日限额（UI 提示「今日可投 1 / 可拾 3」） */
  limits: DailyLimits;
  /** 提交中（防连点） */
  busy: boolean;
  refreshInbox: () => Promise<void>;
  /** 投瓶：isPublic=true 进入漂流广场（P0 F-01），默认匿名仅随机拾取可见 */
  launch: (text: string, track: TrackSnapshot, style?: string, isPublic?: boolean) => Promise<LaunchResult>;
  pick: () => Promise<PickResult>;
  reply: (bottleId: string, text: string) => Promise<ReplyResult>;
  markRead: (bottleId: string) => Promise<void>;
}

export const useBottleStore = create<BottleState>()((set, get) => ({
  inbox: [],
  unreadCount: 0,
  limits: { date: "", launched: 0, picked: 0 },
  busy: false,

  refreshInbox: async () => {
    const items = await fetchInbox();
    set({
      inbox: items,
      unreadCount: items.filter((i) => i.bottle.readAt === null).length,
    });
  },

  launch: async (text, track, style, isPublic) => {
    if (get().busy) return { ok: false, reason: "limit" };
    set({ busy: true });
    try {
      const result = await launchBottle(text, track, style, isPublic);
      set({ limits: await getDailyLimits() });
      return result;
    } finally {
      // 无论成败都释放 busy，防止异常导致按钮永久禁用
      set({ busy: false });
    }
  },

  pick: async () => {
    if (get().busy) return { ok: false, reason: "limit" };
    set({ busy: true });
    try {
      const result = await pickBottle();
      set({ limits: await getDailyLimits() });
      return result;
    } finally {
      set({ busy: false });
    }
  },

  reply: async (bottleId, text) => {
    if (get().busy) return { ok: false, reason: "limit" };
    set({ busy: true });
    try {
      const result = await replyBottle(bottleId, text);
      if (result.ok) await get().refreshInbox();
      return result;
    } finally {
      set({ busy: false });
    }
  },

  markRead: async (bottleId) => {
    await markInboxRead(bottleId);
    set((s) => ({
      inbox: s.inbox.map((i) =>
        i.bottle.id === bottleId ? { ...i, bottle: { ...i.bottle, readAt: Date.now() } } : i,
      ),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
  },
}));
