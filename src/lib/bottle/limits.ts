/**
 * 纸船漂流业务常量（V2.7 收敛）：lib/api/bottles.ts 与 BottleSection.tsx 共用，
 * 避免同一魔数散落两处造成漂移。
 */

/** 瓶身文案长度下限（字） */
export const BOTTLE_TEXT_MIN = 10;
/** 瓶身文案长度上限（字） */
export const BOTTLE_TEXT_MAX = 200;
/** 投瓶上限（每日 1 个） */
export const LAUNCH_LIMIT = 1;
/** 本地拾瓶上限（每日 3 个） */
export const PICK_LIMIT = 3;
/** 漂流瓶池存储上限（本地模拟；保留最近 N 艘，防 localStorage 无限增长） */
export const BOTTLE_POOL_MAX = 300;
/** 回信存储上限 */
export const REPLIES_MAX = 200;
/** 举报记录存储上限 */
export const REPORTS_MAX = 200;
