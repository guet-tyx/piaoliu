import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as commentsMod from "@/lib/api/comments";
import type * as sailorApiMod from "@/lib/api/sailor";
import type * as anonApiMod from "@/lib/supabase/anon";

/**
 * 歌曲留言墙（P1 F-02）本地分支：
 * 字数校验 / 同曲 5 分钟限频 / 列表倒序 / 点赞按 anonMark 去重。
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

vi.mock("@/lib/api/sailor", () => ({ getOrCreateSailor: vi.fn() }));
vi.mock("@/lib/supabase/anon", () => ({ isSupabaseReady: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ getSupabase: vi.fn(() => null) }));

let api: typeof commentsMod;
let sailorApi: typeof sailorApiMod;
let anonApi: typeof anonApiMod;

beforeEach(async () => {
  mem.clear();
  vi.resetModules();
  vi.stubGlobal("localStorage", localStorageMock);
  api = await import("@/lib/api/comments");
  sailorApi = await import("@/lib/api/sailor");
  anonApi = await import("@/lib/supabase/anon");
  vi.mocked(anonApi.isSupabaseReady).mockReturnValue(false);
  vi.mocked(sailorApi.getOrCreateSailor).mockResolvedValue({
    id: "g1",
    anonMark: "晚风船客·A7F3",
    bottleStyle: "paper",
    nickname: null,
    bondValue: 0,
    level: 1,
    badges: [],
    createdAt: 1,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("postComment（F-02）", () => {
  it("10-100 字成功发布并写入本地", async () => {
    const r = await api.postComment("t1", "这首歌陪我走过了一段很难的路。");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.comment.anonMark).toBe("晚风船客·A7F3");
    expect(r.comment.trackId).toBe("t1");
    expect((await api.fetchComments("t1")).length).toBe(1);
  });

  it("不足 10 字拒绝（too-short）", async () => {
    const r = await api.postComment("t1", "太短");
    expect(r).toEqual({ ok: false, reason: "too-short" });
  });

  it("同曲 5 分钟内重复发布 → cooldown", async () => {
    const r1 = await api.postComment("t1", "这是一段足够长的感想内容，字数达标。");
    expect(r1.ok).toBe(true);
    const r2 = await api.postComment("t1", "这是另一段足够长的感想内容，试着再发。");
    expect(r2).toEqual({ ok: false, reason: "cooldown" });
    // 不同曲目不受限频影响
    const r3 = await api.postComment("t2", "这是第三段足够长的感想内容，不同曲目。");
    expect(r3.ok).toBe(true);
  });
});

describe("fetchComments 排序", () => {
  it("时间倒序返回（直接构造数据，绕开 5 分钟限频）", async () => {
    mem.set(
      "drift-song-comments",
      JSON.stringify([
        {
          id: "c1",
          trackId: "t1",
          text: "第一段足够长度的感想内容测试排序。",
          anonMark: "晚风船客·A7F3",
          source: "direct",
          likedBy: [],
          createdAt: 1000,
        },
        {
          id: "c2",
          trackId: "t1",
          text: "第二段足够长度的感想内容测试排序。",
          anonMark: "薄雾水手·C9E2",
          source: "bottle",
          likedBy: [],
          createdAt: 2000,
        },
      ]),
    );
    const list = await api.fetchComments("t1");
    expect(list.map((c) => c.id)).toEqual(["c2", "c1"]);
  });
});

describe("toggleCommentLike 去重", () => {
  it("点赞/取消点赞按 anonMark 去重", async () => {
    const r = await api.postComment("t1", "这是一段足够长度的感想用于点赞测试。");
    if (!r.ok) return;
    const id = r.comment.id;

    const like1 = await api.toggleCommentLike(id);
    expect(like1).toEqual({ ok: true, liked: true });
    expect((await api.fetchComments("t1"))[0].likedBy).toEqual(["晚风船客·A7F3"]);

    // 重复点赞等同取消（toggle 语义）
    const like2 = await api.toggleCommentLike(id);
    expect(like2).toEqual({ ok: true, liked: false });
    expect((await api.fetchComments("t1"))[0].likedBy).toEqual([]);
  });
});