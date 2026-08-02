import { getSupabase } from "./client";

/**
 * Supabase 是否已配置（env 就绪即可用真实后端；否则全站走本地模拟池）
 */
export function isSupabaseReady(): boolean {
  return getSupabase() !== null;
}

/**
 * 匿名身份引导（FR-9 零注册身份底座）：
 * 等 session 就绪（已有 session，或 signInAnonymously 完成）后 resolve——
 * 消除「身份未建立就调 RPC 被拒 → 首屏误报 offline」的竞态。
 * 返回取消订阅函数（onAuthStateChange），调用方在 effect cleanup 中释放（清理铁律）。
 * 未配置 env 时同步返回空清理，调用方照常走本地模拟。
 */
export async function ensureAnonSession(): Promise<() => void> {
  const sb = getSupabase();
  if (!sb) return () => {};

  const { data } = sb.auth.onAuthStateChange(() => {
    // 身份变化（登录/刷新）由 identity store 的订阅消费；此处仅保持通道存活
  });

  try {
    const {
      data: { session },
    } = await sb.auth.getSession();
    // 幂等：仅当确实无 session 时发起匿名登录
    if (!session) {
      await sb.auth.signInAnonymously(); // 失败抛错 → 走 catch 静默降级
    }
  } catch {
    // 会话获取/匿名登录失败（网络/风控）→ 静默降级为本地模拟模式
  }

  return () => {
    data.subscription.unsubscribe();
  };
}
