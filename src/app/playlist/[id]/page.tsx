import type { Metadata } from "next";
import { PLAYLISTS } from "@/data/playlists";
import { PlaylistDetailPage } from "@/components/playlist/PlaylistDetailPage";
import { UgcPlaylistFallback } from "@/components/playlist/UgcPlaylistFallback";

interface PlaylistRouteProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PlaylistRouteProps): Promise<Metadata> {
  const { id } = await params;
  const playlist = PLAYLISTS.find((p) => p.id === id);
  if (!playlist) return { title: "漂流 DRIFT · 歌单不存在" };
  return {
    title: `${playlist.name} · 星海歌单`,
    description: playlist.desc,
  };
}

/**
 * 歌单详情页（P1-03 + P2-02）：
 * 官方歌单走服务端直渲（metadata/SEO 友好）；
 * 官方查不到时交给客户端 UgcPlaylistFallback（自建歌单在 localStorage，
 * 命中复用 PlaylistDetailPage，未命中 notFound()）。
 */
export default async function PlaylistRoutePage({ params }: PlaylistRouteProps) {
  const { id } = await params;
  const playlist = PLAYLISTS.find((p) => p.id === id);
  if (playlist) {
    return <PlaylistDetailPage playlist={playlist} />;
  }
  // UGC 歌单：不在此处 notFound，由客户端兜底判断
  return <UgcPlaylistFallback id={id} />;
}