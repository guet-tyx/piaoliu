import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "./fetchWithTimeout";

/** 造一个「等待 signal abort 才拒绝」的 fetch 桩（模拟真实 fetch 在 abort 时拒绝；已 aborted 立即拒绝） */
function abortableFetchMock(): ReturnType<typeof vi.fn> {
  return vi.fn(
    (_url: unknown, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        const sig = init.signal;
        if (sig?.aborted) {
          reject(new DOMException("aborted", "AbortError"));
          return;
        }
        sig?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      }),
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("fetchWithTimeout", () => {
  it("超时触发 abort（fetch 未完成时取消请求）", async () => {
    vi.useFakeTimers();
    const fetchMock = abortableFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    const p = fetchWithTimeout("http://x", {}, 1000);
    vi.advanceTimersByTime(1001);

    await expect(p).rejects.toThrow("aborted");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("请求在超时前完成则正常返回响应", async () => {
    const res = new Response("ok");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res));
    await expect(fetchWithTimeout("http://x", {}, 1000)).resolves.toBe(res);
  });

  it("调用方 signal abort 会取消请求（联动）", async () => {
    const fetchMock = abortableFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const p = fetchWithTimeout("http://x", { signal: controller.signal }, 60_000);
    controller.abort();
    await expect(p).rejects.toThrow("aborted");
  });

  it("调用方 signal 已 aborted 时立即取消", async () => {
    const fetchMock = abortableFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    controller.abort();
    const p = fetchWithTimeout("http://x", { signal: controller.signal }, 60_000);
    await expect(p).rejects.toThrow("aborted");
  });
});
