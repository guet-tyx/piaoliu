import { create } from "zustand";
import type { FollowRelation } from "@/types/social";
import {
  readBookmarks,
  readFollows,
  toggleFollow as apiToggleFollow,
  toggleBookmark as apiToggleBookmark,
  type FollowResult,
  type BookmarkResult,
} from "@/lib/api/social";

/**
 * 星海关注 + 漂流广场收藏 store（P0 F-01 / F-04）：
 * 数据权威在 api 层（写 localStorage / 调 RPC），store 只维护内存副本供 UI 订阅。
 * bootstrap 在 /drift 页与船员证页挂载时调用（与 identity/bottle store 同一模式）。
 */
interface SocialState {
  /** 关注关系列表（F-04） */
  follows: FollowRelation[];
  /** 收藏的瓶子 id 列表（F-01） */
  bookmarks: string[];
  /** 关注/收藏操作防连点 */
  busy: boolean;
  /** 恢复本地/远程关注与收藏；返回解除订阅的清理函数（与 identity.bootstrap 对齐） */
  bootstrap: () => void;
  /** 关注/取消关注；reason 供 UI 提示（self/limit/offline） */
  toggleFollow: (mark: string) => Promise<FollowResult>;
  /** 收藏/取消收藏；reason "limit" 供 UI 提示收藏上限 */
  toggleBookmark: (bottleId: string) => Promise<BookmarkResult>;
}

/** 从 localStorage 恢复的校验：字段缺失的损坏数据丢弃 */
function sanitizeFollows(raw: unknown): FollowRelation[] {
  return Array.isArray(raw)
    ? raw.filter(
        (f): f is FollowRelation =>
          typeof f === "object" &&
          f !== null &&
          typeof (f as FollowRelation).followedMark === "string",
      )
    : [];
}

export const useSocialStore = create<SocialState>()((set, get) => ({
  follows: [],
  bookmarks: [],
  busy: false,

  bootstrap: () => {
    // 本地模式：localStorage 同步恢复（真实模式 getFollows 为异步，此处以本地为准即可）
    set({ follows: sanitizeFollows(readFollows()), bookmarks: readBookmarks() });
  },

  toggleFollow: async (mark) => {
    if (get().busy) return { ok: false, reason: "limit" };
    set({ busy: true });
    const r = await apiToggleFollow(mark);
    if (r.ok) {
      if (r.followed) {
        set((s) => ({
          follows: [...s.follows, { followedMark: mark, createdAt: Date.now() }],
        }));
      } else {
        set((s) => ({ follows: s.follows.filter((f) => f.followedMark !== mark) }));
      }
    }
    set({ busy: false });
    return r;
  },

  toggleBookmark: async (bottleId) => {
    if (get().busy) return { ok: false, reason: "limit" };
    set({ busy: true });
    const r = await apiToggleBookmark(bottleId);
    if (r.ok) {
      if (r.bookmarked) {
        set((s) => ({ bookmarks: [...s.bookmarks, bottleId] }));
      } else {
        set((s) => ({ bookmarks: s.bookmarks.filter((id) => id !== bottleId) }));
      }
    }
    set({ busy: false });
    return r;
  },
}));