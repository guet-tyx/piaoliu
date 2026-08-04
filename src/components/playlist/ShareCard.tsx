"use client";

import { useEffect, useRef, useState } from "react";
import type { Playlist } from "@/types/music";
import { playlistTrackCount, playlistTotalDuration, formatMinutes } from "@/data/music-utils";
import { SHARE_FONT, drawBoat } from "@/components/bottle/BottleCard";
import styles from "./ShareCard.module.css";

/** 分享卡尺寸（宽 1080 高 540 横版，预览 2x 缩小展示） */
const W = 1080;
const H = 540;

/** 按宽度换行（canvas 排版） */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth) {
      lines.push(line);
      line = ch;
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** 确定性伪随机星点（同 seed 同布局，SSR 安全） */
function drawStars(ctx: CanvasRenderingContext2D, count: number) {
  const seed = 13;
  for (let i = 0; i < count; i++) {
    const x = (seed * (i + 7) * 137) % W;
    const y = (seed * (i + 3) * 89) % (H * 0.6);
    const r = 1 + ((seed * (i + 11)) % 3);
    ctx.fillStyle = `rgba(255,255,255,${0.25 + ((seed * (i + 5)) % 10) / 40})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 绘制分享卡主体（文字/统计/装饰；封面由 drawCover 叠加） */
function drawCard(ctx: CanvasRenderingContext2D, playlist: Playlist) {
  // 深空渐变背景
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#0B1020");
  grad.addColorStop(1, "#1a1440");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  drawStars(ctx, 120);

  // 星带
  ctx.save();
  ctx.strokeStyle = "rgba(123,177,255,0.15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W * 0.5, H * 0.05);
  ctx.quadraticCurveTo(W * 0.95, H * 0.4, W * 0.75, H * 0.95);
  ctx.stroke();
  ctx.restore();

  const coverX = 60;
  const coverSize = 360;

  // 封面占位（图片 onload 后重绘）
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(coverX, 90, coverSize, coverSize, 24);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(coverX, 90, coverSize, coverSize);
  ctx.restore();

  // 右侧文字
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `600 22px ${SHARE_FONT}`;
  ctx.fillText("星海 DRIFT · 歌单分享", coverX + coverSize + 40, 56);

  ctx.fillStyle = "#F1EDE3";
  ctx.font = `800 42px ${SHARE_FONT}`;
  const nameLines = wrapText(ctx, playlist.name, W - coverX - coverSize - 140);
  nameLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, coverX + coverSize + 40, 120 + i * 56);
  });

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `400 26px ${SHARE_FONT}`;
  const descY = 120 + nameLines.length * 56 + 14;
  wrapText(ctx, playlist.desc || "一张星海歌单", W - coverX - coverSize - 140)
    .slice(0, 2)
    .forEach((line, i) => {
      ctx.fillText(line, coverX + coverSize + 40, descY + i * 40);
    });

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `700 30px ${SHARE_FONT}`;
  const count = playlistTrackCount(playlist);
  const total = formatMinutes(playlistTotalDuration(playlist));
  ctx.fillText(`${count} 首 · ${total}`, coverX + coverSize + 40, H - 120);

  // 纸船装饰
  drawBoat(ctx, coverX + coverSize / 2, H - 80, 46, "rgba(201,160,67,0.7)");

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = `500 20px ${SHARE_FONT}`;
  ctx.fillText("漂流 DRIFT · 星海版", coverX + coverSize + 40, H - 56);
}

/**
 * 歌单分享卡片（P3-05）：canvas 绘制 1080×540 分享图，
 * 封面异步加载完成后重绘；提供预览 + 下载链接（仿 BottleCard/ReportCard 模式）。
 */
export function ShareCard({ playlist }: { playlist: Playlist }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imgUrl, setImgUrl] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawCard(ctx, playlist);

    // 封面异步加载后重绘（首次同步绘制占位，图片就绪后叠加）
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const coverX = 60;
      const coverSize = 360;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(coverX, 90, coverSize, coverSize, 24);
      ctx.clip();
      ctx.drawImage(img, coverX, 90, coverSize, coverSize);
      ctx.restore();
      setImgUrl(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      setImgUrl(canvas.toDataURL("image/png"));
    };
    img.src = playlist.cover;
    // 封面加载可能快于 effect（缓存命中）→ 同步兜底
    if (img.complete && img.naturalWidth > 0) {
      img.onload?.(null as unknown as Event);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist.id]);

  return (
    <div className={styles.wrap}>
      <canvas ref={canvasRef} width={W} height={H} className={styles.hiddenCanvas} aria-hidden="true" />
      {imgUrl ? (
        <>
          {/* 原生 img 展示 data URL（next/image 不优化 data URL） */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgUrl} alt={`${playlist.name} 分享卡片`} className={styles.preview} />
          <a
            href={imgUrl}
            download={`drift-playlist-${playlist.id}.png`}
            className={styles.download}
          >
            保存分享卡片
          </a>
        </>
      ) : (
        <p className={styles.loading}>正在生成分享卡片…</p>
      )}
    </div>
  );
}