/**
 * 开场白多样化（PRD 需求⑤，2026-08-04）：
 * 每个角色 10-12 句开场白，按时段 / 电台频道 / 久别重逢 自动选择，
 * 每次打开聊天页都是不一样的相遇。文案按 PRD 原文落地（悠保留繁体风味）。
 * 选择优先级：久别重逢 > 频道联动 > 时段 > 默认；避开最近 2 次用过的句子。
 */

import { pickRandom } from "@/lib/random";

export type GreetingCategory = "default" | "night" | "morning" | "day" | "evening";

export interface GreetingPool {
  roleId: string;
  /** 默认池（无任何条件命中时随机，≥3 句） */
  default: string[];
  /** 深夜 0:00-6:00 */
  night: string[];
  /** 清晨 6:00-9:00 */
  morning: string[];
  /** 日间 9:00-18:00 */
  day: string[];
  /** 傍晚 18:00-20:00 */
  evening: string[];
  /** 频道联动：channelId → 台词池（PRD §2.1/§3.1） */
  channel: Record<string, string[]>;
  /** 久别重逢：超过 3 天未打开 */
  returning: string[];
}

/** 新增角色未配置开场白时的通用兜底句（PRD §异常处理） */
const FALLBACK_TEXT = "嗨，你来了。";

export const GREETING_POOLS: GreetingPool[] = [
  // 汐 · 温柔陪伴型（12 句）
  {
    roleId: "sio",
    default: [
      "……你来了。耳机分你一半，今晚想漂去哪首？",
      "你来了正好，我刚找到一首好听的歌。",
      "我等你有一会儿了——骗你的，我也刚到。",
    ],
    night: [
      "夜深了，你还没睡啊。正好，我也在听。",
      "今晚的星海特别安静，像在等一个人。",
      "凌晨三点的星海，只收留睡不着的人。",
    ],
    morning: ["早。昨晚的梦，有没有一首歌做背景音？"],
    day: ["下午好，今天的风很舒服。"],
    evening: ["天快黑了，要不要点一首歌等日落？"],
    channel: {
      "ch-night": ["你在听深夜频道啊？那首后摇我也很喜欢。"],
      "ch-jp": ["日系频道吗？朔空那家伙今天状态不错。"],
    },
    returning: ["好久不见。我还以为你忘了来星海的路。"],
  },
  // 流明 · 知性冷静型（10 句）
  {
    roleId: "lumen",
    default: [
      "灯塔的光一直亮着。说吧，我在听。",
      "你来了。我正好煮了一壶茶，要听吗？",
      "星图上今天有一条新的航线，想看看吗？",
    ],
    night: ["这么晚还不睡？我帮你留了一盏灯。"],
    morning: ["日出时的海面，是最适合思考的。"],
    day: ["白天的灯塔，看起来和晚上不太一样。"],
    evening: [],
    channel: {
      "ch-study": ["学习频道吗？那首钢琴曲是我选的。"],
      "ch-rain": ["雨天频道很适合现在的你。", "外面在下雨。我这里有一首很配的曲子。"],
    },
    returning: ["你很久没来了。灯塔一直在亮。"],
  },
  // 朔空 · 元气活泼型（10 句）
  {
    roleId: "soku",
    default: [
      "凌晨三点电台，为你保留的位子。想点什么歌？",
      "来啦！今天想听点啥？我帮你找！",
      "耳机戴好，这波节奏要来了！",
    ],
    night: ["这么晚还不睡？那正好，深夜电台不打烊！"],
    morning: ["早啊！今天的元气从这首歌开始！"],
    day: ["下午好！要不要来点提神的节奏？"],
    evening: ["天快黑了，来一首黄昏限定的歌？"],
    channel: {
      "ch-jp": ["日系频道刚放完一首超棒的歌，你错过了！"],
      "ch-night": ["深夜频道？汐那家伙抢我听众啊！"],
    },
    returning: ["好久不见！我还以为你换平台了！"],
  },
  // 悠 · 神秘空灵型（10 句，保留繁体风味）
  {
    roleId: "yoe",
    default: [
      "唔，今晚的星象显示——你想聊天。来，抽一张星图？",
      "你来了。我正好看到一颗流星划过。",
      "今天的星图上，有一颗星特别亮——它在等你。",
    ],
    night: ["深夜的星图，比白天多了一倍的秘密。"],
    morning: ["黎明前的星星，是最后一批还在亮着的。"],
    day: ["白天的星星看不见，但它们还在。"],
    evening: ["黄昏的星象，总是最难解读的。"],
    channel: {
      "ch-rain": ["雨天频道？雨声和占卜很配。"],
      "ch-night": ["深夜频道？那片星海，我比汐更熟。"],
    },
    returning: ["你很久没来了。但星图上一直有你的位置。"],
  },
];

