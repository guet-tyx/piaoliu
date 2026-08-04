import { describe, it, expect, beforeEach } from "vitest";
import { usePlayerStore, buildFmQueue } from "./player";
import { TRACKS } from "@/data/tracks";
import { PLAYLISTS } from "@/data/playlists";
import { CHANNELS } from "@/data/channels";
import { playlistTracks } from "@/data/music-utils";

/** 每个用例重置 store 状态 */
function resetStore() {
  usePlayerStore.setState({
    tracks: TRACKS,
    currentIndex: 0,
    isPlaying: false,
    likedIds: [],
    likedPlaylistIds: [],
    source: { type: "library" },
    channelId: null,
    fmPlayedIds: [],
    fmRecommendedIds: [],
    sleepDeadline: null,
    sleepMode: null,
    danmakuOn: true,
    volume: 1,
    muted: false,
    playMode: "order",
    currentTime: 0,
    duration: 0,
    progress: 0,
    seekTarget: null,
    failed: false,
  });
}

describe("player store · 队列（P1-03 歌单）", () => {
  beforeEach(resetStore);

  it("playQueue 替换队列并从第 0 首开始、顺序模式", () => {
    const p = PLAYLISTS[0];
    usePlayerStore.getState().playQueue(playlistTracks(p), { type: "playlist", id: p.id });
    const s = usePlayerStore.getState();
    expect(s.tracks.length).toBe(p.trackIds.length);
    expect(s.currentIndex).toBe(0);
    expect(s.isPlaying).toBe(true);
    expect(s.playMode).toBe("order");
    expect(s.source).toEqual({ type: "playlist", id: p.id });
  });

  it("playQueueAt 从指定下标起播（越界取模）", () => {
    const p = PLAYLISTS[0];
    const list = playlistTracks(p);
    usePlayerStore.getState().playQueueAt(list, { type: "playlist", id: p.id }, 3);
    expect(usePlayerStore.getState().currentIndex).toBe(3);
  });

  it("歌单队列内 next 循环不越界", () => {
    const p = PLAYLISTS[0];
    const list = playlistTracks(p);
    usePlayerStore.getState().playQueue(list, { type: "playlist", id: p.id });
    for (let i = 0; i < list.length + 2; i++) {
      usePlayerStore.getState().next();
    }
    const idx = usePlayerStore.getState().currentIndex;
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(list.length);
  });

  it("togglePlaylistLike 歌单收藏切换", () => {
    const id = "pl-night-postrock";
    usePlayerStore.getState().togglePlaylistLike(id);
    expect(usePlayerStore.getState().likedPlaylistIds).toContain(id);
    usePlayerStore.getState().togglePlaylistLike(id);
    expect(usePlayerStore.getState().likedPlaylistIds).not.toContain(id);
  });

  it("曲目收藏与歌单收藏互不影响", () => {
    const t = TRACKS[0];
    usePlayerStore.getState().toggleLike(t.id);
    usePlayerStore.getState().togglePlaylistLike("pl-jp-breeze");
    const s = usePlayerStore.getState();
    expect(s.likedIds).toEqual([t.id]);
    expect(s.likedPlaylistIds).toEqual(["pl-jp-breeze"]);
  });
});

describe("player store · 频道（P1-05）", () => {
  beforeEach(resetStore);

  it("switchChannel 替换为频道曲目池并记录 channelId", () => {
    const ch = CHANNELS.find((c) => c.id === "ch-night")!;
    const list = ch.trackIds
      .map((id) => TRACKS.find((t) => t.id === id)!)
      .filter(Boolean);
    usePlayerStore.getState().switchChannel(ch.id, list);
    const s = usePlayerStore.getState();
    expect(s.channelId).toBe("ch-night");
    expect(s.source).toEqual({ type: "channel", id: "ch-night" });
    expect(s.tracks.length).toBe(ch.trackIds.length);
    expect(s.currentIndex).toBe(0);
  });

  it("切回曲库 playQueue 清空 channelId", () => {
    const ch = CHANNELS[0];
    usePlayerStore.getState().switchChannel(ch.id, TRACKS);
    usePlayerStore.getState().playQueue(TRACKS, { type: "library" });
    expect(usePlayerStore.getState().channelId).toBeNull();
  });

  it("buildFmQueue 随机不重复抽样且不超过 10 首", () => {
    const q = buildFmQueue();
    expect(q.length).toBeGreaterThan(0);
    expect(q.length).toBeLessThanOrEqual(10);
    expect(new Set(q.map((t) => t.id)).size).toBe(q.length);
  });

  it("空队列 next/prev/playIndex 安全不崩溃", () => {
    usePlayerStore.getState().playQueue([], { type: "channel", id: "ch-fm" });
    expect(() => usePlayerStore.getState().next()).not.toThrow();
    expect(() => usePlayerStore.getState().prev()).not.toThrow();
    expect(() => usePlayerStore.getState().playIndex(2)).not.toThrow();
    expect(usePlayerStore.getState().currentIndex).toBe(0);
  });
});

