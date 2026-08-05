import { describe, expect, it } from "vitest";
import { dayStart, isYesterday, localDate, timeAgo, weekStart } from "./time";

describe("localDate", () => {
  it("输出 YYYY-MM-DD 并补零", () => {
    expect(localDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(localDate(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("默认取当前时间（与 new Date 同日）", () => {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    expect(localDate()).toBe(`${now.getFullYear()}-${m}-${d}`);
  });
});

/** 相对时间（P0 F-01 漂流广场）边界 */
describe("timeAgo", () => {
  const now = 1_800_000_000_000;

  it("1 分钟内 → 刚刚", () => {
    expect(timeAgo(now, now)).toBe("刚刚");
    expect(timeAgo(now - 30_000, now)).toBe("刚刚");
  });

  it("分钟级", () => {
    expect(timeAgo(now - 5 * 60_000, now)).toBe("5 分钟前");
    expect(timeAgo(now - 59 * 60_000, now)).toBe("59 分钟前");
  });

  it("小时级", () => {
    expect(timeAgo(now - 2 * 3_600_000, now)).toBe("2 小时前");
    expect(timeAgo(now - 23 * 3_600_000, now)).toBe("23 小时前");
  });

  it("天级", () => {
    expect(timeAgo(now - 3 * 86_400_000, now)).toBe("3 天前");
    expect(timeAgo(now - 29 * 86_400_000, now)).toBe("29 天前");
  });

  it("30 天封顶", () => {
    expect(timeAgo(now - 40 * 86_400_000, now)).toBe("30 天前");
  });

  it("未来时间戳不产生负数", () => {
    expect(timeAgo(now + 60_000, now)).toBe("刚刚");
  });
});

/** P1 周/日窗口工具 */
describe("dayStart / weekStart / isYesterday", () => {
  it("dayStart 归零到当天 00:00", () => {
    const d = new Date(2026, 7, 5, 14, 30, 15); // 2026-08-05 14:30
    const start = dayStart(d);
    expect(new Date(start).getHours()).toBe(0);
    expect(new Date(start).getMinutes()).toBe(0);
    expect(dateStr(start)).toBe("2026-08-05");
  });

  it("weekStart 回到本周一 00:00", () => {
    const friday = new Date(2026, 7, 7, 9, 0, 0); // 周五
    const monday = new Date(weekStart(friday));
    expect(monday.getDay()).toBe(1); // 周一
    expect(monday.getHours()).toBe(0);
    expect(monday.getDate()).toBe(3); // 2026-08-03 是周一
  });

  it("weekStart 在周日也回退到本周一", () => {
    const sunday = new Date(2026, 7, 9, 20, 0, 0); // 周日
    expect(new Date(weekStart(sunday)).getDate()).toBe(3);
  });

  it("isYesterday 判定日期是否为昨天", () => {
    const now = new Date(2026, 7, 5, 12, 0, 0);
    const yesterday = new Date(2026, 7, 4, 18, 0, 0);
    const dayBefore = new Date(2026, 7, 3, 12, 0, 0);
    expect(isYesterday(yesterday, now)).toBe(true);
    expect(isYesterday(dayBefore, now)).toBe(false);
    expect(isYesterday(now, now)).toBe(false);
  });
});

function dateStr(ts: number): string {
  return localDate(new Date(ts));
}
