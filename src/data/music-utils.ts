import { TRACKS } from "@/data/tracks";
import type { Playlist, Track } from "@/types/music";

/** 按 id 查曲目（无则 undefined） */
export function trackById(id: string): Track | undefined {
  return TRACKS.find((t) => t.id === id);
}

/** 歌单曲目（按 trackIds 顺序展开，缺失 id 直接跳过） */
export function playlistTracks(playlist: Playlist): Track[] {
  return playlist.trackIds
    .map((id) => trackById(id))
    .filter((t): t is Track => Boolean(t));
}

/** 歌单曲目数量（跟踪真实解析结果，不依赖 trackCount 字段） */
export function playlistTrackCount(playlist: Playlist): number {
  return playlistTracks(playlist).length;
}

/** 歌单总时长（秒）——按曲目 duration 求和（用于详情页「xx 首 · xx 分钟」） */
export function playlistTotalDuration(playlist: Playlist): number {
  return playlistTracks(playlist).reduce((sum, t) => sum + (t.duration || 0), 0);
}

/** 秒 → "5:32" 展示格式 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** 秒 → "约 42 分钟" */
export function formatMinutes(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 分钟";
  return `约 ${Math.round(seconds / 60)} 分钟`;
}