"use client";

import { useEffect, useRef, useState } from "react";
import type { Bottle, Reply } from "@/types/social";
import styles from "./BottleCard.module.css";

/** 瓶面卡画布尺寸（竖版 3:4 分享图） */
export const CARD_W = 1080;
export const CARD_H = 1440;

/** 分享图画布共用字体（瓶面卡/周报卡） */
export const SHARE_FONT = "'PingFang SC', 'HarmonyOS Sans SC', 'Microsoft YaHei', sans-serif";

/** 按宽度换行（canvas 排版；瓶面卡/周报卡共用） */
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

/** 纸船剪影（三角帆 + 弧线船身，与品牌图形同源；瓶面卡/周报卡共用） */
export function drawBoat(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(3, size * 0.045);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.9);
  ctx.lineTo(cx, cy + size * 0.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.9);
  ctx.lineTo(cx + size * 0.75, cy - size * 0.1);
  ctx.lineTo(cx, cy - size * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.8, cy + size * 0.2);
  ctx.quadraticCurveTo(cx, cy + size * 0.75, cx + size * 0.8, cy + size * 0.2);
  ctx.stroke();
  ctx.restore();
}

/** 绘制瓶面卡：深空渐变 + 星点 + 纸船 + 瓶中信 + 歌曲信息 + 回信（如有） */
function drawBottleCard(ctx: CanvasRenderingContext2D, bottle: Bottle, replies: Reply[]) {
  const W = CARD_W;
  const H = CARD_H;

  // 深空渐变背景
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0B1020");
  g.addColorStop(1, "#050C1E");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 星点（确定性伪随机，渲染稳定）
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

  // 品牌行
  ctx.fillStyle = "rgba(123,177,255,.85)";
  ctx.font = `600 30px ${SHARE_FONT}`;
  ctx.fillText("漂流 DRIFT · 星海版", W / 2, 88);

  // 纸船
  drawBoat(ctx, W / 2, 285, 96, "#FB7299");

  // 匿名代号
  ctx.fillStyle = "rgba(255,255,255,.72)";
  ctx.font = `500 30px ${SHARE_FONT}`;
  ctx.fillText(bottle.anonMark, W / 2, 452);

  // 瓶中信（最多 8 行）
  ctx.fillStyle = "#fff";
  ctx.font = `500 44px ${SHARE_FONT}`;
  const lines = wrapText(ctx, bottle.text, 800);
  const shown = lines.slice(0, 8);
  shown.forEach((line, i) => {
    ctx.fillText(line, W / 2, 620 + i * 70);
  });
  if (lines.length > 8) {
    ctx.fillStyle = "rgba(255,255,255,.5)";
    ctx.font = `400 30px ${SHARE_FONT}`;
    ctx.fillText("…", W / 2, 620 + 8 * 70);
  }

  // 分隔线
  const sepY = 620 + Math.max(shown.length, 4) * 70 + 40;
  ctx.strokeStyle = "rgba(251,114,153,.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 140, sepY);
  ctx.lineTo(W / 2 + 140, sepY);
  ctx.stroke();

  // 歌曲信息
  ctx.fillStyle = "rgba(255,255,255,.88)";
  ctx.font = `600 40px ${SHARE_FONT}`;
  ctx.fillText(`「${bottle.track.t}」 ${bottle.track.tag}`, W / 2, sepY + 70);
  ctx.fillStyle = "rgba(255,255,255,.55)";
  ctx.font = `400 30px ${SHARE_FONT}`;
  ctx.fillText(bottle.track.s, W / 2, sepY + 122);

  // 回信（首条摘录）
  if (replies.length > 0) {
    ctx.fillStyle = "rgba(251,114,153,.9)";
    ctx.font = `600 28px ${SHARE_FONT}`;
    ctx.fillText("— 来自星海深处的回信 —", W / 2, sepY + 200);
    ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.font = `400 34px ${SHARE_FONT}`;
    const rLines = wrapText(ctx, replies[0].text, 760).slice(0, 3);
    rLines.forEach((l, i) => {
      ctx.fillText(l, W / 2, sepY + 260 + i * 52);
    });
  }

  // 底部水印
  ctx.fillStyle = "rgba(255,255,255,.26)";
  ctx.font = `400 26px ${SHARE_FONT}`;
  ctx.fillText("匿名 · 治愈 · 星海漂流", W / 2, H - 64);
}

/**
 * 瓶面卡（FR-7.6）：canvas 绘制二次元风分享图 → 预览 + 下载
 * 绘制发生在 useEffect（客户端专属），无水合问题
 */
export function BottleCard({ bottle, replies }: { bottle: Bottle; replies: Reply[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawBottleCard(ctx, bottle, replies);
    setImgUrl(canvas.toDataURL("image/png"));
  }, [bottle, replies]);

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
          <img src={imgUrl} alt="瓶面卡预览" className={styles.previewImg} />
          <a
            className={styles.save}
            href={imgUrl}
            download={`drift-bottle-${bottle.id.slice(0, 8)}.png`}
          >
            保存瓶面卡
          </a>
        </div>
      )}
    </div>
  );
}
