/** Hero 弹幕歌词带（迁移自 archive/anime-style.html 首屏弹幕） */
export interface Danmaku {
  text: string;
  /** 垂直位置百分比 */
  top: string;
  /** 漂过时长 */
  dur: string;
  /** 负延迟（进入视口时已在中途） */
  delay: string;
  /** 变体：pink / blue / 默认白字 */
  variant?: "pink" | "blue";
}

export const HERO_DANMAKU: Danmaku[] = [
  { text: "耳机分你一半", top: "20%", dur: "12s", delay: "-3s" },
  { text: "下一首 · 未知", top: "31%", dur: "14s", delay: "-9s", variant: "pink" },
  { text: "这艘船 好安静", top: "42%", dur: "11s", delay: "-2s" },
  { text: "向着星海的方向", top: "52%", dur: "15s", delay: "-7s", variant: "blue" },
  { text: "漂过三千首 还是会被一首歌留下", top: "63%", dur: "13s", delay: "-5s" },
  { text: "晚安 地球人", top: "74%", dur: "16s", delay: "-11s" },
];
