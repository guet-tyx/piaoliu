/**
 * 统一 localStorage 工具（全站唯一实现，V2.7 收敛）：
 * - 所有 drift-* 键集中在此声明，杜绝散落各处的字符串字面量（drift-sailor 曾双写）；
 * - 读取一律 try/catch + 可选字段校验（损坏数据静默兜底，隐私模式可用）；
 * - 写入 try/catch（隐私模式 / 配额超限等失败静默忽略）。
 */

/** 全站 localStorage 键注册表（值即键名；每角色独立键由 roleKey 派生） */
export const STORAGE = {
  /** 聊天消息历史（每角色：drift-chat-<roleId>） */
  chat: "drift-chat",
  /** 对话自动总结摘要（每角色：drift-chat-summary-<roleId>） */
  chatSummary: "drift-chat-summary",
  /** 角色生活状态（每角色：drift-life-status-<roleId>） */
  lifeStatus: "drift-life-status",
  /** 角色每日一句（每角色：drift-greeting-<roleId>，首页每日一句占用） */
  greeting: "drift-greeting",
  /** 开场白最近记录（每角色：drift-chat-greeting-<roleId>，避开首页占用） */
  chatGreeting: "drift-chat-greeting",
  /** UGC 自建歌单 */
  ugcPlaylists: "drift-ugc-playlists",
  /** 播放器状态（音量/静音/模式/弹幕等，V2：drift-player-state） */
  playerState: "drift-player-state",
  /** 曲目收藏 */
  favorites: "drift-favorites",
  /** 歌单收藏 */
  favPlaylists: "drift-fav-playlists",
  /** 星尘船员证 */
  sailor: "drift-sailor",
  /** 行为统计（徽章判定/羁绊数据源） */
  stats: "drift-stats",
  /** 按天行为活动（周报「本周」统计源） */
  dailyActivity: "drift-daily-activity",
  /** 找回码映射（本地模拟） */
  recovery: "drift-recovery",
  /** 每日一次的行为去重记录（航行 1 天/听歌 3 首等） */
  bondDaily: "drift-bond-daily",
  /** 汐行为回应 7 天去重记录 */
  responsesRecent: "drift-responses-recent",
  /** 漂流瓶池（本地模拟） */
  bottlesPool: "drift-bottles-pool",
  /** 漂流瓶每日限额 */
  limits: "drift-limits",
  /** 漂流瓶回信 */
  replies: "drift-replies",
  /** 漂流瓶举报记录 */
  reports: "drift-reports",
  /** 漂流广场收藏的瓶子 id 列表（P0 F-01，上限 100） */
  bookmarks: "drift-bookmarks",
  /** 星海关注关系列表（P0 F-04，上限 100） */
  follows: "drift-follows",
  /** 同船在线心跳（本地模拟） */
  presence: "drift-presence",
  /** 角色情感状态（人机感，每角色：drift-emotion-<roleId>） */
  emotion: "drift-emotion",
  /** 角色记得的关于用户的关键记忆（人机感，每角色：drift-memories-<roleId>） */
  memories: "drift-memories",
} as const;

/** 每角色独立键构造器：`${prefix}-${roleId}` */
export function roleKey(prefix: string, roleId: string): string {
  return `${prefix}-${roleId}`;
}

/** 聊天消息历史键 */
export const chatKey = (roleId: string) => roleKey(STORAGE.chat, roleId);
/** 对话总结摘要键 */
export const chatSummaryKey = (roleId: string) => roleKey(STORAGE.chatSummary, roleId);
/** 生活状态键 */
export const lifeStatusKey = (roleId: string) => roleKey(STORAGE.lifeStatus, roleId);
/** 每日一句键（首页占用） */
export const greetingKey = (roleId: string) => roleKey(STORAGE.greeting, roleId);
/** 开场白最近记录键（聊天页占用） */
export const chatGreetingKey = (roleId: string) => roleKey(STORAGE.chatGreeting, roleId);
/** 角色情感状态键 */
export const emotionKey = (roleId: string) => roleKey(STORAGE.emotion, roleId);
/** 角色关键记忆键 */
export const memoriesKey = (roleId: string) => roleKey(STORAGE.memories, roleId);

/**
 * 读 JSON；不存在 / 解析失败 / guard 校验不通过 → fallback。
 * guard 用于「缺字段即视为损坏」的兜底（如 ChatSummary 必须含 text/covered）。
 * 重载：fallback 传 null（读可缺失对象）时返回 T | null，否则返回 T。
 */
export function readStorage<T>(
  key: string,
  fallback: T,
  guard?: (v: unknown) => boolean,
): T;
export function readStorage<T>(
  key: string,
  fallback: null,
  guard?: (v: unknown) => boolean,
): T | null;
export function readStorage<T>(
  key: string,
  fallback: T | null,
  guard?: (v: unknown) => boolean,
): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (guard && !guard(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

/** 写 JSON；隐私模式 / 配额超限等失败静默忽略（不打断用户操作） */
export function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 隐私模式等场景忽略写入失败
  }
}
