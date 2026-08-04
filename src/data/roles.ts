/**
 * 角色注册（V2.7 收敛）：4 位星海守望者的 id 与「未知角色兜底」集中声明，
 * 供 personaOf / TTS 音色 / Web Speech 参数等多处统一引用，避免各处各自记住「默认汐」。
 */

/** 4 位星海守望者角色 id（数据池完整性校验与兜底对齐用） */
export const ROLE_IDS = ["sio", "lumen", "soku", "yoe"] as const;
export type RoleId = (typeof ROLE_IDS)[number];

/** 未知角色兜底：统一默认汐（与 personaOf / fallbackVoiceParams / TTS 路由契约对齐） */
export const DEFAULT_ROLE_ID = "sio";
