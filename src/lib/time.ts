/**
 * 时间工具（V2.7 收敛）：localDate 收敛 bottles/sailor/shio 三处重复实现。
 * 注意：时段「分类」边界（greetings 0-6/6-9/9-18/18-20、life-status 0-6/22-24、
 * shio 22-6/6-12/12-22）是产品语义不同的三套规则，刻意不合并，只共享机制级工具。
 */

/** 本地日期（YYYY-MM-DD，按客户端时区；真实模式以服务端 Asia/Shanghai 为准） */
export function localDate(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
