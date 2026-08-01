/** 角色标签（variant 控制胶囊配色：hot 粉 / blue 蓝 / 默认灰） */
export interface CharacterTag {
  label: string;
  variant?: "hot" | "blue";
}

/** 角色描述段落（bold 段加粗渲染，避免数据里混入 HTML） */
export interface CharacterDescSegment {
  text: string;
  bold?: boolean;
}

/**
 * 统计数据（迁移自原型 .cstat）
 * value/suffix 同时写入 data-count/data-suffix 属性，
 * 作为后续数字滚动组件的挂载钩子；当前静态渲染最终值
 */
export interface CharacterStat {
  value: string;
  suffix: string;
  label: string;
}

export interface Character {
  name: string;
  en: string;
  lv: string;
  image: string;
  imageAlt: string;
  tags: CharacterTag[];
  desc: CharacterDescSegment[];
  stats: CharacterStat[];
}

export const CHARACTER: Character = {
  name: "汐",
  en: "SIO",
  lv: "★ 星海版限定",
  image: "/images/anime-hero.png",
  imageAlt: "漂流少女「汐」：戴耳机坐在纸船上，漂在星海之间",
  tags: [
    { label: "# 星海导游", variant: "hot" },
    { label: "# 纸船船长", variant: "blue" },
    { label: "# 属性 · 风" },
    { label: "# 登场 · 星海版" },
  ],
  desc: [
    { text: "戴耳机的漂流少女，每晚乘纸船漂过一片星海。她说导航没有用，" },
    { text: "「不知道下一首是什么」才是最好的方向", bold: true },
    { text: "。身高 152cm（含耳机），声线未知，出场自带极光。" },
  ],
  stats: [
    { value: "128.4", suffix: "万", label: "次播放" },
    { value: "32.6", suffix: "万", label: "次收藏" },
    { value: "9999", suffix: "+", label: "条弹幕" },
  ],
};
