import type { Metadata } from "next";
import { SectionHead } from "@/components/shared/SectionHead";
import styles from "./footprint.module.css";

interface SailorRouteProps {
  params: Promise<{ anonMark: string }>;
}

export const metadata: Metadata = {
  title: "船客足迹 · 漂流 DRIFT",
};

/**
 * 船客足迹页占位（P0 F-01 跳转保证）：完整档案（漂流过/听歌感想/关于/关注）
 * 属 F-03，第二批实现；本占位保证广场卡片船客代号跳转不断链。
 */
export default async function SailorFootprintRoute({ params }: SailorRouteProps) {
  const { anonMark } = await params;
  return (
    <main className={`section ${styles.page}`}>
      <SectionHead
        tag="SAILOR FOOTPRINT"
        title="船客足迹"
        subtitle="匿名，是星海的规则。"
      />
      <div className={styles.placeholder}>
        <p className={styles.mark}>🎭 {decodeURIComponent(anonMark)}</p>
        <p className={styles.text}>这位船客的足迹档案正在建设中…</p>
        <p className={styles.hint}>漂流过、听歌感想、关注入口将在下一批开放。</p>
      </div>
    </main>
  );
}