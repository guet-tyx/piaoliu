import type { Metadata } from "next";
import { DriftPage } from "@/components/drift/DriftPage";

export const metadata: Metadata = {
  title: "漂流广场 · 漂流 DRIFT",
  description: "星海里的公开漂流瓶广场——浏览、点赞、收藏最近漂过的所有公开船。",
};

/**
 * 漂流广场（P0 F-01）：公开漂流瓶浏览页。
 * 数据在客户端组装（本地池/真实 RPC），页面仅做壳。
 */
export default function DriftRoutePage() {
  return <DriftPage />;
}
