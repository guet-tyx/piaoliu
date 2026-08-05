"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Topbar.module.css";

/** 首页锚点导航（V1.2 多页：非首页时自动加 / 前缀，保证跨页跳转正确） */
const ANCHORS = [
  { href: "#top", label: "首页" },
  { href: "#char", label: "角色" },
  { href: "#playlist", label: "歌单" },
  { href: "#player", label: "电台" },
  { href: "#bottle", label: "漂流" },
];

/**
 * 顶栏（B站式亮色毛玻璃）— 全站通用（根布局挂载）
 * 首页锚点 + 船员证路由；usePathname 客户端适配跨页锚点
 */
export function Topbar() {
  const pathname = usePathname();
  // V2.4：全屏沉浸聊天页自带顶栏，隐藏全站顶栏
  if (pathname.startsWith("/chat")) return null;
  const anchor = (href: string) => (pathname === "/" ? href : `/${href}`);

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarIn}>
        <a className={styles.brand} href={anchor("#top")} aria-label="漂流 DRIFT 星海版 回到顶部">
          <span className={styles.brandMark} aria-hidden="true">
            <svg viewBox="0 0 32 32" width="20" height="20" fill="none">
              {/* 音符标志（漂流 DRIFT 品牌图标） */}
              <ellipse cx="12" cy="21" rx="5" ry="3.8" transform="rotate(-18 12 21)" fill="currentColor"/>
              <line x1="16" y1="19" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 6Q22 8 23 14Q21 11 16 11" fill="currentColor"/>
              <path d="M16 11Q20 12 21 16Q19 14 16 14" fill="currentColor"/>
              <path d="M16 14Q24 18 28 16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".6"/>
              <path d="M28 16L29 13L30 16L33 16L30.5 18L31 21L28 19L25 21L25.5 18L23 16Z" fill="currentColor" opacity=".8" transform="scale(.45) translate(34,20)"/>
            </svg>
          </span>
          <span className={styles.brandName}>
            漂流<em className={styles.demoBadge}>星海版</em>
          </span>
        </a>
        <nav className={styles.navLinks} aria-label="主导航">
          {ANCHORS.map((a) => (
            <a
              key={a.href}
              href={anchor(a.href)}
              className="sweepGold sweepGold--left"
              data-text={a.label}
            >
              {a.label}
            </a>
          ))}
          <a href="/sailor" className="sweepGold sweepGold--left" data-text="船员证">
            船员证
          </a>
          <Link href="/playlist" className="sweepGold sweepGold--left" data-text="歌单广场">
            歌单广场
          </Link>
          <a href="/report" className="sweepGold sweepGold--left" data-text="周报">
            周报
          </a>
          <a className={styles.navDl} href={anchor("#download")}>
            免费下载
          </a>
        </nav>
      </div>
    </header>
  );
}