describe("player store · 私人 FM（P2-03）", () => {
  beforeEach(resetStore);

  it("切进 FM 用推荐引擎生成不重复初始队列（≤10 首）", () => {
    const ch = CHANNELS.find((c) => c.id === "ch-fm")!;
    const queue = buildFmQueue();
    usePlayerStore.getState().switchChannel(ch.id, queue);
    const s = usePlayerStore.getState();
    expect(s.channelId).toBe("ch-fm");
    expect(queue.length).toBeGreaterThan(0);
    expect(queue.length).toBeLessThanOrEqual(10);
    expect(new Set(queue.map((t) => t.id)).size).toBe(queue.length);
    expect(s.fmRecommendedIds.length).toBe(queue.length);
  });

  it("FM 播到队列末尾 next 自动追加（不绕回、不越界）", () => {
    // 用 3 首手工队列模拟 FM 末尾
    const three = TRACKS.slice(0, 3);
    usePlayerStore.getState().switchChannel("ch-fm", three);
    // 播到最后一首
    usePlayerStore.setState({ currentIndex: 2 });
    usePlayerStore.getState().next();
    const s = usePlayerStore.getState();
    expect(s.tracks.length).toBeGreaterThan(3); // 追加了
    expect(s.currentIndex).toBe(3);
    expect(s.fmPlayedIds).toContain(three[2].id);
  });

  it("FM 全曲库推荐完后 next 停留末尾不越界", () => {
    // 模拟 FM 队列 = 全曲库且全部已推荐
    usePlayerStore.setState({
      tracks: TRACKS,
      currentIndex: TRACKS.length - 1,
      channelId: "ch-fm",
      source: { type: "channel", id: "ch-fm" },
      fmRecommendedIds: TRACKS.map((t) => t.id),
      isPlaying: true,
    });
    usePlayerStore.getState().next();
    const s = usePlayerStore.getState();
    expect(s.currentIndex).toBe(TRACKS.length - 1); // 不越界
    expect(s.isPlaying).toBe(false); // 停在末尾
  });
});

describe("player store · 定时关闭（P2-04）", () => {
  beforeEach(resetStore);

  it("setSleepTimer after 模式写入到期时间戳", () => {
    const before = Date.now();
    usePlayerStore.getState().setSleepTimer("after", 30);
    const s = usePlayerStore.getState();
    expect(s.sleepMode).toBe("after");
    expect(s.sleepDeadline).toBeGreaterThanOrEqual(before + 30 * 60 * 1000 - 100);
  });

  it("track 模式不写入 deadline", () => {
    usePlayerStore.getState().setSleepTimer("track");
    const s = usePlayerStore.getState();
    expect(s.sleepMode).toBe("track");
    expect(s.sleepDeadline).toBeNull();
  });

  it("clearSleepTimer 清空", () => {
    usePlayerStore.getState().setSleepTimer("after", 15);
    usePlayerStore.getState().clearSleepTimer();
    const s = usePlayerStore.getState();
    expect(s.sleepMode).toBeNull();
    expect(s.sleepDeadline).toBeNull();
  });

  it("setSleepTimer 自定义分钟夹取 1-120", () => {
    usePlayerStore.getState().setSleepTimer("after", 500);
    const s1 = usePlayerStore.getState();
    expect(s1.sleepDeadline).toBeLessThanOrEqual(Date.now() + 120 * 60 * 1000);
  });
});