"use client";

import { create } from "zustand";
import { personaOf } from "@/data/chat-personas";
import { ttsTextOf } from "@/lib/tts/clean";
import { createLruCache } from "@/lib/tts/cache";
import { fallbackVoiceParams } from "@/lib/tts/fallback";
import { fetchWithTimeout } from "@/lib/net/fetchWithTimeout";
import { MAX_TTS_TEXT, TTS_CACHE_MAX } from "@/lib/chat/limits";

/**
 * TTS 朗读播放（2026-08-04）：
 * - 模块级单例 <audio>：全站同一时刻只允许一个播放实例（聊天朗读与电台主持语音共用），
 *   再次 speak 自动停止前一条（PRD §4.1/异常处理「多条同时播放」）；
 * - 音频按「清洗后文本|音色ID」内容缓存（LRU max 50，刷新即清），
 *   同一消息重复点击 / 重复主持台词不重复调用 MiMo（PRD §3.3）；
 * - MiMo 不可用（未配 key / 503 / 网络失败）自动降级为浏览器 Web Speech（speechSynthesis），
 *   按角色 pitch/rate 微调；错误 3s 自动恢复（PRD §4.3）。
 */

export interface TtsState {  /** MiMo 可用性（null=未探测；false=已降级 Web Speech） */
  available: boolean | null;
  /** 加载中的朗读 key（聊天=消息 id；电台=host:<bubbleKey>） */
  loadingKey: string | null;
  /** 播放中的朗读 key */
  playingKey: string | null;
  /** 出错的朗读 key（3s 自动恢复） */
  errorKey: string | null;
  errorText: string | null;
  /** 播放进度（秒/总时长；Web Speech 兜底无进度，duration=0） */
  progress: number;
  duration: number;
  probe: () => Promise<void>;
  /** 朗读指定内容；key 标识来源（同 key 再点 = 停止） */
  speak: (key: string, text: string, roleId: string) => Promise<void>;
  stop: () => void;
}

/** 模块级单例音频元素（惰性创建，SSR 安全） */
let audio: HTMLAudioElement | null = null;
/** 音频内容缓存：key=「清洗后文本|音色ID」→ Blob URL（淘汰时 revoke 释放） */
const cache = createLruCache<string, string>(TTS_CACHE_MAX, (url) => {
  try {
    URL.revokeObjectURL(url);
  } catch {
    // 忽略释放失败
  }
});
/** 错误 3s 自动恢复计时器 */
let errorTimer: ReturnType<typeof setTimeout> | null = null;

/** 朗读请求递增序号：旧请求晚到时凭序号丢弃（修复「旧请求覆盖新请求」竞态） */
let speakSeq = 0;
/** 进行中的 TTS fetch（stop / 新 speak 时 abort，防止 in-flight 响应晚到播放） */
let activeFetch: AbortController | null = null;

/** TTS fetch 首字节超时（合成偶发慢；超过则视为失败走兜底） */
const TTS_FETCH_TIMEOUT_MS = 30_000;

function scheduleErrorReset(key: string) {
  if (errorTimer) clearTimeout(errorTimer);
  errorTimer = setTimeout(() => {
    errorTimer = null;
    const s = useTtsStore.getState();
    if (s.errorKey === key) {
      useTtsStore.setState({ errorKey: null, errorText: null });
    }
  }, 3000);
}

