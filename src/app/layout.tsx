import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Topbar } from "@/components/topbar/Topbar";
import { Footer } from "@/components/layout/Footer";
import { ParticleRails } from "@/components/shared/ParticleRails";
import { StarSeaBg } from "@/components/shared/StarSeaBg";
import { ScrollChrome } from "@/components/shared/ScrollChrome";
import { PlayerBridge } from "@/components/player/PlayerBridge";
import "./globals.css";

export const metadata: Metadata = {
  title: "漂流 DRIFT · 星海版",
  description:
    "漂流 DRIFT · 星海版：戴耳机的少女，纸船，星海——漂向下一首没人听过的歌。",
};

export const viewport: Viewport = {
  themeColor: "#050C1E",
};

/** 根布局：星海背景层 + 点线粒子 + 顶栏/页脚全站通用（V1.2 引入多页后仍保持站点骨架一致） */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {/* 全站背景：星海图（下）+ 点线粒子（上），均 z-index 0 + pointer-events none，内容覆盖 */}
        <StarSeaBg />
        <ParticleRails />
        {/* 滚动叙事：顶部进度条 + 返回顶部（fixed 层） */}
        <ScrollChrome />
        {/* 全局电台引擎：音频桥接常驻，路由切换音乐不中断（V3.2） */}
        <PlayerBridge />
        <Topbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
