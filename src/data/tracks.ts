import type { Track } from "@/types/music";

/**
 * 星海电台曲目（迁移自 archive/anime-style.html TRACKS）
 * 本地音频优先，incompetech / SoundHelix 兜底；正式接入 Supabase 后改为从库中拉取
 */
export const TRACKS: Track[] = [
  {
    t: "「信风」",
    tag: "后摇",
    s: "星海电台 · 第 1/4 站",
    cover: "/images/cover-anime-1.png",
    src: [
      "/audio/zen.mp3",
      "https://incompetech.com/music/royalty-free/mp3-royaltyfree/That%20Zen%20Moment.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    ],
  },
  {
    t: "「晚风告别式」",
    tag: "城市民谣",
    s: "星海电台 · 第 2/4 站",
    cover: "/images/cover-anime-4.png",
    src: [
      "/audio/gymnopedie1.mp3",
      "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Gymnopedie%20No%201.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    ],
  },
  {
    t: "「凌晨三点半的港」",
    tag: "环境电子",
    s: "星海电台 · 第 3/4 站",
    cover: "/images/cover-anime-2.png",
    src: [
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    ],
  },
  {
    t: "「雨季漂流记」",
    tag: "独立流行",
    s: "星海电台 · 第 4/4 站",
    cover: "/images/cover-anime-3.png",
    src: [
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    ],
  },
];
