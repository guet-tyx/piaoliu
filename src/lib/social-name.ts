import type { Bottle } from "@/types/social";

/**
 * 瓶子作者的展示名（P2 需求：广场显示昵称）：
 * 优先自定义昵称（船员证设置，投瓶时冻结）；未设置/旧瓶数据时兜底匿名代号。
 */
export function bottleDisplayName(bottle: Pick<Bottle, "anonMark" | "nickname">): string {
  const nick = bottle.nickname?.trim();
  return nick || bottle.anonMark;
}