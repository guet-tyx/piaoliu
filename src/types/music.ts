/** 合法情绪标签（歌单/频道筛选用） */
export type TrackMood = "治愈" | "燃" | "伤感" | "平静" | "空灵" | "温暖";
/** 合法场景标签（歌单/频道筛选用） */
export type TrackScene = "深夜" | "学习" | "通勤" | "雨天" | "冥想" | "运动" | "日常";

/** 曲目数据（对应原型 TRACKS 数组） */
export interface Track {
  /** 稳定主键（收藏集合/未来 Supabase 曲库引用） */
  id: string;
  /** 曲名 */
  t: string;
  /** 流派标签 */
  tag: string;
  /** 电台站次/艺术家行 */
  s: string;
  /** 封面图片路径 */
  cover: string;
  /** 音频源列表：按顺序尝试，全部失败则放弃（多源降级） */
  src: string[];
  /** ★ 情绪标签（歌单/频道/筛选） */
  mood: TrackMood[];
  /** ★ 场景标签（歌单/频道/筛选） */
  scene: TrackScene[];
  /** ★ 时长（秒），歌单统计/节目单展示用 */
  duration: number;
  /** 可选：歌词文件路径（LRC，Phase 2 启用） */
  lyric?: string;
}

/** 歌单角标（斜切绶带，可选金色变体） */
export interface PlaylistRibbon {
  label: string;
  /** 金色变体 */
  gold?: boolean;
}

/** 歌单数据（歌单广场/详情页共用） */
export interface Playlist {
  /** ★ 歌单唯一标识，如 "pl-night-postrock" */
  id: string;
  name: string;
  /** 歌单封面 */
  cover: string;
  /** 封面 alt */
  alt: string;
  /** 歌单叙事描述（大卡/detail 头部展示） */
  desc: string;
  /** ★ 风格标签 ["后摇", "氛围"] */
  tags: string[];
  /** ★ 情绪基调 */
  mood: TrackMood;
  /** ★ 场景 */
  scene: TrackScene;
  /** ★ 曲目 ID 列表（有序，决定播放顺序） */
  trackIds: string[];
  /** ★ 是否官方歌单（true=官方，false=用户自建，Phase 2 UGC） */
  official: boolean;
  /** ★ 推荐位排序（越小越靠前，Playlist 广场「推荐排序」用） */
  order?: number;
  /** 角标 */
  ribbon?: PlaylistRibbon;
  meta: {
    /** 播放量文案 */
    plays: string;
    /** 弹幕量文案 */
    dms: string;
    /** 更新时间文案 */
    time: string;
  };
}

/**
 * 用户自建歌单（P2-02 UGC）：
 * 在 Playlist 必填字段基础上增加创建信息；创建时由 makeUgcPlaylist 补默认值
 */
export interface UgcPlaylist extends Playlist {
  /** 创建时间戳（ms），「最新发布」排序用 */
  createdAt: number;
  /** 创建者 id（本地 guest 或 Supabase uid） */
  creatorId: string;
}