import { getSupabase } from "./client";

/**
 * Supabase 是否已配置（env 就绪即可用真实后端；否则全站走本地模拟池）
 */
export function isSupabaseReady(): boolean {
  return getSupabase() !== null;
}

/**
 * 匿名身份引导（FR-9 零注册身份底座）：
 * 已有 session 则跳过；无 session 时 signInAnonymously 静默创建（失败不阻塞，本地模式继续）。
 * 返回取消订阅函数，调用方在 effect cleanup 中释放（STYLE_GUIDE 清理铁律）。
 */
export function ensureAnonSession(): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};

  const { data } = sb.auth.onAuthStateChange(() => {
    // 身份变化（登录/刷新）由 identity store 的订阅消费；此处仅保持通道存活
  });

  // 幂等：仅当确实无 session 时发起匿名登录
  sb.auth
    .getSession()
    .then(({ data: { session } }) => {
      if (!session) {
        sb.auth.signInAnonymously().catch(() => {
          // 匿名登录失败（网络/风控）→ 静默降级为本地模式
        });
      }
    })
    .catch(() => {});

  return () => {
    data.subscription.unsubscribe();
  };
}
