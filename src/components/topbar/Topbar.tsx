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
            <img src="/logo.png" alt="" width={32} height={32} />
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
          <Link href="/drift" className="sweepGold sweepGold--left" data-text="🏺 漂流广场">
            🏺 漂流广场
          </Link>
          <Link href="/sailor" className="sweepGold sweepGold--left" data-text="船员证">
            船员证
          </Link>
          <Link href="/playlist" className="sweepGold sweepGold--left" data-text="歌单广场">
            歌单广场
          </Link>
          <Link href="/drift/colisten" className="sweepGold sweepGold--left" data-text="🎧 共听">
            🎧 共听
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
