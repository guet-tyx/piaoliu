import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseReady } from "@/lib/supabase/anon";
import { getPeerId } from "./danmakuChannel";
import type { CoListenMessage } from "@/types/colisten";

/**
 * 星海共听房间通道（P2）：colisten:<roomId> 广播
 * - 真实模式：Supabase Realtime broadcast 频道
 * - 本地模拟：BroadcastChannel("drift-colisten:<roomId>") 跨标签页
 * 弹幕/播放状态/投票/离开均走此通道；房间内可见，不持久化。
 */

type ColistenListener = (msg: CoListenMessage) => void;
type SbChannel = ReturnType<NonNullable<ReturnType<typeof getSupabase>>["channel"]>;

/** 本标签页订阅者（按房间分组） */
const localListeners = new Map<string, Set<ColistenListener>>();
/** 真实模式发布频道缓存 */
const sbChannels = new Map<string, SbChannel>();

/** 本标签页房间会话标识（与全局弹幕 peerId 同源，房间内身份一致） */
export { getPeerId };

/** 通知本标签页同房间的订阅者（自己发弹幕也要显示，BroadcastChannel 不回显） */
function notifyLocal(msg: CoListenMessage) {
  localListeners.get(msg.roomId)?.forEach((cb) => cb(msg));
}

/** 订阅某房间的共听消息；返回取消函数 */
export function subscribeColisten(roomId: string, cb: ColistenListener): () => void {
  let set = localListeners.get(roomId);
  if (!set) {
    set = new Set();
    localListeners.set(roomId, set);
  }
  set.add(cb);

  let bc: BroadcastChannel | null = null;
  let sbChannel: SbChannel | null = null;

  if (isSupabaseReady()) {
    const sb = getSupabase();
    if (sb) {
      sbChannel = sb
        .channel(`colisten:${roomId}`)
        .on("broadcast", { event: "message" }, (payload) => {
          const msg = payload.payload as CoListenMessage;
          if (msg.peerId === getPeerId()) return; // 忽略 Realtime 回显
          cb(msg);
        })
        .subscribe();
      sbChannels.set(roomId, sbChannel);
    }
  } else if (typeof BroadcastChannel !== "undefined") {
    bc = new BroadcastChannel(`drift-colisten:${roomId}`);
    bc.onmessage = (e: MessageEvent) => {
      const msg = e.data as CoListenMessage;
      if (msg.peerId === getPeerId()) return; // 忽略自身回显
      cb(msg);
    };
  }

  return () => {
    set.delete(cb);
    if (set.size === 0) localListeners.delete(roomId);
    sbChannel?.unsubscribe();
    sbChannels.delete(roomId);
    bc?.close();
  };
}

/** 发布房间消息（peerId 由调用方携带：真实成员传 getPeerId()，幽灵传自己的 ghost peerId） */
export function publishColisten(msg: CoListenMessage): void {
  notifyLocal(msg);

  if (isSupabaseReady()) {
    let ch = sbChannels.get(msg.roomId);
    if (!ch) {
      const sb = getSupabase();
      if (!sb) return;
      ch = sb.channel(`colisten:${msg.roomId}`).subscribe();
      sbChannels.set(msg.roomId, ch);
    }
    ch.send({ type: "broadcast", event: "message", payload: msg });
  } else if (typeof BroadcastChannel !== "undefined") {
    // 仅当已有订阅时才开广播通道（先 subscribe 再发送，避免无端创建）
    if (localListeners.has(msg.roomId)) {
      const bc = new BroadcastChannel(`drift-colisten:${msg.roomId}`);
      bc.postMessage(msg);
      bc.close();
    }
  }
}