import type { Metadata } from "next";
import { TRACKS } from "@/data/tracks";
import { SongWallPage } from "@/components/song/SongWallPage";

interface SongRouteProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: SongRouteProps): Promise<Metadata> {
  const { id } = await params;
  const track = TRACKS.find((t) => t.id === id) ?? TRACKS.find((t) => t.t === id);
  return {
    title: track ? `${track.t} · 漂流留言墙` : "漂流留言墙 · 漂流 DRIFT",
    description: track ? `「${track.t}」的漂流留言墙——听过这首歌的船客留下的匿名感想。` : undefined,
  };
}

/**
 * 歌曲留言墙（P1 F-02）：/song/[id]
 * 曲目在服务端查曲库（id 优先，旧快照无 id 时按曲名兜底）；
 * 找不到交给客户端展示「这首歌暂时不在星海中」。
 */
export default async function SongWallRoute({ params }: SongRouteProps) {
  const { id } = await params;
  const track = TRACKS.find((t) => t.id === id) ?? TRACKS.find((t) => t.t === id);
  return <SongWallPage track={track ?? null} />;
}
