/**
 * 角色生活状态（PRD 需求③，2026-08-04）：
 * 每角色一套「生活状态池」——白天随机池 / 深夜安静池 / 思考中·输入中固定文案 / 悬停细节。
 * 数据单一来源；轮换时机由 src/hooks/useLifeStatus.ts 驱动。
 */

import { CHANNELS } from "@/data/channels";

export interface LifeStatus {
  /** 全局唯一 key（轮换时用于避开连续重复） */
  key: string;
  icon: string;
  text: string;
}

export interface LifeStatusPool {
  roleId: string;
  /** 白天（6:00-22:00）随机池 */
  day: LifeStatus[];
  /** 深夜（0:00-6:00）安静池（每角色 1 条，几乎不切换） */
  night: LifeStatus[];
  /** AI 思考中固定文案 */
  thinking: LifeStatus;
  /** AI 输入中（流式）固定文案 */
  streaming: LifeStatus;
  /** 悬停细节文案（3-4 条） */
  tooltips: string[];
}

/** 未知角色兜底（对齐 personaOf 默认汐的从容） */
const FALLBACK: LifeStatus = { key: "idle", icon: "✨", text: "发着呆" };

export const LIFE_STATUS_POOLS: LifeStatusPool[] = [
  // 汐 · 温柔陪伴型
  {
    roleId: "sio",
    day: [
      { key: "sio-listen", icon: "🎧", text: "正在听歌" },
      { key: "sio-starchart", icon: "🌌", text: "翻着星图" },
      { key: "sio-write", icon: "✍️", text: "写着什么" },
      { key: "sio-tea", icon: "☕", text: "泡了杯茶" },
      { key: "sio-stargaze", icon: "🌙", text: "看着星星发呆" },
      { key: "sio-hum", icon: "🎵", text: "哼着不知名的调子" },
      { key: "sio-paperboat", icon: "⛵", text: "折着一只纸船" },
      { key: "sio-tune", icon: "📻", text: "调着电台频率" },
    ],
    night: [{ key: "sio-night", icon: "🌙", text: "看着星星发呆" }],
    thinking: { key: "sio-thinking", icon: "✍️", text: "正在想怎么回" },
    streaming: { key: "sio-streaming", icon: "🎵", text: "哼着不知名的调子" },
    tooltips: [
      "🎧 汐正在听深夜频道",
      "🎵 汐在哼一首没听过的歌",
      "🌌 汐说今晚的星图很好看",
      "⛵ 汐在折一只会漂走的纸船",
    ],
  },
  // 流明 · 知性冷静型
  {
    roleId: "lumen",
    day: [
      { key: "lumen-book", icon: "📖", text: "翻着一本旧书" },
      { key: "lumen-lens", icon: "💡", text: "擦着灯塔透镜" },
      { key: "lumen-log", icon: "📝", text: "写着航海日志" },
      { key: "lumen-coffee", icon: "☕", text: "煮了杯咖啡" },
      { key: "lumen-horizon", icon: "🌊", text: "望着海平面" },
      { key: "lumen-scope", icon: "🔭", text: "校准着望远镜" },
    ],
    night: [{ key: "lumen-night", icon: "💡", text: "灯塔的灯还亮着" }],
    thinking: { key: "lumen-thinking", icon: "📝", text: "在纸上写写划划" },
    streaming: { key: "lumen-streaming", icon: "💡", text: "挑了挑灯芯" },
    tooltips: [
      "📖 流明在看一本关于灯塔的书",
      "🌊 流明在听海风的方向",
      "💡 灯塔的光是流明的心跳",
      "📝 流明的航海日志记到了第三百页",
    ],
  },
  // 朔空 · 元气活泼型
  {
    roleId: "soku",
    day: [
      { key: "soku-deck", icon: "🎛️", text: "搓着碟" },
      { key: "soku-mic", icon: "🎤", text: "调试麦克风" },
      { key: "soku-bounce", icon: "🕺", text: "跟着节奏晃" },
      { key: "soku-chart", icon: "📋", text: "翻着本周热歌" },
      { key: "soku-snack", icon: "🍿", text: "拆了包薯片" },
      { key: "soku-social", icon: "📱", text: "在群里水群" },
    ],
    night: [{ key: "soku-night", icon: "📻", text: "电台信号微弱" }],
    thinking: { key: "soku-thinking", icon: "🎛️", text: "在找最带感的节奏" },
    streaming: { key: "soku-streaming", icon: "🎤", text: "清了清嗓子" },
    tooltips: [
      "🎛️ 朔空在打今晚的第一首",
      "🍿 朔空说薯片配音乐才是王道",
      "📱 朔空在群里水着水着就忘了回你",
      "🕺 朔空的椅子快晃散架了",
    ],
  },
  // 悠 · 神秘空灵型
  {
    roleId: "yoe",
    day: [
      { key: "yoe-astrolabe", icon: "🔮", text: "看着星盘" },
      { key: "yoe-tea", icon: "🍵", text: "煮着一壶茶" },
      { key: "yoe-poem", icon: "📜", text: "写着什么" },
      { key: "yoe-meditate", icon: "🧘", text: "闭眼冥想" },
      { key: "yoe-rain", icon: "🌧", text: "听着雨声" },
      { key: "yoe-candle", icon: "🕯️", text: "对着烛火发呆" },
    ],
    night: [{ key: "yoe-night", icon: "🕯️", text: "烛火快要熄了" }],
    thinking: { key: "yoe-thinking", icon: "🔮", text: "捻着星线推演" },
    streaming: { key: "yoe-streaming", icon: "🍵", text: "吹了吹茶上的热气" },
    tooltips: [
      "🔮 悠在解今晚的星象",
      "🍵 悠煮的茶有股星光的味道",
      "🕯️ 悠说烛火里住着故事",
      "🌧 悠说雨声是写给失眠者的歌",
    ],
  },
];

