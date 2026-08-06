import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CRAWLED_SOURCE_TO_TRACK } from "./crawled-mapping";

/** 曲库合法 id 集合（t01-t52） */
const TRACK_IDS = new Set(
  Array.from({ length: 52 }, (_, i) => `t${String(i + 1).padStart(2, "0")}`),
);

function readCrawledJson(file: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(process.cwd(), "public", "data", file), "utf8"),
  ) as Record<string, unknown>;
}

describe("crawled-mapping（爬取数据 → 曲库曲目映射）", () => {
  it("映射非空、key 不重复、value 均为合法曲库 id", () => {
    const keys = Object.keys(CRAWLED_SOURCE_TO_TRACK);
    expect(keys.length).toBeGreaterThanOrEqual(20);
    expect(new Set(keys).size).toBe(keys.length);
    for (const id of Object.values(CRAWLED_SOURCE_TO_TRACK)) {
      expect(TRACK_IDS.has(id)).toBe(true);
    }
  });

  it("生成数据的所有 trackId 均来自映射（无孤儿 trackId）", () => {
    const dm = readCrawledJson("crawled-danmaku.json");
    const cm = readCrawledJson("crawled-comments.json");
    const mapped = new Set(Object.values(CRAWLED_SOURCE_TO_TRACK));
    for (const id of Object.keys(dm)) expect(mapped.has(id)).toBe(true);
    for (const id of Object.keys(cm)) expect(mapped.has(id)).toBe(true);
  });

  it("生成的数据文件非空且结构正确", () => {
    const dm = readCrawledJson("crawled-danmaku.json");
    const cm = readCrawledJson("crawled-comments.json");
    expect(Object.keys(dm).length).toBeGreaterThanOrEqual(10);
    expect(Object.keys(cm).length).toBeGreaterThanOrEqual(20);
    for (const list of Object.values(dm)) {
      expect(Array.isArray(list)).toBe(true);
      expect((list as string[]).every((t) => typeof t === "string" && t.length > 0)).toBe(true);
    }
    for (const list of Object.values(cm)) {
      const c = (list as Array<{ text: string; liked: number }>)[0];
      expect(typeof c.text).toBe("string");
      expect(typeof c.liked).toBe("number");
    }
  });
});