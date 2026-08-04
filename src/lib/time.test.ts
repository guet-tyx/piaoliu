import { describe, expect, it } from "vitest";
import { localDate } from "./time";

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
