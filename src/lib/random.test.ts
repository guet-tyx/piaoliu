import { afterEach, describe, expect, it, vi } from "vitest";
import { pickRandom } from "./random";

afterEach(() => vi.restoreAllMocks());

describe("pickRandom", () => {
  it("空数组返回 null", () => {
    expect(pickRandom([])).toBeNull();
  });

  it("无排除时均匀随机（Math.random=0 取首项）", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(pickRandom(["a", "b", "c"])).toBe("a");
  });

  it("keyOf + exclude 避开最近用过的 key", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const items = [
      { key: "k1", v: 1 },
      { key: "k2", v: 2 },
      { key: "k3", v: 3 },
    ];
    // exclude k1/k2 → 只剩 k3，即使 random=0.99 也取 k3
    const picked = pickRandom(items, { keyOf: (x) => x.key, exclude: ["k1", "k2"] });
    expect(picked).toEqual({ key: "k3", v: 3 });
  });

  it("全部被排除时退回全量（允许重复）", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const items = ["a", "b"];
    const picked = pickRandom(items, { keyOf: (x) => x, exclude: ["a", "b"] });
    expect(items).toContain(picked); // 仍能取到（首项）
  });

  it("未提供 keyOf 时忽略 exclude", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(pickRandom(["a", "b"], { exclude: ["a"] })).toBe("a");
  });
});
