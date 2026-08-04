/**
 * 情感状态机（人机感 P1-④）：
 * 角色拥有自己的情绪——连续愉悦/激活维度 + 主导离散情绪 + 与用户的亲密度。
 * 情绪随用户输入变化、每轮向基线回归，反过来影响回复风格（prompt「当前状态」）与生成温度（动态 Temperature）。
 * 纯逻辑模块（无 localStorage），持久化由 stores/emotion.ts 负责，服务端可安全复用。
 */

export type EmotionType =
  | "高兴"
  | "平静"
  | "悲伤"
  | "惊讶"
  | "思念"
  | "疲惫"
  | "好奇"
  | "担忧";

export interface EmotionState {
  /** 所属角色 id */
  roleId: string;
  /** 愉悦度 0-100（默认 65） */
  valence: number;
  /** 激活度 0-100（默认 50） */
  arousal: number;
  /** 当前主导离散情绪 */
  primary: EmotionType;
  /** 情绪向基线回归的速率（每轮 0-1，默认 0.1） */
  decayRate: number;
  /** 与用户的亲密度 0-100（默认 30，随情绪分享增长） */
  affinity: number;
}

/** 情绪基线（回归目标） */
export const EMOTION_BASELINE = { valence: 65, arousal: 50 } as const;

/** 新会话的初始情绪 */
export function defaultEmotion(roleId: string): EmotionState {
  return {
    roleId,
    valence: EMOTION_BASELINE.valence,
    arousal: EMOTION_BASELINE.arousal,
    primary: "平静",
    decayRate: 0.1,
    affinity: 30,
  };
}

/** 字段校验（localStorage 恢复 / 路由请求体共用；缺字段视为损坏） */
export function isEmotionState(v: unknown): v is EmotionState {
  const e = v as Partial<EmotionState>;
  return (
    typeof e?.roleId === "string" &&
    typeof e?.valence === "number" &&
    typeof e?.arousal === "number" &&
    typeof e?.primary === "string" &&
    typeof e?.decayRate === "number" &&
    typeof e?.affinity === "number"
  );
}

const clamp = (v: number, min = 0, max = 100): number => Math.max(min, Math.min(max, v));

interface MoodRule {
  type: EmotionType;
  /** 命中任一关键词即触发（多字短语，避免单字误伤如「累」命中「积累」） */
  words: string[];
  /** 情绪调整量（重复命中最多计 2 次） */
  valence: number;
  arousal: number;
  /** 情绪分享带来的亲密度增量 */
  affinity: number;
}

/** 情感分析规则表：按情感浓度排序，命中数多者主导（并列时靠前优先） */
const MOOD_RULES: MoodRule[] = [
  { type: "悲伤", words: ["难过", "伤心", "想哭", "不开心", "沮丧", "郁闷", "委屈", "好烦", "很烦", "烦死"], valence: -12, arousal: 4, affinity: 4 },
  { type: "担忧", words: ["担心", "焦虑", "紧张", "害怕", "好怕", "很怕", "不安", "压力好大"], valence: -8, arousal: 8, affinity: 4 },
  { type: "思念", words: ["好想你", "想你", "想你了", "孤独", "寂寞", "一个人"], valence: -3, arousal: 2, affinity: 5 },
  { type: "高兴", words: ["开心", "高兴", "太好了", "哈哈", "嘻嘻", "兴奋", "超棒", "真棒", "好耶"], valence: 15, arousal: 12, affinity: 2 },
  { type: "疲惫", words: ["好累", "太累", "累了", "累死", "疲惫", "困了", "好困", "没力气", "精疲力尽"], valence: -6, arousal: -12, affinity: 2 },
  { type: "好奇", words: ["为什么", "怎么办", "能告诉我", "好奇", "想知道"], valence: 3, arousal: 6, affinity: 1 },
  { type: "惊讶", words: ["真的吗", "不会吧", "震惊", "竟然", "没想到", "天哪", "哇塞"], valence: 4, arousal: 10, affinity: 1 },
];

/** 最长情感词优先匹配（如「好累」先于「累」），提升命中精确度 */
const SORTED_WORDS: { word: string; rule: MoodRule }[] = MOOD_RULES.flatMap((rule) =>
  rule.words.map((word) => ({ word, rule })),
).sort((a, b) => b.word.length - a.word.length);

/**
 * 更新角色情绪：先向基线自然回归（模拟时间流逝），再按用户输入做情感分析并调整。
 * 返回新状态（不原地修改 prev）。
 */
export function updateEmotion(prev: EmotionState, userText: string): EmotionState {
  // 1. 自然衰减：情绪向基线回归
  let valence = prev.valence + (EMOTION_BASELINE.valence - prev.valence) * prev.decayRate;
  let arousal = prev.arousal + (EMOTION_BASELINE.arousal - prev.arousal) * prev.decayRate;
  let affinity = prev.affinity;

  // 2. 情感分析：命中情绪词最多的规则主导（并列时规则表序优先）
  let primary: EmotionType = "平静";
  let matched = false;
  let best: MoodRule | null = null;
  let bestHits = 0;
  for (const { word, rule } of SORTED_WORDS) {
    if (!userText.includes(word)) continue;
    const hits = (userText.match(new RegExp(word, "g")) ?? []).length;
    if (hits > bestHits) {
      best = rule;
      bestHits = hits;
    }
  }
  if (best) {
    const times = Math.min(bestHits, 2);
    valence += best.valence * times;
    arousal += best.arousal * times;
    affinity += best.affinity;
    primary = best.type;
    matched = true;
  }

  return {
    roleId: prev.roleId,
    valence: clamp(Math.round(valence)),
    arousal: clamp(Math.round(arousal)),
    primary: matched ? primary : "平静",
    decayRate: prev.decayRate,
    affinity: clamp(Math.round(affinity)),
  };
}

/** 情绪 → 中文描述（注入 system prompt「当前状态」） */
export function emotionTextOf(e: EmotionState): string {
  if (e.primary !== "平静") {
    return `${e.primary}（愉悦度 ${e.valence}，活力 ${e.arousal}）`;
  }
  if (e.valence >= 75) return `心情不错（愉悦度 ${e.valence}）`;
  if (e.valence <= 40) return `有点低沉（愉悦度 ${e.valence}）`;
  if (e.arousal >= 65) return `平静中带着点兴奋（活力 ${e.arousal}）`;
  return `平静而放松（愉悦度 ${e.valence}，活力 ${e.arousal}）`;
}

/** 亲密度 → 关系阶段描述（注入 system prompt「当前状态」） */
export function affinityTextOf(affinity: number): string {
  if (affinity >= 75) return "很亲近的老朋友，可以敞开心扉";
  if (affinity >= 55) return "熟悉的旅人，渐渐有了默契";
  if (affinity >= 35) return "有点眼熟的同行者，正在慢慢熟悉";
  return "刚认识的旅人，礼貌而好奇";
}
