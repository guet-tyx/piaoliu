import type { Metadata } from "next";
import { PlaylistSquare } from "@/components/playlist/PlaylistSquare";

export const metadata: Metadata = {
  title: "歌单广场 · 星海歌单",
  description: "风格 / 场景 / 情绪筛选，6 张官方航线任你挑。",
};

/** 歌单广场（P1-04）：/playlist，薄路由模式 */
export default function PlaylistSquarePage() {
  return <PlaylistSquare />;
}
