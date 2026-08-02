"use client";

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
  const anchor = (href: string) => (pathname === "/" ? href : `/${href}`);

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarIn}>
        <a className={styles.brand} href={anchor("#top")} aria-label="漂流 DRIFT 星海版 回到顶部">
          <span className={styles.brandMark} aria-hidden="true">
            <svg viewBox="0 0 32 32" width="20" height="20" fill="none">
              {/* 纸船主体（梯形） */}
              <path d="M6 17 L26 17 L23 24 L9 24 Z" fill="currentColor" opacity=".18" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              {/* 纸船帆（三角形） */}
              <path d="M11 17 L16 8 L21 17 Z" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              {/* 桅杆延伸为音符干 */}
              <path d="M16 8 L16 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              {/* 音符头（椭圆） */}
              <ellipse cx="14.6" cy="4.2" rx="2.4" ry="1.7" fill="currentColor" transform="rotate(-22 14.6 4.2)" />
              {/* 音符旗（弯曲弧线，从桅杆顶端向右延伸，发光感） */}
              <path d="M16 3.5 C 20 3.5, 21.5 5.5, 19.5 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              {/* 水面波浪（两条） */}
              <path d="M2.5 27 Q 8 29, 13 27 T 23 27 T 29.5 27" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
              <path d="M5 30.5 Q 10 32.5, 16 30.5 T 27 30.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity=".55" />
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
          <a href="/report" className="sweepGold sweepGold--left" data-text="周报">
            周报
          </a>
          <a
            className={`${styles.navDl} sweepGold sweepGold--left`}
            href={anchor("#download")}
            data-text="免费下载"
          >
            免费下载
          </a>
        </nav>
      </div>
    </header>
  );
}
