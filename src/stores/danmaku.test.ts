import { describe, it, expect, beforeEach } from "vitest";
import { useDanmakuStore } from "./danmaku";
import type { DanmakuMessage } from "@/lib/realtime/types";

function msg(overrides: Partial<DanmakuMessage> = {}): DanmakuMessage {
  return {
    id: `dm-${Math.random().toString(36).slice(2, 8)}`,
    text: "测试弹幕",
    channelId: "ch-night",
    trackId: "t01",
    peerId: "p-x",
    at: Date.now(),
    ...overrides,
  };
}

describe("danmaku store（P3-04 频道隔离）", () => {
  beforeEach(() => {
    useDanmakuStore.setState({ items: [] });
  });

  it("push 保留 channelId 字段（隔离过滤数据基础）", () => {
    const m = msg({ channelId: "ch-night", trackId: "t05" });
    useDanmakuStore.getState().push(m);
    const items = useDanmakuStore.getState().items;
    expect(items.length).toBe(1);
    expect(items[0].channelId).toBe("ch-night");
    expect(items[0].trackId).toBe("t05");
  });

  it("池上限 12：满则挤掉最旧", () => {
    const s = useDanmakuStore.getState();
    for (let i = 0; i < 15; i++) {
      s.push(msg({ text: `弹幕${i}` }));
    }
    const items = useDanmakuStore.getState().items;
    expect(items.length).toBe(12);
    expect(items[0].text).toBe("弹幕3"); // 最旧的 0/1/2 被挤掉
  });

  it("系统事件弹幕无 channelId（全局展示）", () => {
    useDanmakuStore.getState().pushSystem("欢迎来到星海", "welcome");
    const items = useDanmakuStore.getState().items;
    expect(items.length).toBe(1);
    expect(items[0].system).toBe(true);
    expect(items[0].channelId).toBeUndefined();
  });

  it("clear 清空全部", () => {
    useDanmakuStore.getState().push(msg());
    useDanmakuStore.getState().push(msg());
    useDanmakuStore.getState().clear();
    expect(useDanmakuStore.getState().items.length).toBe(0);
  });
});