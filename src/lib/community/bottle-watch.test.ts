import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as watchMod from "@/lib/community/bottleWatch";
import type { Bottle } from "@/types/social";

/**
 * P3 A-04 「让角色看你的船」（本地分支）：
 * 话题/曲风 → 角色自动匹配 / 3 天时效 / 同瓶最多提及 1 次。
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

// bottleWatch → readPool（bottles 模块）链路所需的 supabase 模块桩
vi.mock("@/lib/supabase/anon", () => ({ isSupabaseReady: vi.fn(() => false) }));
vi.mock("@/lib/supabase/client", () => ({ getSupabase: vi.fn(() => null) }));

let api: typeof watchMod;

const makeUserBottle = (over: Partial<Bottle> = {}): Bottle => ({
  id: "u-1",
  authorId: "local-guest",
  text: "凌晨三点，耳机里放着一首很旧的后摇，忽然觉得星海很温柔。",
  track: { t: "信风", tag: "后摇", s: "x", cover: "c" },
  bottleStyle: "paper",
  anonMark: "晚风船客·A7F3",
  status: "drifting",
  pickedBy: null,
  isSystem: false,
  createdAt: Date.now(),
  repliedAt: null,
  readAt: null,
  isPublic: true,
  likedBy: [],
  ...over,
});

beforeEach(async () => {
  mem.clear();
  vi.resetModules();
  vi.stubGlobal("localStorage", localStorageMock);
  api = await import("@/lib/community/bottleWatch");
});

describe("角色自动匹配（A-04 watchRoleFor）", () => {
  it("话题优先：#失眠夜 → 汐、#自习歌单 → 流明、#后摇推荐 → 朔空、#今日心情 → 悠", () => {
    expect(api.watchRoleFor({ topic: "insomnia", track: { t: "x", tag: "x", s: "x", cover: "x" } })).toBe("sio");
    expect(api.watchRoleFor({ topic: "study", track: { t: "x", tag: "x", s: "x", cover: "x" } })).toBe("lumen");
    expect(api.watchRoleFor({ topic: "postrock", track: { t: "x", tag: "x", s: "x", cover: "x" } })).toBe("soku");
    expect(api.watchRoleFor({ topic: "mood", track: { t: "x", tag: "x", s: "x", cover: "x" } })).toBe("yoe");
  });

  it("无话题时按歌曲曲风匹配：#日系 → 朔空；无匹配兜底汐", () => {
    expect(api.watchRoleFor({ topic: undefined, track: { t: "x", tag: "日系", s: "x", cover: "x" } })).toBe("soku");
    expect(api.watchRoleFor({ topic: undefined, track: { t: "x", tag: "爵士嘻哈", s: "x", cover: "x" } })).toBe("sio");
  });

  it("表单预览：话题 + 曲风合并匹配，无匹配返回 null", () => {
    expect(api.watchRolePreview("insomnia", "日系")).toBe("sio"); // 话题优先
    expect(api.watchRolePreview(null, "钢琴")).toBe("lumen"); // lumen 主持钢琴风格
    expect(api.watchRolePreview(null, "爵士嘻哈")).toBeNull(); // 无匹配
  });
});

describe("角色提起被关注瓶子（A-04 pickBottleToMention）", () => {
  it("用户 3 天内投的被关注瓶会被选中并携带摘录与白名单评价", () => {
    mem.set("drift-bottles-pool", JSON.stringify([makeUserBottle({ id: "u-1", watchedBy: "sio" })]));
    const hit = api.pickBottleToMention("sio");
    expect(hit).not.toBeNull();
    expect(hit!.bottleId).toBe("u-1");
    expect(hit!.excerpt.length).toBeLessThanOrEqual(40);
    expect(hit!.comment.length).toBeGreaterThan(0);
  });

  it("同瓶最多提及 1 次：第二次返回 null", () => {
    mem.set("drift-bottles-pool", JSON.stringify([makeUserBottle({ id: "u-1", watchedBy: "sio" })]));
    const first = api.pickBottleToMention("sio");
    const second = api.pickBottleToMention("sio");
    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it("超过 3 天不再提起；角色不匹配不提起", () => {
    mem.set(
      "drift-bottles-pool",
      JSON.stringify([
        makeUserBottle({ id: "u-old", watchedBy: "sio", createdAt: Date.now() - 4 * 86_400_000 }),
        makeUserBottle({ id: "u-wrong", watchedBy: "soku" }),
      ]),
    );
    expect(api.pickBottleToMention("sio")).toBeNull(); // 只剩超期瓶
    expect(api.pickBottleToMention("soku")!.bottleId).toBe("u-wrong"); // 朔空关注的可提
  });

  it("他人/系统瓶不会被提及", () => {
    mem.set(
      "drift-bottles-pool",
      JSON.stringify([makeUserBottle({ id: "u-sys", authorId: "system", watchedBy: "sio" })]),
    );
    expect(api.pickBottleToMention("sio")).toBeNull();
  });
});