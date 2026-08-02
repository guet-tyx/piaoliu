"use client";

import { usePathname } from "next/navigation";
import styles from "./Topbar.module.css";

/** 首页锚点导航（V1.2 多页：非首页时自动加 / 前缀，保证跨页跳转正确） */
const ANCHORS = [
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
  const anchor = (href: string) => (pathname === "/" ? href : `/${href}`);

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarIn}>
        <a className={styles.brand} href={anchor("#top")} aria-label="漂流 DRIFT 星海版 回到顶部">
          <span className={styles.brandMark} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
              <path d="M12 3v11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 4.5 19 11h-7z" fill="currentColor" />
              <path d="M2.5 13.5Q12 17.5 21.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M5 18Q8.5 20 12 18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".6" />
            </svg>
          </span>
          <span className={styles.brandName}>
            漂流<em className={styles.demoBadge}>星海版</em>
          </span>
        </a>
        <nav className={styles.navLinks} aria-label="主导航">
          {ANCHORS.map((a) => (
            <a key={a.href} href={anchor(a.href)}>
              {a.label}
            </a>
          ))}
          <a href="/sailor">船员证</a>
          <a className={styles.navDl} href={anchor("#download")}>
            免费下载
          </a>
        </nav>
      </div>
    </header>
  );
}
