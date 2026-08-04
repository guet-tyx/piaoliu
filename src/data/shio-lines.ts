/**
 * 角色每日一句白名单文案库（NFR-2：全部台词人工维护、评审后合入，禁止生成式发言）
 * 时段规则（PRD FR-8）：深夜 22:00-06:00 治愈系 / 清晨 06:00-12:00 元气系 / 其他日常系
 * id 用于 7 天不重复去重（V1.2 行为回应启用时一并生效）
 * V2.2：从汐专属扩展为 4 位星海守望者各一套（CHARACTER_LINES），汐复用原 SHIO_LINES 内容
 */

export type ShioSlot = "night" | "morning" | "day";

export interface ShioLine {
  /** 稳定 id（去重/追踪用） */
  id: string;
  text: string;
}

export const SHIO_LINES: Record<ShioSlot, ShioLine[]> = {
  night: [
    { id: "n01", text: "这么晚还漂着吗？星海很安静，正好只装得下你一个人。" },
    { id: "n02", text: "耳机里的歌别停，停了我怕你听见自己的心事。" },
    { id: "n03", text: "失眠不是坏事，是星海在挽留你多待一会儿。" },
    { id: "n04", text: "今天辛苦了。下一站没有名字，但一定比白天温柔。" },
    { id: "n05", text: "船会靠岸，夜也会。在那之前，先让这首歌陪你。" },
    { id: "n06", text: "你睡不着的时候，汐也醒着。整片星海都在陪你。" },
  ],
  morning: [
    { id: "m01", text: "早安。今天的风是顺风，适合把昨晚的心事都放下。" },
    { id: "m02", text: "太阳升起来了，纸船也晒干了。新的一天，漂向新的歌。" },
    { id: "m03", text: "元气满满地启航吧——汐已经帮你把航线擦亮了。" },
    { id: "m04", text: "早上的第一首歌，决定今天的心情。挑首好听的。" },
    { id: "m05", text: "昨晚的星星都睡下了，轮到你醒着发光了。" },
  ],
  day: [
    { id: "d01", text: "漂累了就停一会儿。星海不会催你，汐也不会。" },
    { id: "d02", text: "今天的歌单里，总会有一首写着你的名字。" },
    { id: "d03", text: "耳机分你一半——这是船上最古老的礼仪。" },
    { id: "d04", text: "航向未知才是最好的方向，你永远不知道下一首有多好。" },
    { id: "d05", text: "汐在电台里值班。点一首歌，就是和星海打个招呼。" },
  ],
};

/** 4 位星海守望者的每日一句（V2.2）：汐复用 SHIO_LINES，流明/朔空/悠为各自专属文案 */
export type CharacterLines = Record<string, Record<ShioSlot, ShioLine[]>>;

export const CHARACTER_LINES: CharacterLines = {
  /* 汐：沿用原 SHIO_LINES（对象引用，无复制） */
  sio: SHIO_LINES,

  /* 流明（灯塔守望者 · 光）：光/灯塔/星图/旋律 */
  lumen: {
    night: [
      { id: "lumen-n1", text: "灯还亮着。星海的黑，总需要有人守着一点光。" },
      { id: "lumen-n2", text: "灯塔一夜不熄，是为了让还没靠岸的船知道——方向还在。" },
      { id: "lumen-n3", text: "深夜的旋律像海雾，我的光帮你照出航道。" },
      { id: "lumen-n4", text: "睡不着也没关系，星光会替你记下这段夜。" },
    ],
    morning: [
      { id: "lumen-m1", text: "天亮前最后一巡：灯塔收光，星图归位。" },
      { id: "lumen-m2", text: "清晨的光是新的坐标，今天也沿着它航行吧。" },
      { id: "lumen-m3", text: "早安，星海的影子被晨光拉长了，航线清晰得很。" },
      { id: "lumen-m4", text: "新的一天，从亮一盏灯开始。" },
    ],
    day: [
      { id: "lumen-d1", text: "每一颗星都有一段能听的故事，今天你听到哪一段了？" },
      { id: "lumen-d2", text: "我把今天的星图译成了旋律，就差你来听了。" },
      { id: "lumen-d3", text: "灯塔不追船，只负责在你看得见的地方亮着。" },
      { id: "lumen-d4", text: "迷路的时候抬头看光，光一直在。" },
    ],
  },

  /* 朔空（夜航 DJ · 电）：节奏/打碟/歌单/凌晨 */
  soku: {
    night: [
      { id: "soku-n1", text: "凌晨三点的电台，永远为睡不着的人留着位子。" },
      { id: "soku-n2", text: "风浪声和心跳声，就是我这首歌的底鼓。" },
      { id: "soku-n3", text: "耳机戴好，这波节奏我带你飞——今晚的航道不会让你失望。" },
      { id: "soku-n4", text: "夜再深，节奏一响，船就开始晃了。" },
    ],
    morning: [
      { id: "soku-m1", text: "太阳升起前最后一首慢歌，送给刚醒的你。" },
      { id: "soku-m2", text: "早安，昨晚的舞池散场了，今天的歌单我给你重新排了序。" },
      { id: "soku-m3", text: "清晨的第一拍，决定今天走路的节奏。" },
      { id: "soku-m4", text: "把晨光当成一束聚光灯，新的一天该你出场了。" },
    ],
    day: [
      { id: "soku-d1", text: "我的歌单永远混着风浪声，因为好歌都漂在风里。" },
      { id: "soku-d2", text: "今天的 BPM 由你的心情决定，点一首就开播。" },
      { id: "soku-d3", text: "打碟不靠手快，靠的是听懂你这一刻想听什么。" },
      { id: "soku-d4", text: "别急着切歌，副歌总是在下一小节等你。" },
    ],
  },

  /* 悠（星图占卜师 · 幻）：星座/占卜/失眠/星图 */
  yoe: {
    night: [
      { id: "yoe-n1", text: "失眠不是病，是星星在等你听一首对的歌。" },
      { id: "yoe-n2", text: "今晚的星座连线指向一首老歌，去找到它吧。" },
      { id: "yoe-n3", text: "星图的暗面藏着答案，而我替你看过了——答案是一首慢歌。" },
      { id: "yoe-n4", text: "深夜占卜不收费，只收一个睡不着的夜晚。" },
    ],
    morning: [
      { id: "yoe-m1", text: "早安。晨星隐去之前，我替你占了一卦：宜启航。" },
      { id: "yoe-m2", text: "昨晚的星座都退场了，今天由太阳来读你的星图。" },
      { id: "yoe-m3", text: "清晨的第一缕光，是最好的指引牌。" },
      { id: "yoe-m4", text: "新的一天，星图已经帮你翻开了新的一页。" },
    ],
    day: [
      { id: "yoe-d1", text: "七十九张星图，每一张都对应一个睡不着的夜晚——今天你抽到哪张？" },
      { id: "yoe-d2", text: "你的歌单正在被星座悄悄连线，我可以帮你解读。" },
      { id: "yoe-d3", text: "占卜的结果从来不是定数，而是「去听一首对的歌」。" },
      { id: "yoe-d4", text: "迷路的时候抬头看星，听歌的时候闭眼感受。" },
    ],
  },
};

