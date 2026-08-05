import { beforeEach, describe, expect, it, vi } from "vitest";
import { bottleDisplayName, markDisplayName } from "@/lib/social-name";
import type { Bottle, Sailor } from "@/types/social";

/**
 * 展示名规则（账号系统默认展示昵称，匿名为可选项）：
 * 冻结昵称 → 当前船客同代号昵称（旧瓶自动跟随）→ 匿名代号。
 */

const mem = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  get length() {
    return mem.size;
  },
};

const MINE = "星尘船客·0E2FE10C";
const OTHER = "纸鹤水手·ZZZ9";

const makeBottle = (over: Partial<Bottle> = {}): Bottle => ({
  id: "b-1",
  authorId: "local-guest",
  text: "今晚的风很适合漂流。",
  track: { t: "信风", tag: "后摇", s: "x", cover: "c" },
  bottleStyle: "paper",
  anonMark: MINE,
  status: "drifting",
  pickedBy: null,
  isSystem: false,
  createdAt: Date.now(),
  repliedAt: null,
  readAt: null,
  isPublic: true,
  likedBy: [],
  nickname: null,
  ...over,
});

const makeSailor = (over: Partial<Sailor> = {}): Sailor => ({
  id: "local-guest",
  anonMark: MINE,
  bottleStyle: "paper",
  nickname: "晚风",
  bondValue: 0,
  level: 1,
  badges: [],
  createdAt: Date.now(),
  ...over,
});

beforeEach(() => {
  mem.clear();
  vi.stubGlobal("localStorage", localStorageMock);
});

describe("bottleDisplayName（瓶子展示名：默认昵称）", () => {
  it("冻结昵称优先于当前昵称", () => {
    mem.set("drift-sailor", JSON.stringify(makeSailor({ nickname: "当前名" })));
    expect(bottleDisplayName(makeBottle({ nickname: "冻结名" }))).toBe("冻结名");
  });

  it("旧瓶（冻结缺失）：当前船客同代号时跟随当前昵称", () => {
    mem.set("drift-sailor", JSON.stringify(makeSailor({ nickname: "晚风" })));
    expect(bottleDisplayName(makeBottle({ nickname: null }))).toBe("晚风");
  });

  it("他人代号（非当前船客）不跟随，显示代号", () => {
    mem.set("drift-sailor", JSON.stringify(makeSailor()));
    expect(bottleDisplayName(makeBottle({ anonMark: OTHER, nickname: null }))).toBe(OTHER);
  });

  it("当前船客未设昵称时显示代号", () => {
    mem.set("drift-sailor", JSON.stringify(makeSailor({ nickname: null })));
    expect(bottleDisplayName(makeBottle())).toBe(MINE);
  });

  it("无船员证记录时显示代号", () => {
    expect(bottleDisplayName(makeBottle())).toBe(MINE);
  });
});

describe("markDisplayName（代号展示面：排行榜/评论/回信）", () => {
  it("自己的代号 → 昵称", () => {
    mem.set("drift-sailor", JSON.stringify(makeSailor()));
    expect(markDisplayName(MINE)).toBe("晚风");
  });

  it("他人代号 → 保持代号", () => {
    mem.set("drift-sailor", JSON.stringify(makeSailor()));
    expect(markDisplayName(OTHER)).toBe(OTHER);
  });

  it("未设昵称 → 保持代号", () => {
    mem.set("drift-sailor", JSON.stringify(makeSailor({ nickname: null })));
    expect(markDisplayName(MINE)).toBe(MINE);
  });
});