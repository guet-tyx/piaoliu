import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseReady } from "@/lib/supabase/anon";
import { isSafeText } from "@/lib/api/moderation";
import type { DanmakuMessage } from "./types";

/**
 * 同船弹幕通道（FR-10.2 / FR-11 / P3-04 频道隔离）：
 * - 广播粒度 = 电台频道（danmaku:<channelId>），消息携带 channelId + trackId，
 *   显示侧按「频道 + 曲目」双条件过滤——同频道不同曲目的弹幕不互相污染可见区；
 * - 本地模拟：BroadcastChannel("drift-dm:<channelId>") 跨标签页广播
 * - 真实模式：Supabase Realtime broadcast 频道 danmaku:<channelId>
 * 订阅返回取消函数（close channel + 全量解绑，STYLE_GUIDE 清理铁律）
 */

type DanmakuListener = (msg: DanmakuMessage) => void;

type SbChannel = ReturnType<NonNullable<ReturnType<typeof getSupabase>>["channel"]>;

/** 本标签页订阅者（按频道分组，隔离不同频道的弹幕流） */
const localListeners = new Map<string, Set<DanmakuListener>>();
/** 真实模式发布频道缓存（channel 需 subscribe 加入 Realtime socket 后才可 send） */
const sbChannels = new Map<string, SbChannel>();

function genId(): string {
  return `dm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 会话匿名标识（本标签页 = 一位船客；无身份信息，每次会话随机） */
let peerId = "";
export function getPeerId(): string {
  if (!peerId) {
    peerId = `p-${Math.random().toString(36).slice(2, 8)}`;
  }
  return peerId;
}

/** 通知本标签页对应频道的订阅者（自己发的弹幕也要显示，BroadcastChannel 不回显自身） */
function notifyLocal(msg: DanmakuMessage) {
  if (!msg.channelId) return;
  localListeners.get(msg.channelId)?.forEach((cb) => cb(msg));
}

/** 订阅某电台频道的同船弹幕 */
export function subscribeDanmaku(channelId: string, cb: DanmakuListener): () => void {
  let set = localListeners.get(channelId);
  if (!set) {
    set = new Set();
    localListeners.set(channelId, set);
  }
  set.add(cb);

  let bc: BroadcastChannel | null = null;
  let sbChannel: SbChannel | null = null;

  if (isSupabaseReady()) {
    const sb = getSupabase();
    if (sb) {
      sbChannel = sb
        .channel(`danmaku:${channelId}`)
        .on("broadcast", { event: "danmaku" }, (payload) => {
          const msg = payload.payload as DanmakuMessage;
          // 忽略 Realtime 回显的自己消息（本地已通过 notifyLocal 显示，避免同页重复）
          if (msg.peerId === getPeerId()) return;
          cb(msg);
        })
        .subscribe();
    }
  } else if (typeof BroadcastChannel !== "undefined") {
    bc = new BroadcastChannel(`drift-dm:${channelId}`);
    bc.onmessage = (e: MessageEvent) => {
      const msg = e.data as DanmakuMessage;
      // 忽略自己广播的回显（本地已通过 notifyLocal 显示，避免同页重复）
      if (msg.peerId === getPeerId()) return;
      cb(msg);
    };
  }

  return () => {
    set?.delete(cb);
    if (set?.size === 0) localListeners.delete(channelId);
    bc?.close();
    if (sbChannel) getSupabase()?.removeChannel(sbChannel);
  };
}

/** 发布同船弹幕（1-50 字 + 敏感词拦截）；channelId 为空时回退到 trackId 粒度；成功返回 true */
export function publishDanmaku(channelId: string | null, trackId: string, text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 1 || trimmed.length > 50) return false;
  if (!isSafeText(trimmed).ok) return false;

  // 频道 id 兜底：非频道来源（曲库/歌单播放）时用曲目 id 作为隔离 key
  const key = channelId ?? trackId;

  const msg: DanmakuMessage = {
    id: genId(),
    text: trimmed,
    channelId: channelId ?? undefined,
    trackId,
    peerId: getPeerId(),
    at: Date.now(),
  };

  // 本标签页立即显示
  notifyLocal(msg);

  // 广播给其他标签页 / 真实模式 Realtime
  if (isSupabaseReady()) {
    const sb = getSupabase();
    if (sb) {
      let ch = sbChannels.get(key);
      if (!ch) {
        ch = sb.channel(`danmaku:${key}`);
        ch.subscribe();
        sbChannels.set(key, ch);
      }
      ch.send({ type: "broadcast", event: "danmaku", payload: msg });
    }
  } else if (typeof BroadcastChannel !== "undefined") {
    const bc = new BroadcastChannel(`drift-dm:${key}`);
    bc.postMessage(msg);
    bc.close();
  }
  return true;
}
