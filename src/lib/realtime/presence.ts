import { getPeerId } from "./danmakuChannel";
import type { PresencePeer } from "./types";

/**
 * 同船在线心跳（FR-10.1）：
 * - 本地模拟：每 15s 写 localStorage("drift-presence") 心跳（仅播放中）；
 *   storage 事件跨标签页联动 + 30s 轮询兜底；60s 无心跳视为离线
 * - 真实模式：listeners 表 upsert + Realtime（003_realtime.sql 预留）
 */

const PRESENCE_KEY = "drift-presence";
const HEARTBEAT_MS = 15_000;
const STALE_MS = 60_000;
const POLL_MS = 30_000;

function readPeers(): PresencePeer[] {
  try {
    const raw = localStorage.getItem(PRESENCE_KEY);
    return raw ? (JSON.parse(raw) as PresencePeer[]) : [];
  } catch {
    return [];
  }
}

function writePeers(peers: PresencePeer[]) {
  try {
    localStorage.setItem(PRESENCE_KEY, JSON.stringify(peers));
  } catch {
    // 隐私模式等场景忽略写入失败
  }
}

/** 过滤 60s 内无心跳的离线者 */
function prunePeers(peers: PresencePeer[]): PresencePeer[] {
  const cutoff = Date.now() - STALE_MS;
  return peers.filter((p) => p.at >= cutoff);
}

/**
 * 心跳循环：播放中每 15s 更新自己的在线状态（曲目随播放器变化）；
 * 返回停止函数（cleanup 释放 interval）
 */
export function startHeartbeat(
  getTrackId: () => string | null,
  getPlaying: () => boolean,
): () => void {
  const beat = () => {
    if (!getPlaying()) return;
    const trackId = getTrackId();
    if (!trackId) return;
    const peers = prunePeers(readPeers());
    const self = peers.find((p) => p.id === getPeerId());
    if (self) {
      self.trackId = trackId;
      self.at = Date.now();
    } else {
      peers.push({ id: getPeerId(), trackId, at: Date.now() });
    }
    writePeers(peers);
  };
  beat();
  const timer = window.setInterval(beat, HEARTBEAT_MS);
  return () => window.clearInterval(timer);
}

/**
 * 订阅某曲目的同船在线者（排除自己）；
 * storage 事件（其他标签页心跳变化）+ 30s 轮询兜底；
 * 返回取消函数
 */
export function subscribePresence(
  trackId: string,
  cb: (peers: PresencePeer[]) => void,
): () => void {
  const emit = () => {
    cb(
      prunePeers(readPeers()).filter(
        (p) => p.trackId === trackId && p.id !== getPeerId(),
      ),
    );
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === PRESENCE_KEY) emit();
  };
  window.addEventListener("storage", onStorage);
  emit();
  const poll = window.setInterval(emit, POLL_MS);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.clearInterval(poll);
  };
}
