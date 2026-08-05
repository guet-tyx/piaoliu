import type { Metadata } from "next";
import { CoListenRoomList } from "@/components/drift/CoListenRoomList";

export const metadata: Metadata = {
  title: "星海共听 · 漂流 DRIFT",
  description: "和船客们一起听同一首歌——房间内匿名弹幕，同步播放。",
};

/** 星海共听房间列表（P2） */
export default function CoListenListRoute() {
  return <CoListenRoomList />;
}