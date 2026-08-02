import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseReady } from "@/lib/supabase/anon";
import { randomAnonMark } from "@/data/anon-marks";
import type { Sailor } from "@/types/social";

/** 本地游客 id（本地模拟池的身份标识） */
export const GUEST_ID = "local-guest";
/** 系统预热瓶署名（冷启动内容投放） */
export const SYSTEM_ID = "system";

const SAILOR_KEY = "drift-sailor";

function readLocal(): Sailor | null {
  try {
    const raw = localStorage.getItem(SAILOR_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Sailor;
    if (typeof s.anonMark !== "string") return null;
    return s;
  } catch {
    return null;
  }
}

function writeLocal(s: Sailor) {
  try {
    localStorage.setItem(SAILOR_KEY, JSON.stringify(s));
  } catch {
    // 隐私模式等场景忽略写入失败
  }
}

/**
 * 获取（或创建）星尘船员证（FR-9）：
 * 本地模式 → localStorage 持久化匿名代号；真实模式 → 匿名 session + get_or_create_sailor RPC
 */
export async function getOrCreateSailor(): Promise<Sailor | null> {
  if (!isSupabaseReady()) {
    const existing = readLocal();
    if (existing) return existing;
    const sailor: Sailor = {
      id: GUEST_ID,
      anonMark: randomAnonMark(),
      bottleStyle: "paper",
      nickname: null,
      bondValue: 0,
      level: 1,
      createdAt: Date.now(),
    };
    writeLocal(sailor);
    return sailor;
  }

  const sb = getSupabase();
  if (!sb) return null;
  const { data: row, error } = await sb.rpc("get_or_create_sailor");
  if (error || !row) return null;
  // snake_case 行 → camelCase 模型
  return {
    id: row.id as string,
    anonMark: row.anon_mark as string,
    bottleStyle: row.bottle_style as string,
    nickname: (row.nickname as string | null) ?? null,
    bondValue: (row.bond_value as number) ?? 0,
    level: (row.level as number) ?? 1,
    createdAt: Date.parse(row.created_at as string),
  };
}

/** 本地游客船员证（同步版，供 UI 初始渲染兜底） */
export function getLocalSailorSync(): Sailor | null {
  return readLocal();
}
