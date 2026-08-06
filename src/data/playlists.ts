import type { Playlist } from "@/types/music";

/**
 * 星海电台官方歌单（6 张，52 首全覆盖、曲目不重复）
 * - trackIds 决定播放顺序；trackCount / totalDuration 由 music-utils 派生
 * - order 越小越靠前（歌单广场「推荐排序」）
 */
export const PLAYLISTS: Playlist[] = [
  {
    id: "pl-night-postrock",
    name: "🌙 深夜电台 · 后摇诗篇",
    cover: "/images/playlist-covers/pl-night-postrock.webp",
    alt: "深夜电台后摇诗篇歌单封面",
    desc: "零点后的星海，只有后摇和心事。第 1001 个夜晚不打烊——把心事折进纸船，让旋律载着它漂向深海。",
    tags: ["后摇", "氛围"],
    mood: "治愈",
    scene: "深夜",
    trackIds: [
      "t01", "t05", "t06", "t07", "t08", "t09", "t10", "t11", "t02", "t03",
    ],
    official: true,
    order: 1,
    ribbon: { label: "推荐" },
    meta: { plays: "128.4万", dms: "3.2万", time: "2天前" },
  },
  {
    id: "pl-jp-breeze",
    name: "🎐 日系 breeze · 风之旅",
    cover: "/images/playlist-covers/pl-jp-breeze.webp",
    alt: "日系 breeze 风之旅歌单封面",
    desc: "像一阵风穿过夏日祭的街道。耳机里全是轻快的晴天，适合把通勤路走成一段旅程。",
    tags: ["日系", "J-Pop"],
    mood: "温暖",
    scene: "通勤",
    trackIds: [
      "t12", "t13", "t14", "t15", "t16", "t17", "t18", "t19", "t20", "t21",
    ],
    official: true,
    order: 2,
    ribbon: { label: "新", gold: true },
    meta: { plays: "86.2万", dms: "1.9万", time: "5天前" },
  },
  {
    id: "pl-study-piano",
    name: "📚 学习自习室 · 轻音",
    cover: "/images/playlist-covers/pl-study-piano.webp",
    alt: "学习自习室轻音歌单封面",
    desc: "翻书声和钢琴，是最配的搭档。旋律不抢注意力，只在桌边安静地陪着——今日专注进度：+∞。",
    tags: ["纯音乐", "钢琴"],
    mood: "平静",
    scene: "学习",
    trackIds: [
      "t22", "t23", "t24", "t25", "t26", "t27", "t28", "t29",
    ],
    official: true,
    order: 3,
    meta: { plays: "54.8万", dms: "9876", time: "1周前" },
  },
  {
    id: "pl-rain-piano",
    name: "🌧 雨の日 · 钢琴物语",
    cover: "/images/playlist-covers/pl-rain-piano.webp",
    alt: "雨之日钢琴物语歌单封面",
    desc: "窗外下雨，耳机里有座钢琴。雨天的街像一条河，天气预报说：今日降水概率 100%，打烊概率 0%。",
    tags: ["钢琴", "环境"],
    mood: "伤感",
    scene: "雨天",
    trackIds: [
      "t04", "t30", "t31", "t32", "t33", "t34", "t35", "t36",
    ],
    official: true,
    order: 4,
    ribbon: { label: "热" },
    meta: { plays: "41.3万", dms: "1.1万", time: "1周前" },
  },
  {
    id: "pl-stardust-electro",
    name: "✨ 星尘歌单 · 电子漫游",
    cover: "/images/playlist-covers/pl-stardust-electro.webp",
    alt: "星尘歌单电子漫游封面",
    desc: "星尘做燃料，在旋律里漂向深空。合成器轰鸣如引擎——耳机戴好，这波节奏我带你飞。",
    tags: ["电子", "合成器"],
    mood: "燃",
    scene: "运动",
    trackIds: [
      "t37", "t38", "t39", "t40", "t41", "t42", "t43", "t44",
    ],
    official: true,
    order: 5,
    meta: { plays: "32.6万", dms: "8642", time: "2周前" },
  },
  {
    id: "pl-anime-ost",
    name: "🎬 次元之门 · 动漫 OST",
    cover: "/images/playlist-covers/pl-anime-ost.webp",
    alt: "次元之门动漫OST歌单封面",
    desc: "那些让你哭过笑过的名场面。BOSS 战、冒险岛、地表世界——推开次元之门，今天也是主角的一天。",
    tags: ["动漫OST", "日系"],
    mood: "温暖",
    scene: "日常",
    trackIds: [
      "t45", "t46", "t47", "t48", "t49", "t50", "t51", "t52",
    ],
    official: true,
    order: 6,
    meta: { plays: "21.5万", dms: "5210", time: "3周前" },
  },
];
