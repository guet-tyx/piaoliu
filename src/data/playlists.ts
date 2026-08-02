/** 歌单卡数据（迁移自 archive/anime-style.html 歌单区块） */
export interface PlaylistRibbon {
  label: string;
  /** 金色变体 */
  gold?: boolean;
}

export interface Playlist {
  name: string;
  cover: string;
  alt: string;
  /** 歌单叙事文案（米哈游舞台式描述，active 大卡展示） */
  desc: string;
  /** 斜切绶带角标（可选） */
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
 * 歌单 1-4 与曲目 1-4 一一对应（视觉关联，点击后播放对应曲目）
 */
export const PLAYLISTS: Playlist[] = [
  {
    name: "深夜电台 · 第 1001 夜",
    cover: "/images/cover-anime-1.png",
    alt: "深夜电台歌单封面",
    desc: "零点后的星海电台不打烊。第 1001 个夜晚，把心事折进纸船，让旋律载着它漂向深海——这里只收留睡不着的人。",
    ribbon: { label: "推荐" },
    meta: { plays: "128.4万", dms: "3.2万", time: "2天前" },
  },
  {
    name: "城市漫游 BGM · 晚霞限定",
    cover: "/images/cover-anime-2.png",
    alt: "城市漫游 BGM 歌单封面",
    desc: "晚霞把城市染成蜜色。耳机里放一首漫游曲，沿着天桥走到尽头——这是一张只属于黄昏的限定航线。",
    ribbon: { label: "新", gold: true },
    meta: { plays: "86.2万", dms: "1.9万", time: "5天前" },
  },
  {
    name: "雨天漂流 · 纸船不打烊",
    cover: "/images/cover-anime-3.png",
    alt: "雨天漂流歌单封面",
    desc: "雨天的街像一条河。折一只纸船放进水洼，它载着这段旋律漂向你——天气预报说：今日降水概率 100%，打烊概率 0%。",
    meta: { plays: "54.8万", dms: "9876", time: "1周前" },
  },
  {
    name: "失眠者之海 · 给睡不着的你",
    cover: "/images/cover-anime-4.png",
    alt: "失眠者之海歌单封面",
    desc: "失眠的夜里，整座城市都沉进海底，只有你的房间亮着。这片海不收船票——躺下，让浪声替你数羊。",
    ribbon: { label: "热" },
    meta: { plays: "41.3万", dms: "1.1万", time: "1周前" },
  },
];