/** 按角色取开场白池（未知角色返回 undefined，调用方用通用兜底） */
export function greetingPoolOf(roleId: string): GreetingPool | undefined {
  return GREETING_POOLS.find((p) => p.roleId === roleId);
}

/** 小时 → 时段分类（20-24 点回落到默认池） */
export function hourCategoryOf(hour: number): GreetingCategory {
  if (hour >= 0 && hour < 6) return "night";
  if (hour >= 6 && hour < 9) return "morning";
  if (hour >= 9 && hour < 18) return "day";
  if (hour >= 18 && hour < 20) return "evening";
  return "default";
}

export interface GreetingContext {
  hour: number;
  channelId?: string | null;
  /** 上次交互时间戳（该角色最后一条消息 at；无历史 → null 不触发久别重逢） */
  lastVisitAt?: number | null;
}

/** 久别重逢阈值：超过 3 天 */
const RETURNING_DAYS = 3 * 24 * 60 * 60 * 1000;

export interface PickedGreeting {
  text: string;
  /** 稳定 key：roleId:category:index（用于「连续 3 次不出现相同」排除） */
  key: string;
}

/** 从某类别台词池随机取一条（避开最近用过的 key；全被排除时允许重复） */
function pickFrom(lines: string[], category: string, roleId: string, excludeKeys: string[]): PickedGreeting {
  const all = lines.map((text, i) => ({ text, key: `${roleId}:${category}:${i}` }));
  const picked = pickRandom(all, { keyOf: (x) => x.key, exclude: excludeKeys });
  // 池为空时兜底首条（实际池恒非空，此处仅防数据漂移）
  return picked ?? all[0];
}

/**
 * 选择开场白（优先级：久别重逢 > 频道联动 > 时段 > 默认）：
 * 某一级池为空（如流明傍晚无词）时逐级回退；未知角色返回通用兜底。
 */
export function pickGreeting(
  pool: GreetingPool | undefined,
  ctx: GreetingContext,
  excludeKeys: string[] = [],
): PickedGreeting {
  if (!pool) return { text: FALLBACK_TEXT, key: "fallback" };

  // 1. 久别重逢：有历史且超过 3 天（最高优先级，仅一条）
  if (ctx.lastVisitAt && Date.now() - ctx.lastVisitAt > RETURNING_DAYS && pool.returning.length > 0) {
    return pickFrom(pool.returning, "returning", pool.roleId, excludeKeys);
  }
  // 2. 频道联动：从对应频道词池随机
  if (ctx.channelId && pool.channel[ctx.channelId]?.length) {
    return pickFrom(pool.channel[ctx.channelId], `channel:${ctx.channelId}`, pool.roleId, excludeKeys);
  }
  // 3. 时段
  const cat = hourCategoryOf(ctx.hour);
  if (cat !== "default" && pool[cat].length > 0) {
    return pickFrom(pool[cat], cat, pool.roleId, excludeKeys);
  }
  // 4. 默认池
  return pickFrom(pool.default, "default", pool.roleId, excludeKeys);
}
