import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UseBoundStore, StoreApi } from "zustand";
import type { TtsState } from "@/stores/tts";

/** TTS 播放 store 集成测试（2026-08-04）：
 * mock fetch（/api/chat/tts）+ 假 Audio + 假 speechSynthesis，
 * 验证 MiMo 播放 / 缓存复用 / 停止 / 单实例互斥 / 503 降级 Web Speech / 错误自动恢复。
 * 沿用 chat.summary.test.ts 的 resetModules + 动态 import 范式。
 */

type TtsStoreApi = UseBoundStore<StoreApi<TtsState>>;

/** 全局 stub 控件 */
let playReject = false;
const speechSpeak = vi.fn();
const speechCancel = vi.fn();
let createdUrlCount = 0;

/** 假 Audio：记录实例，play 可配置为拒绝（模拟浏览器拦截/加载失败） */
class FakeAudio {
  static instances: FakeAudio[] = [];
  src = "";
  currentTime = 0;
  duration = 10;
  onended: (() => void) | null = null;
  ontimeupdate: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn(() =>
    playReject ? Promise.reject(new Error("NotAllowedError")) : Promise.resolve(),
  );
  pause = vi.fn();
  load = vi.fn();
  removeAttribute = vi.fn();
  constructor() {
    FakeAudio.instances.push(this);
  }
}

let store: TtsStoreApi;
let fetchMock: ReturnType<typeof vi.fn>;
/** /api/chat/tts 的响应状态（200 = 合成成功；503 = no-key 降级） */
let ttsStatus = 200;

beforeEach(async () => {
  playReject = false;
  ttsStatus = 200;
  createdUrlCount = 0;
  FakeAudio.instances.length = 0;
  speechSpeak.mockClear();
  speechCancel.mockClear();
  vi.resetModules();
  // 只补充 URL.createObjectURL/revokeObjectURL（不替换整个 URL，避免破坏 Node fetch 内部解析）
  const urlStatic = URL as unknown as Record<string, unknown>;
  urlStatic.createObjectURL = vi.fn(() => `blob:mock-${createdUrlCount++}`);
  urlStatic.revokeObjectURL = vi.fn();
  vi.stubGlobal("Audio", FakeAudio as unknown as typeof Audio);
  vi.stubGlobal("speechSynthesis", { speak: speechSpeak, cancel: speechCancel });
  vi.stubGlobal("SpeechSynthesisUtterance", class {
    lang = "";
    pitch = 1;
    rate = 1;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
  } as unknown as typeof SpeechSynthesisUtterance);

  fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    if (url.includes("/api/chat/tts")) {
      const body = JSON.parse(String(init?.body)) as { probe?: boolean };
      if (body.probe) return Response.json({ ok: true }, { status: ttsStatus });
      return new Response(new Uint8Array([0x1f, 0xf3, 0x00]), { status: ttsStatus });
    }
    throw new Error(`unexpected url ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);

  const mod = await import("@/stores/tts");
  store = mod.useTtsStore as TtsStoreApi;
});

afterEach(() => {
  // 还原手动补的 URL 静态方法
  const urlStatic = URL as unknown as Record<string, unknown>;
  delete urlStatic.createObjectURL;
  delete urlStatic.revokeObjectURL;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TTS MiMo 播放", () => {
  it("speak 走 MiMo：fetch 合成 + Audio 播放，状态可用", async () => {
    await store.getState().speak("m1", "你好", "sio");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const audio = FakeAudio.instances[0];
    expect(audio).toBeTruthy();
    expect(audio.play).toHaveBeenCalled();
    expect(audio.src).toBe("blob:mock-0");
    expect(store.getState().playingKey).toBe("m1");
    expect(store.getState().available).toBe(true);
  });

  it("同一内容二次朗读命中缓存，不重复调用 MiMo（PRD §3.3）", async () => {
    await store.getState().speak("m1", "你好", "sio");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await store.getState().speak("m2", "你好", "sio");
    expect(fetchMock).toHaveBeenCalledTimes(1); // 内容缓存命中
    expect(store.getState().playingKey).toBe("m2");
  });

  it("同一消息再次点击 = 停止（PRD §4.1 状态机）", async () => {
    await store.getState().speak("m1", "你好", "sio");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await store.getState().speak("m1", "你好", "sio");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store.getState().playingKey).toBeNull();
  });
});

describe("TTS 单实例互斥与停止", () => {
  it("speak B 自动停止 A（一次只允许一条，PRD 异常处理）", async () => {
    await store.getState().speak("m1", "第一句", "sio");
    const audio = FakeAudio.instances[0];
    await store.getState().speak("m2", "第二句", "sio");
    expect(audio.pause).toHaveBeenCalled(); // 前一条被停
    expect(store.getState().playingKey).toBe("m2");
  });

  it("stop 停止播放并复位全部状态", async () => {
    await store.getState().speak("m1", "你好", "sio");
    const audio = FakeAudio.instances[0];
    store.getState().stop();
    expect(audio.pause).toHaveBeenCalled();
    expect(store.getState().playingKey).toBeNull();
    expect(store.getState().loadingKey).toBeNull();
    expect(store.getState().progress).toBe(0);
  });
});

describe("TTS 降级与错误恢复", () => {
  it("503 no-key → Web Speech 兜底（PRD：未配 key 仍可朗读）", async () => {
    ttsStatus = 503;
    await store.getState().speak("m1", "你好", "sio");
    expect(speechSpeak).toHaveBeenCalledTimes(1);
    expect(store.getState().available).toBe(false);
    expect(store.getState().playingKey).toBe("m1");
  });

  it("网络异常 → Web Speech 兜底", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    await store.getState().speak("m1", "你好", "sio");
    expect(speechSpeak).toHaveBeenCalledTimes(1);
    expect(store.getState().available).toBe(false);
  });

  it("播放被浏览器拦截 → 错误提示 3s 自动恢复（PRD §4.3）", async () => {
    vi.useFakeTimers();
    try {
      playReject = true;
      await store.getState().speak("m1", "你好", "sio");
      expect(store.getState().errorKey).toBe("m1");
      expect(store.getState().errorText).toContain("点击页面任意位置");
      vi.advanceTimersByTime(3000);
      expect(store.getState().errorKey).toBeNull();
      expect(store.getState().errorText).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("TTS probe", () => {
  it("probe 探测 MiMo key 可用性", async () => {
    ttsStatus = 200;
    await store.getState().probe();
    expect(store.getState().available).toBe(true);
    ttsStatus = 503;
    await store.getState().probe();
    expect(store.getState().available).toBe(false);
  });
});
