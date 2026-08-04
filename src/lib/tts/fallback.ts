/**
 * Web Speech API 兜底音色参数（2026-08-04）：
 * 未配置 MiMo key 时，用浏览器 speechSynthesis（zh-CN）朗读，
 * 通过 pitch/rate 微调让 4 位角色听感有所区分（近似音色，非 MiMo 精调）。
 * 纯函数，node 可单测。
 */

import { DEFAULT_ROLE_ID } from "@/data/roles";

export interface FallbackVoiceParams {
  lang: string;
  pitch: number;
  rate: number;
}

/** 各角色兜底参数：pitch 音调 / rate 语速（汐轻声慢、流明平缓、朔空低沉男声快、悠空灵缓） */
const PARAMS: Record<string, FallbackVoiceParams> = {
  sio: { lang: "zh-CN", pitch: 1.05, rate: 0.95 },
  lumen: { lang: "zh-CN", pitch: 0.95, rate: 0.92 },
  // 朔空是夜航 DJ 男声：低 pitch 显男低音，rate 快保持元气话痨（与 MiMo 预置「苏打」听感方向一致）
  soku: { lang: "zh-CN", pitch: 0.85, rate: 1.08 },
  yoe: { lang: "zh-CN", pitch: 0.9, rate: 0.85 },
};

/** 未知角色兜底（对齐 personaOf：默认汐，统一走 roles.ts） */
const DEFAULT_PARAMS: FallbackVoiceParams = PARAMS[DEFAULT_ROLE_ID];

export function fallbackVoiceParams(roleId: string): FallbackVoiceParams {
  return PARAMS[roleId] ?? DEFAULT_PARAMS;
}
