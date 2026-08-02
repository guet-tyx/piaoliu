/**
 * 汐的每日一句白名单文案库（NFR-2：全部台词人工维护、评审后合入，禁止生成式发言）
 * 时段规则（PRD FR-8）：深夜 22:00-06:00 治愈系 / 清晨 06:00-12:00 元气系 / 其他日常系
 * id 用于 7 天不重复去重（V1.2 行为回应启用时一并生效）
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

/** 按本地小时判断时段：深夜 22-06 / 清晨 06-12 / 其他日常 */
export function shioSlotOf(hour: number): ShioSlot {
  if (hour >= 22 || hour < 6) return "night";
  if (hour < 12) return "morning";
  return "day";
}
