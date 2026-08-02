/**
 * 收集系统定义（FR-9 称号体系 / FR-12 皮肤与徽章）
 * 皮肤/徽章为人工维护的静态定义（与角色文案库同模式），解锁规则可后续调整
 */

/** 称号体系：等级区间 → 称号（4 级起步可扩展） */
export interface TitleTier {
  minLevel: number;
  title: string;
}

export const TITLE_TIERS: TitleTier[] = [
  { minLevel: 1, title: "见习船客" },
  { minLevel: 4, title: "常驻船客" },
  { minLevel: 7, title: "星海领航员" },
  { minLevel: 10, title: "灯塔守望者" },
];

export const MAX_LEVEL = 10;

/** 等级 → 称号 */
export function titleOf(level: number): string {
  let title = TITLE_TIERS[0].title;
  for (const t of TITLE_TIERS) {
    if (level >= t.minLevel) title = t.title;
  }
  return title;
}

/** 羁绊值 → 等级：LvN 需累计羁绊 ≥ N(N+1)/2（行为累积驱动，见 FR-8.3） */
export function levelOfBond(bond: number): number {
  let level = 1;
  while (level < MAX_LEVEL && bond >= (level * (level + 1)) / 2) level++;
  return level;
}

/** 下一级所需羁绊值（进度条用；满级返回 null） */
export function nextLevelBond(bond: number): number | null {
  const level = levelOfBond(bond);
  if (level >= MAX_LEVEL) return null;
  return ((level + 1) * (level + 2)) / 2;
}

/** 纸船皮肤（FR-12）：随等级解锁；id 与 sailors.bottle_style 对齐 */
export interface BoatSkin {
  id: string;
  name: string;
  desc: string;
  unlockLevel: number;
  image: string; // 皮肤搭配场景插画
}

export const SKINS: BoatSkin[] = [
  { id: "paper", name: "纸船", desc: "最初的折纸船，风一吹就会晃。", unlockLevel: 1, image: "/images/boat-paper.png" },
  { id: "crane", name: "千纸鹤", desc: "折了 99 次才学会的航线。", unlockLevel: 4, image: "/images/boat-crane.png" },
  { id: "star", name: "星船", desc: "用星尘糊成的船，夜里会发光。", unlockLevel: 7, image: "/images/boat-star.png" },
];

/** 行为统计（徽章判定与羁绊数据源；真实模式由 action_logs 聚合） */
export interface SailorStats {
  /** 累计启航数 */
  launched: number;
  /** 累计拾瓶数 */
  picked: number;
  /** 累计回信数 */
  replied: number;
  /** 当前连续听歌数（session 内） */
  listenStreak: number;
  /** 历史最高连续听歌数 */
  maxListenStreak: number;
}

/** 徽章定义（FR-12）：条件基于行为统计，达成后写入 sailor.badges */
export interface BadgeDef {
  id: string;
  name: string;
  desc: string;
  image: string; // 徽章插画
  check: (stats: SailorStats) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: "first-launch", name: "第一艘船", desc: "启航你的第一艘纸船", image: "/images/badge-first-launch.png", check: (s) => s.launched >= 1 },
  { id: "first-reply", name: "有船靠岸", desc: "送出第一封回信", image: "/images/badge-first-reply.png", check: (s) => s.replied >= 1 },
  { id: "pick-10", name: "拾贝十人", desc: "拾起 10 艘漂流中的纸船", image: "/images/badge-pick-10.png", check: (s) => s.picked >= 10 },
  { id: "listen-3", name: "夜航三曲", desc: "一口气连续听完 3 首歌", image: "/images/badge-listen-3.png", check: (s) => s.maxListenStreak >= 3 },
];

/** 已达成但未解锁的徽章列表 */
export function pendingBadges(stats: SailorStats, unlocked: string[]): BadgeDef[] {
  return BADGES.filter((b) => !unlocked.includes(b.id) && b.check(stats));
}
