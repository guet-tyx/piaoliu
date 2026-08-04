/**
 * 实时通道类型（V1.3 同船共听 FR-10 / 真实弹幕 FR-11）
 * 本地模拟（BroadcastChannel + localStorage 心跳）与 Supabase Realtime 共用
 */

/** 弹幕消息（同船广播 / 系统事件统一结构） */
export interface DanmakuMessage {
  id: string;
  text: string;
  variant?: "pink" | "blue";
  /** 电台频道 id（P3-04 隔离维度；系统事件无） */
  channelId?: string;
  /** 所属曲目 id（null = 全局/系统事件） */
  trackId?: string;
  /** 系统事件弹幕（非用户发布） */
  system?: boolean;
  /** 发布者匿名标识（用于忽略自己广播的回显，避免同页重复显示） */
  peerId?: string;
  /** 时间戳 */
  at: number;
}

/** 同船在线者（匿名：仅会话随机标识，无任何身份信息） */
export interface PresencePeer {
  /** 会话随机匿名标识（每次打开页面重新生成） */
  id: string;
  /** 电台频道 id（P3-04 按频道统计） */
  channelId?: string;
  /** 正在收听的曲目 id */
  trackId: string;
  /** 最近心跳时间戳 */
  at: number;
}

/** 匿名头像确定性颜色（从 peer id 哈希，SSR 安全） */
export function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) % 360;
  }
  return `hsl(${h} 72% 62%)`;
}
