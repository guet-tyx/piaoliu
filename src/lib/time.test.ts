import { describe, expect, it } from "vitest";
import { localDate, timeAgo } from "./time";

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
