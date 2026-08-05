import type { TrackSnapshot } from "./social";

/**
 * 星海共听（P2）：多船客同房间同步听歌，房间内仅匿名弹幕。
 */

/** 房间容量上限 */
export const COLISTEN_CAPACITY = 50;

/** 共听房间（元数据；真实模式也落 DB rooms 表） */
export interface CoListenRoom {
  /** 房间 id（客户端 UUID） */
  id: string;
  /** 房间名（默认「星海共听 · <曲名>」） */
  title: string;
  /** 起点歌曲快照 */
  startTrack: TrackSnapshot;
  /** 推荐播放列表（基于起点歌曲风格 5-10 首，房主可编辑） */
  playlist: TrackSnapshot[];
  /** 创建者代号 */
  createdBy: string;
  /** 房主会话 id（peerId；本地房间 = 创建者自己） */
  hostId: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 最近活跃时间戳（自动解散判定） */
  lastActiveAt: number;
  /** 幽灵成员（仅本地演示多人；真实模式为空） */
  ghosts?: GhostSailor[];
}

/** 房间成员（在线） */
export interface CoListenMember {
  /** 会话标识（本标签页一位船客） */
  peerId: string;
  /** 匿名代号 */
  anonMark: string;
  /** 是否房主 */
  isHost: boolean;
  /** 幽灵成员（本地演示） */
  ghost?: boolean;
}

/** 房间内广播消息（colisten:<roomId> 频道；不持久化） */
export type CoListenMessage =
  | {
      type: "danmaku";
      roomId: string;
      peerId: string;
      anonMark: string;
      text: string;
      at: number;
    }
  | {
      /** 房主广播播放状态（播放/暂停/切歌/进度） */
      type: "play-state";
      roomId: string;
      peerId: string;
      /** 当前播放曲目快照 */
      track: TrackSnapshot;
      /** 播放列表当前下标 */
      index: number;
      playing: boolean;
      /** 当前进度（秒），加入/请求同步用 */
      currentTime: number;
      at: number;
    }
  | {
      type: "vote";
      roomId: string;
      peerId: string;
      action: "up" | "down";
      at: number;
    }
  | {
      /** 票数过半 → 自动切歌 */
      type: "vote-result";
      roomId: string;
      peerId: string;
      at: number;
    }
  | {
      /** 成员离开（房主离开触发转移判定） */
      type: "leave";
      roomId: string;
      peerId: string;
      at: number;
    };

/** 幽灵船客（本地演示多人） */
export interface GhostSailor {
  peerId: string;
  anonMark: string;
}

/** 幽灵弹幕文案池（本地演示氛围） */
export const GHOST_DANMAKU = [
  "这首歌好适合现在听",
  "耳机音量调大了一点",
  "一起听真不错 ✦",
  "这前奏绝了",
  "深夜档来了",
  "有人和我一样在单曲循环吗",
  "这鼓点好上头",
  "顺风，共听愉快",
  "换了一首更喜欢的",
  "这段旋律很治愈",
];