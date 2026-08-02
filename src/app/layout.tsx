import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Topbar } from "@/components/topbar/Topbar";
import { Footer } from "@/components/layout/Footer";
import { ParticleRails } from "@/components/shared/ParticleRails";
import "./globals.css";

export const metadata: Metadata = {
  title: "漂流 DRIFT · 星海版",
  description:
    "漂流 DRIFT · 星海版：戴耳机的少女，纸船，星海——漂向下一首没人听过的歌。",
};

export const viewport: Viewport = {
  themeColor: "#050C1E",
};

/** 根布局：背景粒子层 + 顶栏/页脚全站通用（V1.2 引入多页后仍保持站点骨架一致） */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {/* 全站背景点线粒子（z-index 0，内容覆盖其上；aria-hidden 装饰层） */}
        <ParticleRails />
        <Topbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