export const useTtsStore = create<TtsState>()((set, get) => {
  /** 用 Audio 播放 Blob URL（MiMo 路径） */
  const playUrl = (key: string, url: string) => {
    if (!audio) audio = new Audio();
    audio.src = url;
    audio.onended = () => {
      set({ playingKey: null, progress: 0, duration: 0 });
    };
    audio.ontimeupdate = () => {
      if (!audio) return;
      set({ progress: audio.currentTime, duration: audio.duration || 0 });
    };
    audio.onerror = () => {
      set({ playingKey: null, errorKey: key, errorText: "语音加载失败" });
      scheduleErrorReset(key);
    };
    set({ playingKey: key, loadingKey: null, progress: 0, duration: 0 });
    audio.play().catch(() => {
      // 浏览器自动播放策略拦截（异步 fetch 后播放可能被拒）
      set({
        playingKey: null,
        errorKey: key,
        errorText: "音频播放被拦截，点击页面任意位置后重试",
      });
      scheduleErrorReset(key);
    });
  };

  /** 浏览器 Web Speech 兜底（MiMo 不可用时） */
  const speakFallback = (key: string, text: string, roleId: string) => {
    if (typeof speechSynthesis === "undefined") {
      set({ errorKey: key, errorText: "语音功能暂不可用" });
      scheduleErrorReset(key);
      return;
    }
    const params = fallbackVoiceParams(roleId);
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = params.lang;
    utter.pitch = params.pitch;
    utter.rate = params.rate;
    utter.onend = () => set({ playingKey: null, progress: 0, duration: 0 });
    utter.onerror = () => {
      set({ playingKey: null, errorKey: key, errorText: "语音播放失败" });
      scheduleErrorReset(key);
    };
    set({ playingKey: key, loadingKey: null, progress: 0, duration: 0 });
    speechSynthesis.speak(utter);
  };

  return {
    available: null,
    loadingKey: null,
    playingKey: null,
    errorKey: null,
    errorText: null,
    progress: 0,
    duration: 0,

    probe: async () => {
      try {
        const res = await fetchWithTimeout("/api/chat/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ probe: true }),
        });
        set({ available: res.ok });
      } catch {
        set({ available: false });
      }
    },

    speak: async (key, text, roleId) => {
      const clean = ttsTextOf(text);
      if (!clean || clean.length > MAX_TTS_TEXT) return;
      const s = get();
      // 同一条再次点击 = 停止
      if (s.playingKey === key || s.loadingKey === key) {
        get().stop();
        return;
      }
      // 一次只允许一条：停掉任何进行中的播放/请求
      get().stop();

      const seq = ++speakSeq;
      const voicePrompt = personaOf(roleId).voicePrompt;
      const cacheKey = `${clean}|${voicePrompt}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        playUrl(key, cached);
        return;
      }

      set({ loadingKey: key, errorKey: null, errorText: null });
      const controller = new AbortController();
      activeFetch = controller;
      try {
        const res = await fetchWithTimeout(
          "/api/chat/tts",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roleId, text: clean }),
            signal: controller.signal,
          },
          TTS_FETCH_TIMEOUT_MS,
        );
        if (seq !== speakSeq) return; // 期间已被新的 speak/stop 取代：丢弃
        if (res.status === 503) {
          // 未配 key / 全部模型失败 → 降级浏览器语音
          set({ available: false, loadingKey: null });
          speakFallback(key, clean, roleId);
          return;
        }
        if (!res.ok) {
          // 400 bad-word/too-long 等：文本本身有问题，不做兜底
          set({ loadingKey: null, errorKey: key, errorText: "语音加载失败" });
          scheduleErrorReset(key);
          return;
        }
        set({ available: true });
        const blob = await res.blob();
        if (seq !== speakSeq) return; // blob 解析期间被取代：丢弃
        const url = URL.createObjectURL(blob);
        cache.set(cacheKey, url);
        if (seq !== speakSeq) {
          URL.revokeObjectURL(url); // 已被取代：不播放，释放刚创建的 URL
          return;
        }
        playUrl(key, url);
      } catch {
        if (seq !== speakSeq) return; // 被取代后的 abort 错误：不降级不报错
        // 网络异常 → 浏览器语音兜底
        set({ available: false, loadingKey: null });
        speakFallback(key, clean, roleId);
      } finally {
        if (activeFetch === controller) activeFetch = null;
      }
    },

    stop: () => {
      // 使所有 in-flight speak 失效并中止其 fetch（旧请求晚到不播放）
      speakSeq += 1;
      activeFetch?.abort();
      activeFetch = null;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      if (typeof speechSynthesis !== "undefined") {
        speechSynthesis.cancel();
      }
      if (errorTimer) {
        clearTimeout(errorTimer);
        errorTimer = null;
      }
      set({
        playingKey: null,
        loadingKey: null,
        errorKey: null,
        errorText: null,
        progress: 0,
        duration: 0,
      });
    },
  };
});
