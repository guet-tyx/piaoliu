import { SailorFootprintPage } from "@/components/sailor/SailorFootprintPage";

interface SailorRouteProps {
  params: Promise<{ anonMark: string }>;
}

export const metadata = {
  title: "船客足迹 · 漂流 DRIFT",
};

/**
 * 船客足迹页（P1 F-03）：/sailor/[anonMark]
 * 数据在客户端按匿名代号聚合（本地池/真实 RPC），页面仅做壳。
 */
export default async function SailorFootprintRoute({ params }: SailorRouteProps) {
  const { anonMark } = await params;
  return <SailorFootprintPage mark={decodeURIComponent(anonMark)} />;
}