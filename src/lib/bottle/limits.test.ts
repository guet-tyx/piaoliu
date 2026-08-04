import { describe, expect, it } from "vitest";
import {
  BOTTLE_POOL_MAX,
  BOTTLE_TEXT_MAX,
  BOTTLE_TEXT_MIN,
  LAUNCH_LIMIT,
  PICK_LIMIT,
  REPLIES_MAX,
  REPORTS_MAX,
} from "./limits";

describe("纸船漂流业务常量（bottles.ts 与 BottleSection.tsx 共用）", () => {
  it("文案长度上下限", () => {
    expect(BOTTLE_TEXT_MIN).toBe(10);
    expect(BOTTLE_TEXT_MAX).toBe(200);
  });

  it("每日限额（投 1 / 拾 3）", () => {
    expect(LAUNCH_LIMIT).toBe(1);
    expect(PICK_LIMIT).toBe(3);
  });

  it("存储上限（防 localStorage 无限增长）", () => {
    expect(BOTTLE_POOL_MAX).toBe(300);
    expect(REPLIES_MAX).toBe(200);
    expect(REPORTS_MAX).toBe(200);
  });
});
