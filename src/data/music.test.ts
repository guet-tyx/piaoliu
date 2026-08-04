import { describe, it, expect } from "vitest";
import { TRACKS } from "./tracks";
import { PLAYLISTS } from "./playlists";
import { CHANNELS } from "./channels";
import {
  playlistTracks,
  playlistTrackCount,
  playlistTotalDuration,
  formatDuration,
  formatMinutes,
} from "./music-utils";

describe("tracks（52 首曲库）", () => {
  it("恰好 52 首且 id 唯一", () => {
    expect(TRACKS.length).toBe(52);
    expect(new Set(TRACKS.map((t) => t.id)).size).toBe(52);
  });

  it("每首都有 src/mood/scene/duration", () => {
    for (const t of TRACKS) {
      expect(t.src.length, t.id).toBeGreaterThan(0);
      expect(t.mood.length, t.id).toBeGreaterThan(0);
      expect(t.scene.length, t.id).toBeGreaterThan(0);
      expect(t.duration, t.id).toBeGreaterThan(0);
    }
  });

  it("情绪/场景标签都是合法枚举", () => {
    const moods = new Set(["治愈", "燃", "伤感", "平静", "空灵", "温暖"]);
    const scenes = new Set(["深夜", "学习", "通勤", "雨天", "冥想", "运动", "日常"]);
    for (const t of TRACKS) {
      for (const m of t.mood) expect(moods.has(m), `${t.id}.mood=${m}`).toBe(true);
      for (const s of t.scene) expect(scenes.has(s), `${t.id}.scene=${s}`).toBe(true);
    }
  });

  it("本地曲目（src=/music/）都指向存在的文件命名规范", () => {
    for (const t of TRACKS) {
      for (const src of t.src) {
        // 远程兜底源不做本地校验
        if (src.startsWith("/music/")) {
          expect(src, t.id).toMatch(/^\/music\/[\w.-]+\.mp3$/);
        }
      }
    }
  });
});

describe("playlists（6 张官方歌单）", () => {
  it("6 张、id 唯一", () => {
    expect(PLAYLISTS.length).toBe(6);
    expect(new Set(PLAYLISTS.map((p) => p.id)).size).toBe(6);
  });

  it("52 首曲目全覆盖且不重复（并集 = 曲库全集）", () => {
    const ids = PLAYLISTS.flatMap((p) => p.trackIds);
    expect(ids.length).toBe(52);
    expect(new Set(ids).size).toBe(52); // 无跨歌单重复
    expect(new Set(ids)).toEqual(new Set(TRACKS.map((t) => t.id))); // 全覆盖
  });

  it("每个 trackIds 都能解析出曲目（派生工具不为空）", () => {
    for (const p of PLAYLISTS) {
      expect(playlistTrackCount(p)).toBe(p.trackIds.length);
      expect(playlistTotalDuration(p)).toBeGreaterThan(0);
    }
  });

  it("official 均为官方歌单，mood/scene 合法", () => {
    for (const p of PLAYLISTS) {
      expect(p.official).toBe(true);
      expect(p.mood).toBeTruthy();
      expect(p.scene).toBeTruthy();
    }
  });
});

describe("channels（5 个电台频道）", () => {
  it("5 频道、id 唯一", () => {
    expect(CHANNELS.length).toBe(5);
    expect(new Set(CHANNELS.map((c) => c.id)).size).toBe(5);
  });

  it("有主持人的频道 trackIds 都能在曲库中解析", () => {
    for (const c of CHANNELS) {
      for (const id of c.trackIds) {
        expect(TRACKS.some((t) => t.id === id), `${c.id}: ${id}`).toBe(true);
      }
    }
  });

  it("ghost 频道 用合法角色 id（除私人FM 外必须有 host）", () => {
    for (const c of CHANNELS) {
      if (c.id !== "ch-fm") {
        expect(c.host, c.id).not.toBeNull();
      }
    }
  });

  it("私人FM 曲目池为空（动态生成）", () => {
    const fm = CHANNELS.find((c) => c.id === "ch-fm");
    expect(fm?.trackIds).toEqual([]);
  });
});

describe("music-utils 展示工具", () => {
  it("formatDuration 秒转 mm:ss", () => {
    expect(formatDuration(332)).toBe("5:32");
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(-3)).toBe("0:00");
    expect(formatDuration(65)).toBe("1:05");
  });

  it("formatMinutes 概约分钟", () => {
    expect(formatMinutes(2520)).toBe("约 42 分钟");
    expect(formatMinutes(0)).toBe("0 分钟");
  });

  it("playlistTracks 保持 trackIds 顺序", () => {
    const p = PLAYLISTS[0];
    const tracks = playlistTracks(p);
    expect(tracks.map((t) => t.id)).toEqual(p.trackIds);
  });
});