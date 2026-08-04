import { describe, expect, it } from "vitest";
import { shouldInitiate } from "@/lib/chat/initiative";

/** 人机感 P1-⑤ 对话主动性：回合节奏 + 输入长短自适应 + 休息暗示停止 */

describe("shouldInitiate 主动反问判定", () => {
  it("回合 < 1 不主动", () => {
    expect(shouldInitiate("你好呀", 0)).toBe(false);
  });

  it("默认节奏：每 4 轮主动一次", () => {
    const mid = "今天过得怎么样？要不要一起去听新出的那首";
    expect(mid.length).toBeGreaterThanOrEqual(20);
    expect(mid.length).toBeLessThanOrEqual(80);
    expect(shouldInitiate(mid, 3)).toBe(false);
    expect(shouldInitiate(mid, 4)).toBe(true);
    expect(shouldInitiate(mid, 8)).toBe(true);
  });

  it("短回复（<20 字）降低频率：每 8 轮一次", () => {
    expect(shouldInitiate("嗯嗯", 4)).toBe(false);
    expect(shouldInitiate("嗯嗯", 8)).toBe(true);
  });

  it("长回复（>80 字）提高频率：每 3 轮一次", () => {
    const long =
      "今天我去听了那场音乐会，现场的氛围特别棒，主唱的声音很有感染力，安可的时候大家都站起来跟着唱，我差点感动哭了。散场后我还买了一张签名的海报，明天想分享给你看看呀。";
    expect(long.length).toBeGreaterThan(80);
    expect(shouldInitiate(long, 3)).toBe(true);
    expect(shouldInitiate(long, 6)).toBe(true);
    expect(shouldInitiate(long, 4)).toBe(false);
  });

  it("明确想休息时不主动", () => {
    expect(shouldInitiate("我有点累了，想休息一下", 4)).toBe(false);
    expect(shouldInitiate("不聊了晚安吧", 4)).toBe(false);
    expect(shouldInitiate("就这样吧", 3)).toBe(false);
  });
});
