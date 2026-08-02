import type { Track } from "@/types/music";

/**
 * 星海电台曲目（与 archive/anime-style.html 原型 TRACKS 逐字对齐）
 * 本地音频优先，incompetech / SoundHelix 兜底；接入 Supabase 后改为从库中拉取
 */
export const TRACKS: Track[] = [
  {
    id: "t01",
    t: "信风",
    s: "一支你没听过的乐队 · 后摇",
    tag: "后摇",
    cover: "/images/cover-anime-1.png",
    src: [
      "/audio/zen.mp3",
      "https://incompetech.com/music/royalty-free/mp3-royaltyfree/That%20Zen%20Moment.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    ],
  },
  {
    id: "t02",
    t: "晚风告别式",
    s: "环境电子 · 深夜电台",
    tag: "环境电子",
    cover: "/images/cover-anime-4.png",
    src: [
      "/audio/gymnopedie1.mp3",
      "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Gymnopedie%20No%201.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    ],
  },
  {
    id: "t03",
    t: "凌晨三点半的港",
    s: "爵士嘻哈 · 失眠人士精选",
    tag: "爵士嘻哈",
    cover: "/images/cover-anime-2.png",
    src: [
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3",
    ],
  },
  {
    id: "t04",
    t: "雨季漂流记",
    s: "氛围 · 下雨天限定",
    tag: "氛围",
    cover: "/images/cover-anime-3.png",
    src: [
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3",
    ],
  },
];
