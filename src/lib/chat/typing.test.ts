import { describe, expect, it } from "vitest";
import {
  hasActionPrefix,
  thinkDelayFor,
  ACTION_DELAY_EXTRA_MS,
  THINK_DELAY_BASE,
  THINK_DELAY_JITTER,
} from "@/lib/chat/typing";

/** 人机感 P2-⑦ 思考痕迹：动作描写开场 → 更长的「思考延迟」 */

describe("hasActionPrefix 动作描写识别", () => {
  it("角色名 + 动作 + 逗号 → 判定为动作开场", () => {
    expect(hasActionPrefix("汐歪了歪头，想了想")).toBe(true);
    expect(hasActionPrefix("她轻轻哼了一声，说道")).toBe(true);
    expect(hasActionPrefix("悠捻了捻指间的星星，垂下眼")).toBe(true);
  });

  it("普通回复不误判", () => {
    expect(hasActionPrefix("今天过得怎么样？")).toBe(false);
    expect(hasActionPrefix("推荐一首歌给你")).toBe(false);
  });

  it("动作后没有逗号（一句到底）不算动作开场", () => {
    expect(hasActionPrefix("汐歪了歪头")).toBe(false);
  });
});

describe("thinkDelayFor 思考延迟", () => {
  it("普通回复在基准区间内（无动作额外延迟）", () => {
    const d = thinkDelayFor("今天过得怎么样？");
    expect(d).toBeGreaterThanOrEqual(THINK_DELAY_BASE);
    expect(d).toBeLessThan(THINK_DELAY_BASE + THINK_DELAY_JITTER);
  });

  it("动作描写开场在基准区间上追加额外延迟", () => {
    const d = thinkDelayFor("汐歪了歪头，想了想");
    expect(d).toBeGreaterThanOrEqual(THINK_DELAY_BASE + ACTION_DELAY_EXTRA_MS);
    expect(d).toBeLessThan(THINK_DELAY_BASE + THINK_DELAY_JITTER + ACTION_DELAY_EXTRA_MS);
  });
});
