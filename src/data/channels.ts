/** 电台频道（P1-05 多频道电台系统） */
export interface Channel {
  /** 频道唯一 id */
  id: string;
  /** 频道名，如 "深夜频道" */
  name: string;
  /** emoji 图标 */
  icon: string;
  /** 频道描述 */
  desc: string;
  /** 主持人角色 id（sio/lumen/soku/yoe，对应 character.ts；私人 FM 为 null） */
  host: string | null;
  /** 风格标签 */
  style: string[];
  /** 曲目池 id 列表（决定曲目顺序；私人 FM 为空，动态生成） */
  trackIds: string[];
  /** 进入频道时主持人打招呼台词 */
  greeting: string;
}

/**
 * 星海电台 5 频道（与歌单共用曲目池，多源一致）：
 * 深夜 sio / 日系 soku / 学习 lumen / 雨天 yoe / 私人 FM（动态推荐）
 */
export const CHANNELS: Channel[] = [
  {
    id: "ch-night",
    name: "深夜频道",
    icon: "🌙",
    desc: "零点后的星海，只有后摇和心事",
    host: "sio",
    style: ["后摇", "氛围", "纯音乐"],
    trackIds: ["t01", "t05", "t06", "t07", "t08", "t09", "t10", "t11", "t02", "t03"],
    greeting: "夜深了，让我陪你听一首歌吧",
  },
  {
    id: "ch-jp",
    name: "日系频道",
    icon: "🎌",
    desc: "像一阵风穿过夏日祭的街道",
    host: "soku",
    style: ["日系", "J-Pop", "电子"],
    trackIds: ["t12", "t13", "t14", "t15", "t16", "t17", "t18", "t19", "t20", "t21"],
    greeting: "ようこそ！今天的风很舒服，适合听歌",
  },
  {
    id: "ch-study",
    name: "学习频道",
    icon: "☕",
    desc: "翻开书，戴上耳机，世界安静了",
    host: "lumen",
    style: ["纯音乐", "钢琴", "轻音乐"],
    trackIds: ["t22", "t23", "t24", "t25", "t26", "t27", "t28", "t29"],
    greeting: "翻开书，戴上耳机，世界安静了",
  },
  {
    id: "ch-rain",
    name: "雨天频道",
    icon: "🌧",
    desc: "窗外下雨，耳机里有座钢琴",
    host: "yoe",
    style: ["钢琴", "环境", "氛围"],
    trackIds: ["t04", "t30", "t31", "t32", "t33", "t34", "t35", "t36"],
    greeting: "雨停了，但旋律还在下",
  },
  {
    id: "ch-fm",
    name: "私人 FM",
    icon: "📻",
    desc: "为你推荐，每一首都是惊喜",
    host: null,
    style: ["混合"],
    trackIds: [], // 动态生成（随机抽样）
    greeting: "让我猜猜你现在想听什么",
  },
];

/** 私人 FM 随机抽样数量 */
export const FM_POOL_SIZE = 10;
