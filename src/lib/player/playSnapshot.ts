import { TRACKS } from "@/data/tracks";
import { CHANNELS } from "@/data/channels";
import { usePlayerStore } from "@/stores/player";
import type { Track } from "@/types/music";
import type { TrackSnapshot } from "@/types/social";

/**
 * 播放歌曲快照（P3-02 拾瓶卡 / P0 漂流广场卡共用）：
 * 用快照 id 回查曲库（旧数据无 id 时按曲名匹配）→ 定位所属频道切换到该曲 →
 * 不在任何频道则直接播放当前队列/兜底单曲；播放后平滑滚动到播放器。
 */
export function playTrackSnapshot(snapshot: TrackSnapshot): void {
  const full = resolveTrackFull(snapshot);
  if (!full) return;

  // 找到歌曲所属频道（私人 FM 动态队列除外）
  const ch = CHANNELS.find((c) => c.id !== "ch-fm" && c.trackIds.includes(full.id));
  if (ch) {
    const pool = ch.trackIds
      .map((tid) => TRACKS.find((t) => t.id === tid))
      .filter((t): t is (typeof TRACKS)[number] => Boolean(t));
    const at = pool.findIndex((t) => t.id === full.id);
    usePlayerStore.getState().playQueueAt(pool, { type: "channel", id: ch.id }, Math.max(at, 0));
  } else {
    const st = usePlayerStore.getState();
    const at = st.tracks.findIndex((t) => t.id === full.id);
    if (at >= 0) {
      usePlayerStore.getState().playQueueAt(st.tracks, st.source, at);
    } else {
      usePlayerStore.getState().playQueue([full], { type: "library" });
    }
  }
  document.getElementById("player")?.scrollIntoView({ behavior: "smooth" });
}

/** 快照回查曲库完整曲目（id 优先，旧数据无 id 时按曲名匹配） */
export function resolveTrackFull(snapshot: TrackSnapshot): Track | undefined {
  return snapshot.id
    ? TRACKS.find((t) => t.id === snapshot.id)
    : TRACKS.find((t) => t.t === snapshot.t);
}

/** 快照对应的曲库 id（留言墙跳转用；匹配不到返回 null） */
export function resolveTrackId(snapshot: TrackSnapshot): string | null {
  return resolveTrackFull(snapshot)?.id ?? null;
}