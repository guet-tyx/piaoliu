import { describe, it, expect } from "vitest";
import { recommendNext, recommendBatch, createEmptyFmState } from "./fmEngine";
import type { Track } from "@/types/music";

/** 构造最小 Track 供引擎测试 */
function makeTrack(id: string, tag: string): Track {
  return {
    id,
    t: id,
    tag,
    s: "测试曲",
    cover: "/x.webp",
    src: ["/x.mp3"],
    mood: ["平静"],
    scene: ["学习"],
    duration: 60,
  };
}

const TRACKS: Track[] = [
  makeTrack("a", "后摇"),
  makeTrack("b", "后摇"),
  makeTrack("c", "日系"),
  makeTrack("d", "电子"),
  makeTrack("e", "电子"),
];

describe("fmEngine.recommendNext", () => {
  it("空曲库返回 null 且状态不变", () => {
    const { track, next } = recommendNext(createEmptyFmState(), []);
    expect(track).toBeNull();
    expect(next.recommendedIds).toEqual([]);
  });

  it("首次推荐优先未听过且未推荐过的曲目", () => {
    const { track, next } = recommendNext(createEmptyFmState(), TRACKS);
    expect(track).not.toBeNull();
    expect(track!.id).toBeTruthy();
    expect(next.recommendedIds).toContain(track!.id);
  });

  it("已推荐/已听过的曲目不再重复推荐（曲库充足时）", () => {
    // 全部标记为已推荐 → 无未推荐曲目时应回到兜底（允许重复）
    let state = createEmptyFmState();
    // 连续推荐 5 次应覆盖 5 首且互不重复
    const ids = new Set<string>();
    for (let i = 0; i < TRACKS.length; i++) {
      const { track, next } = recommendNext(state, TRACKS);
      expect(track).not.toBeNull();
      ids.add(track!.id);
      state = next;
    }
    expect(ids.size).toBe(TRACKS.length);
  });

  it("最近喜欢同 tag 加权：recent 是后摇时倾向推后摇未听曲目", () => {
    // 已知 a/b 已听，最近喜欢 a（后摇）→ 应推同 tag 的 b（未听）
    const state = {
      recommendedIds: [],
      likedIds: ["a"],
      recentIds: ["a"],
      playedIds: ["a", "c"],
    };
    const { track } = recommendNext(state, TRACKS);
    expect(track?.tag).toBe("后摇");
  });

  it("所有曲目都推荐过一轮 → 允许从全曲库随机（不崩溃）", () => {
    const state = {
      recommendedIds: TRACKS.map((t) => t.id),
      likedIds: [],
      recentIds: [],
      playedIds: [],
    };
    const { track } = recommendNext(state, TRACKS);
    expect(track).not.toBeNull();
    expect(TRACKS.some((t) => t.id === track!.id)).toBe(true);
  });

  it("recommendBatch 生成指定数量且互不重复", () => {
    const { tracks, next } = recommendBatch(createEmptyFmState(), TRACKS, 4);
    expect(tracks.length).toBe(4);
    expect(new Set(tracks.map((t) => t.id)).size).toBe(4);
    expect(next.recommendedIds.length).toBe(4);
  });

  it("recommendBatch 数量超过曲库 → 只生成曲库大小", () => {
    const { tracks } = recommendBatch(createEmptyFmState(), TRACKS, 99);
    expect(tracks.length).toBe(TRACKS.length);
  });

  it("曲库全部已推荐 → batch 返回 0 首（不循环兜底、不崩溃）", () => {
    const state = {
      recommendedIds: TRACKS.map((t) => t.id),
      likedIds: [],
      recentIds: [],
      playedIds: [],
    };
    const { tracks, next } = recommendBatch(state, TRACKS, 10);
    expect(tracks.length).toBe(0);
    expect(next.recommendedIds).toEqual(state.recommendedIds);
  });
});