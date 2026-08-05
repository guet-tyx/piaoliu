import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as colistenMod from "@/lib/api/colisten";
import type * as sailorApiMod from "@/lib/api/sailor";
import type * as anonApiMod from "@/lib/supabase/anon";
import { TRACKS } from "@/data/tracks";
import type { TrackSnapshot } from "@/types/social";

/**
 * 星海共听房间查询层（P2）本地分支：
 * 推荐歌单构建 / 房间创建（幽灵注入）/ 列表活跃过滤 / 心跳。
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

let api: typeof colistenMod;
let sailorApi: typeof sailorApiMod;
let anonApi: typeof anonApiMod;

const snap = (t: (typeof TRACKS)[number]): TrackSnapshot => ({
  id: t.id,
  t: t.t,
  tag: t.tag,
  s: t.s,
  cover: t.cover,
});

beforeEach(async () => {
  mem.clear();
  vi.resetModules();
  vi.stubGlobal("localStorage", localStorageMock);
  api = await import("@/lib/api/colisten");
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

describe("buildColistenPlaylist（推荐歌单）", () => {
  it("同风格扩列 5-10 首，不含起点歌曲", () => {
    const start = snap(TRACKS[0]);
    const list = api.buildColistenPlaylist(start);
    expect(list.length).toBeGreaterThanOrEqual(5);
    expect(list.length).toBeLessThanOrEqual(10);
    expect(list.every((s) => s.t !== start.t)).toBe(true);
    // 同风格优先（起点 tag 或 mood 至少命中其一）
    const origin = TRACKS.find((t) => t.t === start.t);
    if (origin) {
      const similar = list.filter((s) => {
        const t = TRACKS.find((x) => x.id === s.id);
        return t && (t.tag === origin.tag || t.mood.some((m) => origin.mood.includes(m)));
      });
      expect(similar.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("未知起点歌曲也能兜底补足 5 首", () => {
    const list = api.buildColistenPlaylist({ t: "不存在的歌", tag: "未知", s: "未知", cover: "/x.png" });
    expect(list.length).toBeGreaterThanOrEqual(5);
  });
});

describe("createCoListenRoom（本地创建）", () => {
  it("创建房间写入 localStorage 并注入 4 位幽灵成员", async () => {
    const start = snap(TRACKS[0]);
    const room = await api.createCoListenRoom(start, [start]);
    expect(room).not.toBeNull();
    expect(room!.title).toContain(start.t);
    expect(room!.ghosts).toHaveLength(4);
    expect(room!.hostId).toBeTruthy();
    expect(room!.ghosts?.every((g) => g.peerId.startsWith("ghost-"))).toBe(true);

    const rooms = await api.fetchCoListenRooms();
    expect(rooms.map((r) => r.id)).toContain(room!.id);
  });

  it("opts.ghosts=false 时不注入幽灵（真实模式语义）", async () => {
    const room = await api.createCoListenRoom(snap(TRACKS[0]), [], { ghosts: false });
    expect(room!.ghosts).toEqual([]);
  });
});

describe("fetchCoListenRooms 活跃过滤", () => {
  it("30 分钟无活跃的房间自动解散（不列出）", async () => {
    const now = Date.now();
    mem.set(
      "drift-colisten-rooms",
      JSON.stringify([
        {
          id: "r1",
          title: "活跃房间",
          startTrack: snap(TRACKS[0]),
          playlist: [],
          createdBy: "a",
          hostId: "h",
          createdAt: now,
          lastActiveAt: now,
        },
        {
          id: "r2",
          title: "已沉寂房间",
          startTrack: snap(TRACKS[1]),
          playlist: [],
          createdBy: "b",
          hostId: "h2",
          createdAt: now - 60 * 60_000,
          lastActiveAt: now - 31 * 60_000,
        },
      ]),
    );
    const rooms = await api.fetchCoListenRooms();
    expect(rooms.map((r) => r.id)).toEqual(["r1"]);
  });
});

describe("touchCoListenRoom（心跳）", () => {
  it("更新房间最近活跃时间", async () => {
    const room = await api.createCoListenRoom(snap(TRACKS[0]), []);
    await api.touchCoListenRoom(room!.id);
    const rooms = await api.fetchCoListenRooms();
    expect(rooms[0].lastActiveAt).toBeGreaterThanOrEqual(room!.lastActiveAt);
  });
});