import type { Bottle } from "@/types/social";
import { getLocalSailorSync } from "@/lib/api/sailor";

/**
 * 展示名统一逻辑（账号系统默认展示昵称，匿名为可选项）：
 * - 瓶子展示名 = 冻结昵称（投瓶时写入）→ 当前船客昵称（同匿名代号匹配，旧瓶/漏冻结自动跟随）→ 匿名代号
 * - 代号展示名 = 当前船客的代号时用其昵称 → 匿名代号（排行榜/留言墙/回信等无瓶对象的展示面）
 */

/** 瓶子展示名：优先自定义昵称；未设置/旧瓶数据时回查当前船客昵称，最后兜底匿名代号 */
export function bottleDisplayName(bottle: Pick<Bottle, "anonMark" | "nickname">): string {
  const frozen = bottle.nickname?.trim();
  if (frozen) return frozen;
  // 账号系统默认展示昵称：冻结缺失（旧瓶）时，若瓶子属于当前船客则跟随当前昵称
  const own = currentSailorNickname();
  if (own && own.mark === bottle.anonMark) return own.nickname;
  return bottle.anonMark;
}

/** 匿名代号 → 展示名（排行榜「本周船客」/留言墙评论/回信人等无 Bottle 对象的展示面） */
export function markDisplayName(mark: string): string {
  const own = currentSailorNickname();
  if (own && own.mark === mark) return own.nickname;
  return mark;
}

/** 当前船客的昵称（同步读本地船员证；SSR/无船员证返回 null） */
function currentSailorNickname(): { mark: string; nickname: string } | null {
  // SSR 安全：服务端无 localStorage（客户端数据在 effect 后加载，不参与首屏）
  if (typeof localStorage === "undefined") return null;
  const sailor = getLocalSailorSync();
  const nick = sailor?.nickname?.trim();
  if (!sailor || !nick) return null;
  return { mark: sailor.anonMark, nickname: nick };
}