import { describe, expect, it, vi } from "vitest";
import { createLruCache } from "@/lib/tts/cache";

describe("createLruCache（TTS 音频缓存，max 50 超容淘汰）", () => {
  it("超容淘汰最久未用项，并回调 onEvict", () => {
    const onEvict = vi.fn();
    const c = createLruCache<string, string>(2, onEvict);
    c.set("a", "1");
    c.set("b", "2");
    c.set("c", "3"); // 淘汰 a
    expect(c.has("a")).toBe(false);
    expect(onEvict).toHaveBeenCalledWith("a", "1");
    expect(c.size).toBe(2);
  });

  it("get 命中刷新最近使用（淘汰顺序变化）", () => {
    const onEvict = vi.fn();
    const c = createLruCache<string, string>(2, onEvict);
    c.set("a", "1");
    c.set("b", "2");
    c.get("a"); // a 变为最近使用
    c.set("c", "3"); // 应淘汰 b（b 最久未用）
    expect(c.has("b")).toBe(false);
    expect(c.has("a")).toBe(true);
    expect(c.has("c")).toBe(true);
  });

  it("同 key 重复 set 只保留一份", () => {
    const c = createLruCache<string, string>(2);
    c.set("a", "1");
    c.set("a", "2");
    expect(c.size).toBe(1);
    expect(c.get("a")).toBe("2");
  });

  it("delete 移除且不触发 onEvict", () => {
    const onEvict = vi.fn();
    const c = createLruCache<string, string>(2, onEvict);
    c.set("a", "1");
    c.delete("a");
    expect(c.size).toBe(0);
    expect(c.get("a")).toBeUndefined();
    expect(onEvict).not.toHaveBeenCalled();
  });

  it("keys() 返回最近使用序（头部最旧）", () => {
    const c = createLruCache<string, string>(3);
    c.set("a", "1");
    c.set("b", "2");
    c.set("c", "3");
    c.get("a");
    expect(c.keys()).toEqual(["b", "c", "a"]);
  });
});
