/**
 * 带超时的 fetch（V2.7 健壮性加固）：
 * 全站上游/客户端请求统一用它，超时即 Abort，避免「上游卡死 → 永久 loading / 挂起」。
 *
 * 注意：
 * - 超时只作用于「响应首字节」之前（fetch resolve 前）；
 * - SSE 流建立后的「长时间无增量」看门狗由消费方（stores/chat.ts + lib/chat/sse.ts）处理，
 *   因为流可能合法地持续数分钟，不能一刀切总超时。
 */

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * 调用方传入的 signal 与本函数内部超时 AbortController 联动：
 * 任一触发 abort 都会取消本次请求；resolve/reject 后清理监听与计时器。
 */
export function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const initSignal = init.signal;
  const onAbort = () => controller.abort();
  if (initSignal) {
    if (initSignal.aborted) controller.abort();
    else initSignal.addEventListener("abort", onAbort, { once: true });
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timer);
    initSignal?.removeEventListener("abort", onAbort);
  });
}
