/**
 * V1.1 社交数据模型（纸船漂流 / 星尘船员证）
 * 字段与 Supabase 行结构对齐（snake_case ↔ camelCase 在查询层转换），
 * 本地模拟池与真实 RPC 共用同一套类型
 */

/** 漂流瓶状态机：漂流 → 被拾 → 已回信 / 沉没 */
export type BottleStatus = "drifting" | "picked" | "replied" | "sunk";

/** 曲目快照：投瓶时冻结歌曲信息，防曲库变更后展示失真 */
export interface TrackSnapshot {
  /** 曲名 */
  t: string;
  /** 流派标签 */
  tag: string;
  /** 电台站次/艺术家行 */
  s: string;
  /** 封面图片路径 */
  cover: string;
}

/** 漂流瓶（对应 supabase.bottles） */
export interface Bottle {
  id: string;
  /** 投瓶人（本地模拟为游客 id 或 "system"） */
  authorId: string;
  /** 瓶内文字 10-200 字 */
  text: string;
  /** 绑定的歌曲快照 */
  track: TrackSnapshot;
  /** 纸船样式（V1.2 皮肤系统启用，当前为默认值） */
  bottleStyle: string;
  /** 匿名代号（「纸船·A7F3」风格） */
  anonMark: string;
  status: BottleStatus;
  /** 拾取人 id，未拾取为 null */
  pickedBy: string | null;
  /** 冷启动预热瓶（系统投放） */
  isSystem: boolean;
  /** 创建时间戳（本地模拟用 number；Supabase 为 timestamptz） */
  createdAt: number;
  /** 已回信时间，未回信为 null */
  repliedAt: number | null;
  /** 投瓶人已读（星海来讯），未读为 null */
  readAt: number | null;
}

/** 回信（对应 supabase.replies） */
export interface Reply {
  id: string;
  bottleId: string;
  /** 回信人匿名代号 */
  anonMark: string;
  /** 回信文字 10-200 字 */
  text: string;
  createdAt: number;
}

/** 星尘船员证（对应 supabase.sailors；V1.2 激活昵称/羁绊/等级/皮肤/徽章） */
export interface Sailor {
  id: string;
  /** 匿名代号（零注册自动生成） */
  anonMark: string;
  /** 当前纸船皮肤 id（paper/crane/star，对应 supabase.bottle_style；V1.2 皮肤系统） */
  bottleStyle: string;
  /** 自定义昵称（1-12 字，敏感词校验；V1.2 启用） */
  nickname: string | null;
  /** 羁绊值（行为累积，V1.2 启用） */
  bondValue: number;
  /** 星尘等级（由羁绊值推导，V1.2 启用） */
  level: number;
  /** 已解锁徽章 id 集合（V1.2 启用） */
  badges: string[];
  createdAt: number;
}

/** 每日限额（本地模拟按客户端日期；真实模式以服务端 Asia/Shanghai 为准） */
export interface DailyLimits {
  /** 本地日期 YYYY-MM-DD */
  date: string;
  /** 今日已投瓶数（上限 1） */
  launched: number;
  /** 今日已拾瓶数（上限 3） */
  picked: number;
}

/** 按天行为活动（V2.0 周报「本周」统计源；真实模式由 action_logs 聚合） */
export interface DailyActivity {
  /** 本地日期 YYYY-MM-DD */
  date: string;
  launched: number;
  picked: number;
  replied: number;
  listenCount: number;
}

/** 投瓶结果 */
export type LaunchResult =
  | { ok: true; bottle: Bottle }
  | { ok: false; reason: "limit" | "bad-word" | "too-short" | "too-long" | "offline" };

/** 拾瓶结果 */
export type PickResult =
  | { ok: true; bottle: Bottle }
  | { ok: false; reason: "limit" | "empty" | "offline" };

/** 回信结果 */
export type ReplyResult =
  | { ok: true; reply: Reply }
  | { ok: false; reason: "limit" | "bad-word" | "too-short" | "too-long" | "forbidden" | "offline" };