/** 按角色取状态池（未知角色返回 undefined） */
export function lifePoolOf(roleId: string): LifeStatusPool | undefined {
  return LIFE_STATUS_POOLS.find((p) => p.roleId === roleId);
}

/**
 * 随机取一条生活状态：
 * - night=true 用深夜安静池；
 * - 避开当前（excludeKey），池中只有一条时允许重复（深夜即此情形）；
 * - 未知角色兜底「发着呆」。
 */
export function pickLifeStatus(
  pool: LifeStatusPool | undefined,
  excludeKey?: string,
  night = false,
): LifeStatus {
  if (!pool) return FALLBACK;
  const list = night ? pool.night : pool.day;
  const src = list.length === 0 ? [FALLBACK] : list;
  const candidates = src.filter((s) => s.key !== excludeKey);
  const pick = candidates.length > 0 ? candidates : src;
  return pick[Math.floor(Math.random() * pick.length)];
}

/** 轮换间隔（ms）：白天 30s / 深夜 22-0 45s / 午夜 0-6 60s */
export const LIFE_INTERVAL_DAY = 30_000;
export const LIFE_INTERVAL_EVENING = 45_000;
export const LIFE_INTERVAL_NIGHT = 60_000;

export function lifeIntervalOf(date: Date): number {
  const h = date.getHours();
  if (h >= 0 && h < 6) return LIFE_INTERVAL_NIGHT; // 午夜 0-6：安静，少切换
  if (h >= 22) return LIFE_INTERVAL_EVENING; // 深夜 22-0：舒缓一点
  return LIFE_INTERVAL_DAY; // 白天 6-22：正常频率
}

/** 是否深夜时段（0:00-6:00，用安静状态池） */
export function isNightHour(date: Date): boolean {
  const h = date.getHours();
  return h >= 0 && h < 6;
}

/** 电台频道联动（PRD §5.1）：正在听某频道时返回「正在听{频道名}」 */
export function channelLifeOf(channelId: string): LifeStatus | null {
  const ch = CHANNELS.find((c) => c.id === channelId);
  if (!ch) return null;
  return { key: `channel:${channelId}`, icon: "🎧", text: `正在听${ch.name}` };
}
