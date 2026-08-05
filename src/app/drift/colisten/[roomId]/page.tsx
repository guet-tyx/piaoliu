import type { Metadata } from "next";
import { CoListenRoom } from "@/components/drift/CoListenRoom";

interface CoListenRoomRouteProps {
  params: Promise<{ roomId: string }>;
}

export const metadata: Metadata = {
  title: "星海共听房间 · 漂流 DRIFT",
};

/** 星海共听房间页（P2）：/drift/colisten/[roomId] */
export default async function CoListenRoomRoute({ params }: CoListenRoomRouteProps) {
  const { roomId } = await params;
  return <CoListenRoom roomId={roomId} />;
}