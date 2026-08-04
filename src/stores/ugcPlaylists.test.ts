import { describe, it, expect, beforeEach } from "vitest";
import {
  useUgcPlaylistsStore,
  makeUgcPlaylist,
  UGC_LIMITS,
} from "./ugcPlaylists";
import { TRACKS } from "@/data/tracks";

/** 重置 store（node 环境无 localStorage，store 不直接读写，可测） */
function resetStore() {
  useUgcPlaylistsStore.setState({ playlists: [], ready: false });
}

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "我的深夜精选",
    desc: "",
    cover: "/images/playlist-covers/pl-night-postrock.webp",
    tags: ["后摇"],
    trackIds: TRACKS.slice(0, 4).map((t) => t.id),
    ...overrides,
  };
}

describe("ugcPlaylists store", () => {
  beforeEach(resetStore);

  it("创建合法歌单：写入列表并返回 id，official=false", () => {
    const id = useUgcPlaylistsStore.getState().create(validInput());
    const s = useUgcPlaylistsStore.getState();
    expect(s.playlists.length).toBe(1);
    expect(s.playlists[0].id).toBe(id);
    expect(s.playlists[0].official).toBe(false);
    expect(s.playlists[0].trackIds.length).toBe(4);
  });

  it("名称长度校验：2-20 字", () => {
    expect(() => useUgcPlaylistsStore.getState().create(validInput({ name: "夜" }))).toThrow();
    expect(() =>
      useUgcPlaylistsStore.getState().create(validInput({ name: "夜".repeat(21) })),
    ).toThrow();
  });

  it("最少 3 首歌校验", () => {
    expect(() =>
      useUgcPlaylistsStore.getState().create(validInput({ trackIds: ["t01", "t02"] })),
    ).toThrow(/至少选择/);
  });

  it("最多 50 首歌校验", () => {
    const many = TRACKS.map((t) => t.id);
    // 曲库 52 首 > 50，应报超上限
    expect(() => useUgcPlaylistsStore.getState().create(validInput({ trackIds: many }))).toThrow(
      /最多选择/,
    );
  });

  it("同歌单内重复曲目被拒绝", () => {
    expect(() =>
      useUgcPlaylistsStore.getState().create(
        validInput({ trackIds: ["t01", "t01", "t01", "t02"] }),
      ),
    ).toThrow(/不能重复/);
  });

  it("最多 5 个歌单上限", () => {
    const s = useUgcPlaylistsStore.getState();
    for (let i = 0; i < UGC_LIMITS.maxPlaylists; i++) {
      s.create(validInput({ name: `歌单${i}` }));
    }
    expect(() => s.create(validInput({ name: "第六个" }))).toThrow(/最多创建/);
  });

  it("简介最多 100 字", () => {
    expect(() =>
      useUgcPlaylistsStore.getState().create(validInput({ desc: "长".repeat(101) })),
    ).toThrow(/简介最多/);
  });

  it("创建时间倒序：新歌单在最前", () => {
    const s = useUgcPlaylistsStore.getState();
    s.create(validInput({ name: "第一个" }));
    s.create(validInput({ name: "第二个" }));
    const list = useUgcPlaylistsStore.getState().playlists;
    expect(list[0].name).toBe("第二个");
    expect(list[1].name).toBe("第一个");
  });

  it("删除歌单：不存在时静默，存在时移除", () => {
    const id = useUgcPlaylistsStore.getState().create(validInput());
    useUgcPlaylistsStore.getState().removeById(id);
    expect(useUgcPlaylistsStore.getState().playlists.length).toBe(0);
    // 重复删除不报错
    expect(() => useUgcPlaylistsStore.getState().removeById(id)).not.toThrow();
  });
});

describe("makeUgcPlaylist 工厂", () => {
  it("缺省字段补全：mood/scene/meta/alt/official", () => {
    const p = makeUgcPlaylist({ name: "测试", trackIds: ["t01"] });
    expect(p.official).toBe(false);
    expect(p.mood).toBe("治愈");
    expect(p.scene).toBe("日常");
    expect(p.meta.plays).toBe("0");
    expect(p.alt).toBe("测试");
    expect(p.createdAt).toBeGreaterThan(0);
    expect(p.creatorId).toBe("local-guest");
  });

  it("trackIds 去重不强制（创建时校验），但保留给定顺序", () => {
    const p = makeUgcPlaylist({ name: "x", trackIds: ["t03", "t01", "t02"] });
    expect(p.trackIds).toEqual(["t03", "t01", "t02"]);
  });

  it("id 缺省时生成 ugc- 前缀唯一 id", () => {
    const p1 = makeUgcPlaylist({ name: "x" });
    const p2 = makeUgcPlaylist({ name: "x" });
    expect(p1.id).toMatch(/^ugc-/);
    expect(p1.id).not.toBe(p2.id);
  });
});