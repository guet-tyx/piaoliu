import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseReady } from "@/lib/supabase/anon";
import { getOrCreateSailor } from "./sailor";
import { readStorage, writeStorage, STORAGE } from "@/lib/storage";
import type { FollowRelation } from "@/types/social";

/**
 * 星海关注 + 漂流广场收藏查询层（P0 F-01 / F-04）：
 * - 关注：本地 drift-follows + 真实模式 follows 表 RPC 双轨
 * - 收藏：仅 localStorage（需求明确本地记录，跨设备不同步）
 * 规则：自我关注拒绝 / 关注上限 100 / 收藏上限 100 / 关注单向不通知
 */

/** 关注上限（F-04） */
export const FOLLOW_LIMIT = 100;
/** 收藏上限（F-01，超出提示「收藏已达上限」） */
export const BOOKMARK_LIMIT = 100;

export type FollowResult =
  | { ok: true; followed: boolean }
  | { ok: false; reason: "self" | "limit" | "offline" };

export type BookmarkResult =
  | { ok: true; bookmarked: boolean }
  | { ok: false; reason: "limit" };

/** 本地关注列表（同步读 + 字段校验兜底） */
export function readFollows(): FollowRelation[] {
  const raw = readStorage<FollowRelation[]>(STORAGE.follows, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (f): f is FollowRelation =>
      typeof f === "object" &&
      f !== null &&
      typeof (f as FollowRelation).followedMark === "string",
  );
}

/** 关注列表（真实模式走 RPC；本地模式同步读） */
export async function getFollows(): Promise<FollowRelation[]> {
  if (!isSupabaseReady()) return readFollows();
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.rpc("get_follows");
  if (!Array.isArray(data)) return [];
  return (data as { followed_mark?: string; created_at?: string }[])
    .map((r) => ({
      followedMark: r.followed_mark ?? "",
      createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
    }))
    .filter((f) => f.followedMark !== "");
}

/**
 * 关注/取消关注（toggle 语义，F-04）：
 * 已关注 → 取消；未关注 → 关注。自我关注拒绝，上限 100。
 */
export async function toggleFollow(mark: string): Promise<FollowResult> {
  const trimmed = mark.trim();
  if (!trimmed) return { ok: false, reason: "self" };
  const me = await getOrCreateSailor();
  if (!me) return { ok: false, reason: "offline" };
  if (trimmed === me.anonMark) return { ok: false, reason: "self" };

  if (!isSupabaseReady()) {
    const follows = readFollows();
    const existing = follows.find((f) => f.followedMark === trimmed);
    if (existing) {
      writeStorage(
        STORAGE.follows,
        follows.filter((f) => f.followedMark !== trimmed),
      );
      return { ok: true, followed: false };
    }
    if (follows.length >= FOLLOW_LIMIT) return { ok: false, reason: "limit" };
    writeStorage(STORAGE.follows, [
      ...follows,
      { followedMark: trimmed, createdAt: Date.now() },
    ]);
    return { ok: true, followed: true };
  }

  const sb = getSupabase();
  if (!sb) return { ok: false, reason: "offline" };
  const { data, error } = await sb.rpc("toggle_follow", { p_mark: trimmed });
  const r = (data ?? {}) as { followed?: boolean };
  if (error) {
    const m = error.message ?? "";
    if (m.includes("self")) return { ok: false, reason: "self" };
    if (m.includes("limit")) return { ok: false, reason: "limit" };
    return { ok: false, reason: "offline" };
  }
  return { ok: true, followed: r.followed === true };
}

/* ---------- 收藏（仅本地，需求明确 localStorage） ---------- */

/** 收藏的瓶子 id 列表（同步读） */
export function readBookmarks(): string[] {
  const raw = readStorage<string[]>(STORAGE.bookmarks, []);
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
}

/** 收藏/取消收藏（toggle 语义，F-01）：上限 100，超出返回 reason "limit" */
export async function toggleBookmark(bottleId: string): Promise<BookmarkResult> {
  const bookmarks = readBookmarks();
  const has = bookmarks.includes(bottleId);
  if (has) {
    writeStorage(
      STORAGE.bookmarks,
      bookmarks.filter((id) => id !== bottleId),
    );
    return { ok: true, bookmarked: false };
  }
  if (bookmarks.length >= BOOKMARK_LIMIT) return { ok: false, reason: "limit" };
  writeStorage(STORAGE.bookmarks, [...bookmarks, bottleId]);
  return { ok: true, bookmarked: true };
}
