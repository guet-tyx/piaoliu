import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "漂流 DRIFT · 星海版",
  description:
    "漂流 DRIFT · 星海版：戴耳机的少女，纸船，星海——漂向下一首没人听过的歌。",
};

export const viewport: Viewport = {
  themeColor: "#050C1E",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
