import type { Playlist } from "@/types/music";

/**
 * 歌单分享工具（P3-05）：
 * - playlistShareUrl：分享链接
 * - copyShareLink：复制歌单链接到剪贴板（剪贴板 API + execCommand 降级）
 * 分享卡片 canvas 绘制在 ShareCard 组件内（依赖图片异步加载 + useEffect）。
 */

/** 分享链接（本地开发为页面 URL；部署后自动为当前 origin） */
export function playlistShareUrl(id: string): string {
  if (typeof window === "undefined") return `/playlist/${id}`;
  return `${window.location.origin}/playlist/${id}`;
}

/** 复制链接（剪贴板 API，降级 execCommand） */
export async function copyShareLink(id: string): Promise<boolean> {
  const url = playlistShareUrl(id);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    // 剪贴板 API 不可用（非安全上下文/权限）→ execCommand 降级
    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** 分享到聊天的预填文案 */
export function shareToChatText(playlist: Playlist): string {
  return `给你推荐一个歌单《${playlist.name}》～`;
}

/** 分享到聊天跳转链接（URL query 由 ChatPage 读取预填） */
export function shareToChatUrl(roleId: string, playlist: Playlist): string {
  const text = shareToChatText(playlist);
  return `/chat/${roleId}?share=${encodeURIComponent(text)}`;
}