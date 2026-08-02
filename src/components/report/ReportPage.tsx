"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { SectionHead } from "@/components/shared/SectionHead";
import { ReportCard } from "@/components/report/ReportCard";
import { computeWeeklyReport, trackNameOf, type WeeklyReport } from "@/lib/api/report";
import { TRACKS } from "@/data/tracks";
import styles from "./ReportPage.module.css";

/** 收听星图柱高：确定性比例（0 值给最小占位） */
function barHeight(count: number, max: number): number {
  if (count <= 0) return 4;
  return Math.max(12, Math.round((count / max) * 100));
}

/**
 * 星海周报页（FR-13）：轻量图文页
 * 本周航行小结 / 热门航线 top3 / 收听星图（近 7 天）/ 本周启航的瓶子 + 分享图
 * 数据从 V2.0 起累积（本地 drift-stats + daily-activity；真实模式 action_logs 聚合）
 */
export function ReportPage() {
  // 周报数据为客户端专属（localStorage），SSR 渲染空态，effect 后计算（避免水合冲突）
  const [report, setReport] = useState<WeeklyReport | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage 外部源初始化（SSR 空态安全，水合后更新）
    setReport(computeWeeklyReport());
  }, []);

  const maxDay = report
    ? Math.max(...report.listenDays.map((d) => d.count), 1)
    : 1;

  return (
    <main className={`section ${styles.page}`}>
      <SectionHead
        tag="WEEKLY REPORT"
        title="星海周报"
        subtitle="每周一份，记录你这周的航线。匿名，只属于你。"
      />

      {report === null ? (
        <p className={styles.empty}>正在整理本周的星海…</p>
      ) : !report.hasData ? (
        <div className={styles.empty}>
          <p>本周还没有航行记录。</p>
          <p className={styles.emptySub}>
            去听几首歌、启航一艘纸船——周报会在数据积累后生成。
          </p>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {/* 个人航行小结 */}
            <section className={styles.card}>
              <h3 className={styles.cardTitle}>本周航行</h3>
              <ul className={styles.summary}>
                <li>
                  <b>{report.week.listens}</b>
                  <span>首歌</span>
                </li>
                <li>
                  <b>{report.week.launched}</b>
                  <span>艘启航</span>
                </li>
                <li>
                  <b>{report.week.picked}</b>
                  <span>艘拾起</span>
                </li>
                <li>
                  <b>{report.week.replied}</b>
                  <span>封回信</span>
                </li>
              </ul>
            </section>

            {/* 热门航线 */}
            <section className={styles.card}>
              <h3 className={styles.cardTitle}>本周热门航线</h3>
              {report.topTracks.length === 0 ? (
                <p className={styles.cardEmpty}>本周还没留下收听足迹。</p>
              ) : (
                <ul className={styles.trackList}>
                  {report.topTracks.map((t, i) => {
                    const track = TRACKS.find((x) => x.id === t.trackId);
                    return (
                      <li key={t.trackId} className={styles.trackItem}>
                        <span className={styles.rank}>{i + 1}</span>
                        {track && (
                          <Image
                            src={track.cover}
                            alt=""
                            width={40}
                            height={40}
                            className={styles.trackCover}
                          />
                        )}
                        <span className={styles.trackMeta}>
                          <b>{trackNameOf(t.trackId)}</b>
                          <small>听了 {t.count} 次</small>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* 收听星图 */}
            <section className={styles.card}>
              <h3 className={styles.cardTitle}>收听星图</h3>
              <div className={styles.chart} aria-label="近 7 天收听分布">
                {report.listenDays.map((d) => (
                  <div key={d.date} className={styles.chartCol}>
                    <i style={{ height: `${barHeight(d.count, maxDay)}%` }} />
                    <small>{d.date.slice(5)}</small>
                  </div>
                ))}
              </div>
            </section>

            {/* 本周启航的瓶子 */}
            <section className={styles.card}>
              <h3 className={styles.cardTitle}>本周启航的纸船</h3>
              {report.bottles.length === 0 ? (
                <p className={styles.cardEmpty}>本周还没有启航记录。</p>
              ) : (
                <ul className={styles.bottleList}>
                  {report.bottles.map((b) => (
                    <li key={b.id} className={styles.bottleItem}>
                      <p className={styles.bottleText}>{b.text}</p>
                      <p className={styles.bottleMeta}>
                        🎵 {b.trackName}
                        <em className={b.replied ? styles.done : ""}>
                          {b.replied ? "已收到回信" : b.picked ? "已被拾起" : "漂流中"}
                        </em>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* 分享图（FR-13 分享形态：canvas 生成下载） */}
          <ReportCard report={report} />
        </>
      )}
    </main>
  );
}
