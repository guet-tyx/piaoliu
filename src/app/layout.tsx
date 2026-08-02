import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Topbar } from "@/components/topbar/Topbar";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "漂流 DRIFT · 星海版",
  description:
    "漂流 DRIFT · 星海版：戴耳机的少女，纸船，星海——漂向下一首没人听过的歌。",
};

export const viewport: Viewport = {
  themeColor: "#050C1E",
};

/** 根布局：顶栏/页脚全站通用（V1.2 引入多页后仍保持站点骨架一致） */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Topbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
