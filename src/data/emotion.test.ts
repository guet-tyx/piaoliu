import { describe, expect, it } from "vitest";
import {
  defaultEmotion,
  updateEmotion,
  emotionTextOf,
  affinityTextOf,
  isEmotionState,
  EMOTION_BASELINE,
  type EmotionState,
} from "@/data/emotion";

/** 人机感 P1-④ 情感状态机：默认态 / 更新规则 / 描述生成 / 字段校验 */

describe("defaultEmotion / isEmotionState", () => {
  it("默认情绪：基线愉悦 65、激活 50、平静、亲密度 30", () => {
    const e = defaultEmotion("sio");
    expect(e).toEqual({
      roleId: "sio",
      valence: 65,
      arousal: 50,
      primary: "平静",
      decayRate: 0.1,
      affinity: 30,
    });
    expect(isEmotionState(e)).toBe(true);
  });

  it("字段缺失视为损坏（isEmotionState 校验）", () => {
    expect(isEmotionState({ roleId: "sio", valence: 1 })).toBe(false);
    expect(isEmotionState(null)).toBe(false);
    expect(isEmotionState("x")).toBe(false);
  });
});

describe("updateEmotion 情感更新", () => {
  it("高兴文本 → 愉悦/激活上升，主导情绪为高兴", () => {
    const e = updateEmotion(defaultEmotion("sio"), "哈哈，我今天太开心了，好耶！");
    expect(e.primary).toBe("高兴");
    expect(e.valence).toBeGreaterThan(65);
    expect(e.arousal).toBeGreaterThan(50);
  });

  it("难过文本 → 愉悦下降、亲密度上升，主导情绪为悲伤", () => {
    const e = updateEmotion(defaultEmotion("sio"), "我好难过，想哭");
    expect(e.primary).toBe("悲伤");
    expect(e.valence).toBeLessThan(65);
    expect(e.affinity).toBeGreaterThan(30);
  });

  it("无情绪词 → 向基线回归并保持平静", () => {
    const prev = { ...defaultEmotion("sio"), valence: 90, arousal: 80 };
    const e = updateEmotion(prev, "今天天气不错");
    expect(e.primary).toBe("平静");
    expect(e.valence).toBeLessThan(90); // 衰减
    expect(e.valence).toBeGreaterThanOrEqual(EMOTION_BASELINE.valence);
    expect(e.arousal).toBeLessThan(80);
  });

  it("并列命中取规则表靠前者主导（悲伤 > 担忧）", () => {
    const e = updateEmotion(defaultEmotion("sio"), "我好难过，又担心");
    expect(e.primary).toBe("悲伤");
  });

  it("多词命中取命中数最多者主导", () => {
    const e = updateEmotion(defaultEmotion("sio"), "哈哈，我今天好开心，好耶！");
    expect(e.primary).toBe("高兴");
  });

  it("多轮累加不越界（clamp 0-100）", () => {
    let e = defaultEmotion("sio");
    for (let i = 0; i < 20; i += 1) e = updateEmotion(e, "哈哈，好开心，太好了，好耶！");
    expect(e.valence).toBeLessThanOrEqual(100);
    expect(e.arousal).toBeLessThanOrEqual(100);
    expect(e.affinity).toBeLessThanOrEqual(100);
    expect(e.valence).toBeGreaterThanOrEqual(0);
  });

  it("不原地修改 prev（返回新对象）", () => {
    const prev = defaultEmotion("sio");
    const next = updateEmotion(prev, "太开心了");
    expect(next).not.toBe(prev);
    expect(prev.primary).toBe("平静");
  });
});

describe("emotionTextOf / affinityTextOf 描述生成", () => {
  it("离散情绪返回主导词", () => {
    const e: EmotionState = { ...defaultEmotion("sio"), primary: "高兴", valence: 80, arousal: 70 };
    expect(emotionTextOf(e)).toContain("高兴");
  });

  it("平静时按连续值描述", () => {
    expect(emotionTextOf({ ...defaultEmotion("sio"), valence: 80 })).toContain("心情不错");
    expect(emotionTextOf({ ...defaultEmotion("sio"), valence: 30 })).toContain("有点低沉");
    expect(emotionTextOf(defaultEmotion("sio"))).toContain("平静");
  });

  it("亲密度描述随数值上升", () => {
    expect(affinityTextOf(20)).toContain("刚认识");
    expect(affinityTextOf(45)).toContain("同行者");
    expect(affinityTextOf(60)).toContain("熟悉");
    expect(affinityTextOf(80)).toContain("老朋友");
  });
});
