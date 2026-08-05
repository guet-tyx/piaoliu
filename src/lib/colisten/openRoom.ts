import { useColistenStore } from "@/stores/colisten";
import type { TrackSnapshot } from "@/types/social";

/**
 * 从歌曲一键开房（P2）：创建房间（推荐歌单）并跳转房间页。
 * 返回是否成功（失败由调用方提示「星海暂时无风」）。
 */
export async function openCoListenRoom(track: TrackSnapshot): Promise<boolean> {
  const roomId = await useColistenStore.getState().create(track);
  if (!roomId) return false;
  window.location.href = `/drift/colisten/${roomId}`;
  return true;
}