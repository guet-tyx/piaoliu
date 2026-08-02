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
  /** 唯一 id（头像切换状态用） */
  id: string;
  name: string;
  en: string;
  lv: string;
  image: string;
  imageAlt: string;
  expressions?: CharacterExpression[];
  tags: CharacterTag[];
  desc: CharacterDescSegment[];
  stats: CharacterStat[];
}

/** 角色情绪表情变体 */
export interface CharacterExpression {
  label: string; // 表情描述
  image: string; // 表情图路径
}

/**
 * 星海守望者（2026-08-02 多角色版，仿崩坏3官网角色切换）：
 * 汐（电台女主）+ 流明 / 朔空 / 悠（同画师立绘，public/images/）
 */
export const CHARACTERS: Character[] = [
  {
    id: "sio",
    name: "汐",
    en: "SIO",
    lv: "★ 星海版限定",
    image: "/images/character-main.webp",
    imageAlt: "星海漂流少女「汐」：深紫短发，戴白色头戴式耳机，白上衣蓝裙，自带极光",
    expressions: [
      { label: "微笑", image: "/images/char-expr-smile.webp" },
      { label: "聆听", image: "/images/char-expr-listen.webp" },
      { label: "感受", image: "/images/char-expr-feel.webp" },
    ],
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
  },
  {
    id: "lumen",
    name: "流明",
    en: "LUMEN",
    lv: "★ 灯塔守望者",
    image: "/images/lumen-main.webp",
    imageAlt: "灯塔守望者「流明」：银白长发蓝瞳，深蓝星空长裙，背景灯塔与星光",
    expressions: [
      { label: "凝视", image: "/images/lumen-expr-gaze.webp" },
      { label: "微光", image: "/images/lumen-expr-light.webp" },
      { label: "微笑", image: "/images/lumen-expr-smile.webp" },
    ],
    tags: [
      { label: "# 灯塔守望者", variant: "blue" },
      { label: "# 星图编译者", variant: "hot" },
      { label: "# 属性 · 光" },
      { label: "# 登场 · 星海版" },
    ],
    desc: [
      { text: "守着一座建在星海中央的灯塔，用光的单位命名自己。她能把一整片星图译成旋律，" },
      { text: "「每一颗星，都有一段能听的故事」", bold: true },
      { text: "。银发垂到裙摆，灯塔的光每年只亮一夜——那一夜，整个星海都会安静下来。" },
    ],
    stats: [
      { value: "96.7", suffix: "万", label: "次收听" },
      { value: "21.4", suffix: "万", label: "次收藏" },
      { value: "6203", suffix: "+", label: "条弹幕" },
    ],
  },
  {
    id: "soku",
    name: "朔空",
    en: "SOKU",
    lv: "★ 夜航 DJ",
    image: "/images/soku-main.webp",
    imageAlt: "夜航 DJ「朔空」：金色短发蓝瞳，白色连帽衫牛仔裤，背景彩色光带",
    expressions: [
      { label: "打碟", image: "/images/soku-expr-dj.webp" },
      { label: "沉浸", image: "/images/soku-expr-feel.webp" },
      { label: "安利", image: "/images/soku-expr-recommend.webp" },
    ],
    tags: [
      { label: "# 夜航 DJ", variant: "hot" },
      { label: "# 电台常客", variant: "blue" },
      { label: "# 属性 · 电" },
      { label: "# 登场 · 星海版" },
    ],
    desc: [
      { text: "凌晨三点准时上线的夜航 DJ，自称「星海第一打碟手」。他的歌单永远混着风浪声与心跳声，" },
      { text: "「耳机戴好，这波节奏我带你飞」", bold: true },
      { text: "。金发是被海风吹乱的，连帽衫口袋里塞满了写给失眠者的歌单。" },
    ],
    stats: [
      { value: "88.2", suffix: "万", label: "次收听" },
      { value: "19.8", suffix: "万", label: "次收藏" },
      { value: "5147", suffix: "+", label: "条弹幕" },
    ],
  },
  {
    id: "yoe",
    name: "悠",
    en: "YOE",
    lv: "★ 星图占卜师",
    image: "/images/yoe-main.webp",
    imageAlt: "星图占卜师「悠」：黑色长发紫瞳，紫色长袍内搭黑裙，背景星座图案",
    expressions: [
      { label: "描绘", image: "/images/yoe-expr-draw.webp" },
      { label: "凝视", image: "/images/yoe-expr-gaze.webp" },
      { label: "指引", image: "/images/yoe-expr-guide.webp" },
    ],
    tags: [
      { label: "# 星图占卜师", variant: "hot" },
      { label: "# 失眠者之友", variant: "blue" },
      { label: "# 属性 · 幻" },
      { label: "# 登场 · 星海版" },
    ],
    desc: [
      { text: "在星海的暗面摆摊的占卜师，用星座连线解读你的歌单。她说失眠不是病，" },
      { text: "「是星星在等你听一首对的歌」", bold: true },
      { text: "。黑袍下藏着七十九张星图，每一张都对应一个睡不着的夜晚。" },
    ],
    stats: [
      { value: "75.9", suffix: "万", label: "次收听" },
      { value: "17.2", suffix: "万", label: "次收藏" },
      { value: "4892", suffix: "+", label: "条弹幕" },
    ],
  },
];
