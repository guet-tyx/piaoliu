"use client";

import { useEffect, useRef, useState } from "react";
import {
  CARD_W,
  CARD_H,
  SHARE_FONT,
  drawBoat,
} from "@/components/bottle/BottleCard";
import { trackNameOf, type WeeklyReport } from "@/lib/api/report";
import styles from "./ReportCard.module.css";

/**
 * 周报分享图（FR-13 分享形态）：canvas 绘制周报摘要 → 预览 + 下载
 * 复用瓶面卡 canvas 模式（深空渐变/星点/纸船/水印）
 */
function drawReportCard(ctx: CanvasRenderingContext2D, report: WeeklyReport) {
  const W = CARD_W;
  const H = CARD_H;

  // 深空渐变背景
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0B1020");
  g.addColorStop(1, "#050C1E");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 星点（确定性伪随机）
  ctx.fillStyle = "rgba(255,255,255,.45)";
  for (let i = 0; i < 70; i++) {
    const x = (i * 137 + 41) % W;
    const y = (i * 89 + 17) % H;
    const r = 1 + ((i * 7) % 3);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = "center";

  // 品牌 + 标题
  ctx.fillStyle = "rgba(123,177,255,.85)";
  ctx.font = `600 30px ${SHARE_FONT}`;
  ctx.fillText("漂流 DRIFT · 星海版", W / 2, 88);
  ctx.fillStyle = "#fff";
  ctx.font = `800 64px ${SHARE_FONT}`;
  ctx.fillText("星海周报", W / 2, 168);

  // 纸船
  drawBoat(ctx, W / 2, 268, 72, "#FB7299");

  // 本周航行小结（4 项）
  const w = report.week;
  const items: [string, string][] = [
    [String(w.listens), "首歌"],
    [String(w.launched), "艘启航"],
    [String(w.picked), "艘拾起"],
    [String(w.replied), "封回信"],
  ];
  ctx.font = `700 44px ${SHARE_FONT}`;
  const itemW = W / 4;
  items.forEach(([num, label], i) => {
    const cx = itemW * i + itemW / 2;
    ctx.fillStyle = "#fff";
    ctx.fillText(num, cx, 400);
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.font = `400 28px ${SHARE_FONT}`;
    ctx.fillText(label, cx, 448);
    ctx.font = `700 44px ${SHARE_FONT}`;
  });

  // 热门航线 top3
  ctx.fillStyle = "rgba(251,114,153,.9)";
  ctx.font = `600 30px ${SHARE_FONT}`;
  ctx.fillText("— 本周热门航线 —", W / 2, 540);
  ctx.fillStyle = "#fff";
  ctx.font = `500 36px ${SHARE_FONT}`;
  const top = report.topTracks.slice(0, 3);
  top.forEach((t, i) => {
    ctx.fillText(
      `${i + 1}. ${trackNameOf(t.trackId)}  ×${t.count}`,
      W / 2,
      610 + i * 62,
    );
  });

  // 收听星图（7 天柱状）
  ctx.fillStyle = "rgba(123,177,255,.9)";
  ctx.font = `600 30px ${SHARE_FONT}`;
  ctx.fillText("— 收听星图 —", W / 2, 860);
  const max = Math.max(...report.listenDays.map((d) => d.count), 1);
  const barW = 76;
  const gap = 28;
  const startX = W / 2 - ((barW + gap) * 7 - gap) / 2;
  const baseY = 1060;
  report.listenDays.forEach((d, i) => {
    const h = d.count > 0 ? Math.max(40, (d.count / max) * 280) : 12;
    const x = startX + i * (barW + gap);
    const g2 = ctx.createLinearGradient(0, baseY - h, 0, baseY);
    g2.addColorStop(0, "#FB7299");
    g2.addColorStop(1, "#00AEEC");
    ctx.fillStyle = g2;
    ctx.fillRect(x, baseY - h, barW, h);
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.font = `400 24px ${SHARE_FONT}`;
    ctx.fillText(d.date.slice(5), x + barW / 2, baseY + 36);
  });

  // 底部水印
  ctx.fillStyle = "rgba(255,255,255,.26)";
  ctx.font = `400 26px ${SHARE_FONT}`;
  ctx.fillText("匿名 · 治愈 · 星海漂流", W / 2, H - 64);
}

/** 周报分享图（FR-13 分享形态）：预览 + 下载 */
export function ReportCard({ report }: { report: WeeklyReport }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawReportCard(ctx, report);
    setImgUrl(canvas.toDataURL("image/png"));
  }, [report]);

  return (
    <div className={styles.wrap}>
      <canvas
        ref={canvasRef}
        width={CARD_W}
        height={CARD_H}
        className={styles.canvas}
        aria-hidden="true"
      />
      {imgUrl && (
        <div className={styles.preview}>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL 无法走 next/image 优化 */}
          <img
            src={imgUrl}
            alt="星海周报分享图预览"
            className={styles.previewImg}
          />
          <a className={styles.save} href={imgUrl} download="drift-weekly-report.png">
            保存周报分享图
          </a>
        </div>
      )}
    </div>
  );
}
