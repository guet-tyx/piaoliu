import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as playerMod from "@/stores/player";

/** 播放器状态持久化（V2.7）：restore 校验 / isPlaying 强制 false / 频道恢复 / 变更写回 */

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

type PlayerStoreApi = typeof playerMod.usePlayerStore;

let persist: typeof import("@/lib/player/persist");
let store: PlayerStoreApi;

beforeEach(async () => {
  mem.clear();
  vi.resetModules();
  vi.stubGlobal("localStorage", localStorageMock);
  persist = await import("@/lib/player/persist");
  const player = await import("@/stores/player");
  store = player.usePlayerStore as PlayerStoreApi;
});

afterEach(() => vi.unstubAllGlobals());

describe("restorePlayerState", () => {
  it("恢复 UI 状态且 isPlaying 强制 false（防自动播放拦截）", () => {
    mem.set(
      "drift-player-state",
      JSON.stringify({
        currentIndex: 2,
        volume: 0.5,
        muted: true,
        playMode: "shuffle",
        danmakuOn: false,
        hostBubbleOn: false,
        hostVoiceOn: false,
        channelId: "ch-night",
        isPlaying: true,
      }),
    );
    store.setState({ currentIndex: 0, volume: 1, muted: false, playMode: "order", isPlaying: false, channelId: null });

    persist.restorePlayerState();

    const s = store.getState();
    expect(s.currentIndex).toBe(2);
    expect(s.volume).toBe(0.5);
    expect(s.muted).toBe(true);
    expect(s.playMode).toBe("shuffle");
    expect(s.danmakuOn).toBe(false);
    expect(s.channelId).toBe("ch-night");
    expect(s.source).toEqual({ type: "channel", id: "ch-night" });
    expect(s.isPlaying).toBe(false); // 关键：不自动播放
  });

  it("未知频道 id 忽略（防旧数据漂移）", () => {
    mem.set("drift-player-state", JSON.stringify({ channelId: "ch-nope" }));
    store.setState({ channelId: null });
    persist.restorePlayerState();
    expect(store.getState().channelId).toBeNull();
  });

  it("越界 currentIndex 忽略", () => {
    mem.set("drift-player-state", JSON.stringify({ currentIndex: 9999 }));
    store.setState({ currentIndex: 0 });
    persist.restorePlayerState();
    expect(store.getState().currentIndex).toBe(0);
  });

  it("损坏数据忽略（保持默认值，不抛错）", () => {
    mem.set("drift-player-state", "{broken-json");
    store.setState({ volume: 0.7 });
    expect(() => persist.restorePlayerState()).not.toThrow();
    expect(store.getState().volume).toBe(0.7);
  });

  it("恢复曲目/歌单收藏", () => {
    mem.set("drift-favorites", JSON.stringify(["t01", "t02"]));
    mem.set("drift-fav-playlists", JSON.stringify(["pl-night-postrock"]));
    persist.restorePlayerState();
    expect(store.getState().likedIds).toEqual(["t01", "t02"]);
    expect(store.getState().likedPlaylistIds).toEqual(["pl-night-postrock"]);
  });
});

describe("bindPlayerPersistence", () => {
  it("变更时写回（含频道 id），仅持久化字段变化才写", () => {
    const unsub = persist.bindPlayerPersistence();
    store.getState().toggleHostVoice();
    const saved = JSON.parse(mem.get("drift-player-state") ?? "{}") as { hostVoiceOn?: boolean };
    expect(saved.hostVoiceOn).toBe(false);

    store.getState().toggleLike("t01");
    expect(JSON.parse(mem.get("drift-favorites") ?? "[]")).toEqual(["t01"]);

    store.getState().setProgress(10, 200); // 非持久化字段 → 不写
    const before = mem.get("drift-player-state");
    store.getState().setProgress(11, 200);
    expect(mem.get("drift-player-state")).toBe(before);
    unsub();
  });

  it("取消订阅后不再写回", () => {
    const unsub = persist.bindPlayerPersistence();
    store.getState().toggleDanmaku();
    const snapshot = mem.get("drift-player-state");
    unsub();
    store.getState().toggleDanmaku(); // 回到初始值
    expect(mem.get("drift-player-state")).toBe(snapshot);
  });
});
