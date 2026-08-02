import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseReady } from "@/lib/supabase/anon";
import { isSafeText } from "@/lib/api/moderation";
import type { DanmakuMessage } from "./types";

/**
 * 同船弹幕通道（FR-10.2 / FR-11）：
 * - 本地模拟：BroadcastChannel("drift-dm:<trackId>") 跨标签页广播（双标签 = 双船客演示）
 * - 真实模式：Supabase Realtime broadcast 频道 danmaku:<trackId>（联调后启用）
 * 订阅返回取消函数（close channel + 全量解绑，STYLE_GUIDE 清理铁律）
 */

type DanmakuListener = (msg: DanmakuMessage) => void;

/** 本标签页订阅者（按曲目频道分组，隔离不同曲目的弹幕） */
const localListeners = new Map<string, Set<DanmakuListener>>();

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
  if (!msg.trackId) return;
  localListeners.get(msg.trackId)?.forEach((cb) => cb(msg));
}

/** 订阅某曲目的同船弹幕 */
export function subscribeDanmaku(trackId: string, cb: DanmakuListener): () => void {
  let set = localListeners.get(trackId);
  if (!set) {
    set = new Set();
    localListeners.set(trackId, set);
  }
  set.add(cb);

  let bc: BroadcastChannel | null = null;
  let sbChannel: ReturnType<NonNullable<ReturnType<typeof getSupabase>>["channel"]> | null =
    null;

  if (isSupabaseReady()) {
    const sb = getSupabase();
    if (sb) {
      sbChannel = sb
        .channel(`danmaku:${trackId}`)
        .on("broadcast", { event: "danmaku" }, (payload) => {
          cb(payload.payload as DanmakuMessage);
        })
        .subscribe();
    }
  } else if (typeof BroadcastChannel !== "undefined") {
    bc = new BroadcastChannel(`drift-dm:${trackId}`);
    bc.onmessage = (e: MessageEvent) => {
      const msg = e.data as DanmakuMessage;
      // 忽略自己广播的回显（本地已通过 notifyLocal 显示，避免同页重复）
      if (msg.peerId === getPeerId()) return;
      cb(msg);
    };
  }

  return () => {
    set?.delete(cb);
    if (set?.size === 0) localListeners.delete(trackId);
    bc?.close();
    if (sbChannel) getSupabase()?.removeChannel(sbChannel);
  };
}

/** 发布同船弹幕（10-50 字 + 敏感词拦截）；成功返回 true */
export function publishDanmaku(trackId: string, text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 1 || trimmed.length > 50) return false;
  if (!isSafeText(trimmed).ok) return false;

  const msg: DanmakuMessage = {
    id: genId(),
    text: trimmed,
    trackId,
    peerId: getPeerId(),
    at: Date.now(),
  };

  // 本标签页立即显示
  notifyLocal(msg);

  // 广播给其他标签页 / 真实模式 Realtime
  if (isSupabaseReady()) {
    getSupabase()
      ?.channel(`danmaku:${trackId}`)
      .send({ type: "broadcast", event: "danmaku", payload: msg });
  } else if (typeof BroadcastChannel !== "undefined") {
    const bc = new BroadcastChannel(`drift-dm:${trackId}`);
    bc.postMessage(msg);
    bc.close();
  }
  return true;
}