/** 按本地小时判断时段：深夜 22-06 / 清晨 06-12 / 其他日常 */
export function shioSlotOf(hour: number): ShioSlot {
  if (hour >= 22 || hour < 6) return "night";
  if (hour < 12) return "morning";
  return "day";
}

/**
 * 汐的行为回应（FR-8.2，V1.2 启用）：4 类触发，每条 7 天内不重复
 * 触发点：连续听歌 3 首 / 收到回信 / 首次投瓶 / 拾瓶
 * V2.0 增羁绊里程碑回应（bond-10/20/30：羁绊值跨过阈值时触发）
 */
export type ShioResponseKind =
  | "listen3"
  | "reply-received"
  | "first-launch"
  | "pick"
  | "bond-10"
  | "bond-20"
  | "bond-30";

export const SHIO_RESPONSES: Record<ShioResponseKind, ShioLine[]> = {
  listen3: [
    { id: "r-l1", text: "三首歌连成一条航线了。你今晚想漂远一点吗？" },
    { id: "r-l2", text: "听歌的样子很专注，像在给星海写信。" },
    { id: "r-l3", text: "第三首了。汐帮你看过航线——前方还有好听的。" },
  ],
  "reply-received": [
    { id: "r-r1", text: "有船靠岸了。你的心事，被某人接住了。" },
    { id: "r-r2", text: "回信顺着航线漂回来了。星海没有辜负你。" },
    { id: "r-r3", text: "有人读懂了你的瓶子。这大概就是漂流的意义。" },
  ],
  "first-launch": [
    { id: "r-f1", text: "第一艘船，祝你顺风。" },
    { id: "r-f2", text: "纸船入海了。从此星海里有一艘，写着你的心情。" },
    { id: "r-f3", text: "第一次启航总是最难忘的。汐会记得这一天。" },
  ],
  pick: [
    { id: "r-p1", text: "拾到一艘别人的心事。温柔地打开它吧。" },
    { id: "r-p2", text: "星海把一艘船推到了你面前。缘分有时候就是这么漂来的。" },
    { id: "r-p3", text: "打开瓶子的时候，别忘了它曾经漂过很长的夜。" },
  ],
  "bond-10": [
    { id: "r-b1", text: "羁绊值到 10 了。星海记得你每一个航行的夜晚。" },
    { id: "r-b2", text: "十点羁绊——汐已经把你当成老船客了。" },
  ],
  "bond-20": [
    { id: "r-b3", text: "二十点羁绊。这条航线，汐陪你走了很久。" },
    { id: "r-b4", text: "羁绊渐深。你听过的每一首歌，星海都替你记得。" },
  ],
  "bond-30": [
    { id: "r-b5", text: "三十点羁绊。灯塔守望者的路上，汐一直在。" },
    { id: "r-b6", text: "三十个夜晚的陪伴。有些船，漂着漂着就成了归处。" },
  ],
};
