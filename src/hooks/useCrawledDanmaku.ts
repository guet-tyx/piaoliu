"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/stores/player";
import { useDanmakuStore } from "@/stores/danmaku";

/**
 * 爬取历史弹幕注入（真实弹幕/评论填充）：
 * - 播放的曲目在爬取弹幕池（public/data/crawled-danmaku.json，按曲目 id 分组）中时，
 *   每 INJECT_INTERVAL_MS 注入 1 条历史弹幕到 danmaku store，与同船实时弹幕共存
 *   （直接 push，不经过 publishDanmaku 发布链路；不标 system，不影响首页 Hero 弹幕带）；
 * - 每轮取 INJECT_ROUND 条洗牌播放，耗尽后重新洗牌再来一轮（长期播放保持弹幕氛围）；
 * - 暂停 / 切歌 / 关弹幕开关时停止并清空队列（与 useTrackDanmaku 的 clear 语义一致）。
 */
const INJECT_INTERVAL_MS = 4_000;
const INJECT_ROUND = 40;

/** 弹幕池缓存（模块级：全站只 fetch 一次；加载失败静默降级为空池） */
let poolCache: Record<string, string[]> | null = null;

async function loadDanmakuPool(): Promise<Record<string, string[]>> {
  if (poolCache) return poolCache;
  try {
    const res = await fetch("/data/crawled-danmaku.json");
    if (!res.ok) return (poolCache = {});
    poolCache = (await res.json()) as Record<string, string[]>;
  } catch {
    poolCache = {};
  }
  return poolCache;
}

/** Fisher–Yates 洗牌（不修改原数组） */
function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function genId(): string {
  return `dm-crawled-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useCrawledDanmaku() {
  const tracks = usePlayerStore((s) => s.tracks);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const danmakuOn = usePlayerStore((s) => s.danmakuOn);
  const push = useDanmakuStore((s) => s.push);

  const queueRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const trackId = tracks[currentIndex]?.id ?? null;

  useEffect(() => {
    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      queueRef.current = [];
    };

    // 停止条件：暂停 / 弹幕关闭 / 无曲目
    if (!danmakuOn || !isPlaying || !trackId) {
      stop();
      return;
    }

    let alive = true;
    // 初始化本轮队列（切歌后队列为空；池加载失败/无该曲弹幕则保持空）
    void (async () => {
      const pool = await loadDanmakuPool();
      if (!alive) return;
      const list = pool[trackId] ?? [];
      if (list.length === 0) {
        stop();
        return;
      }
      if (queueRef.current.length === 0) {
        queueRef.current = shuffle(list).slice(0, INJECT_ROUND);
      }
    })();

    // 注入定时器（单实例）
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        const next = queueRef.current.shift();
        if (!next) {
          // 本轮耗尽：同曲继续播放则重洗一轮（切歌时 effect 已 stop 清空）
          const currentTrack =
            usePlayerStore.getState().tracks[usePlayerStore.getState().currentIndex]?.id;
          if (currentTrack === trackId) {
            void (async () => {
              const pool = await loadDanmakuPool();
              queueRef.current = shuffle(pool[trackId] ?? []).slice(0, INJECT_ROUND);
            })();
          }
          return;
        }
        push({ id: genId(), text: next, trackId: trackId!, at: Date.now() });
      }, INJECT_INTERVAL_MS);
    }

    return () => {
      alive = false;
      stop();
    };
  }, [isPlaying, danmakuOn, trackId, push]);

  return null;
}
