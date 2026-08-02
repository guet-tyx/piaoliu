/**
 * 节日活动配置（FR-14）：日期区间自动生效/下线（客户端按本地日期判断；
 * 真实模式由服务端判断，SQL 004 注释预留）
 * 活动期间的瓶子使用限定瓶面样式（bottleStyle = event.bottleStyle），
 * 语汇与汐台词随活动切换（NFR-2 白名单制）
 */

export interface DriftEvent {
  id: string;
  /** 活动名称（语汇） */
  name: string;
  /** 限定瓶面样式 id（写入 bottles.bottle_style） */
  bottleStyle: string;
  /** 起止（月-日，支持跨年：start > end 视为跨年区间） */
  start: { month: number; day: number };
  end: { month: number; day: number };
  /** 活动语汇（投瓶区提示） */
  tagline: string;
  /** 活动期汐的台词 */
  shioLine: string;
}

const EVENTS: DriftEvent[] = [
  {
    id: "summer-fest",
    name: "夏日漂流祭",
    bottleStyle: "festival-summer",
    start: { month: 8, day: 1 },
    end: { month: 8, day: 31 },
    tagline: "夏日漂流祭 · 限定瓶面：把夏天的浪花装进纸船",
    shioLine: "夏日限定。今天的纸船，会载着一整个夏天的风。",
  },
  {
    id: "newyear-wish",
    name: "新年许愿瓶",
    bottleStyle: "festival-newyear",
    start: { month: 1, day: 1 },
    end: { month: 1, day: 10 },
    tagline: "新年许愿瓶 · 限定瓶面：把新年愿望写进纸船",
    shioLine: "新年第一艘船。许个愿吧，星海会替你记住。",
  },
];

/** 日期是否落在活动区间（支持跨年：start > end） */
function inRange(month: number, day: number, ev: DriftEvent): boolean {
  const s = ev.start.month * 100 + ev.start.day;
  const e = ev.end.month * 100 + ev.end.day;
  const d = month * 100 + day;
  return s <= e ? d >= s && d <= e : d >= s || d <= e;
}

/** 当前生效的活动（无则 null）；date 参数便于测试 */
export function getActiveEvent(date = new Date()): DriftEvent | null {
  return (
    EVENTS.find((ev) => inRange(date.getMonth() + 1, date.getDate(), ev)) ?? null
  );
}

/**
 * 测试开关：URL 参数 ?event=<id> 强制指定活动（开发演示用）；
 * 也支持 "none" 强制无活动
 */
export function getEventForTest(param: string | null): DriftEvent | null {
  if (!param || param === "none") return null;
  return EVENTS.find((ev) => ev.id === param) ?? null;
}

/** 按瓶面样式查所属活动（拾瓶展示活动徽标用） */
export function eventOfStyle(bottleStyle: string): DriftEvent | null {
  return EVENTS.find((ev) => ev.bottleStyle === bottleStyle) ?? null;
}
