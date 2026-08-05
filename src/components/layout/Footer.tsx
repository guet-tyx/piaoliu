"use client";

import { usePathname } from "next/navigation";
import styles from "./Footer.module.css";

/** 页脚（静态）：品牌 + 链接 + 版权与音乐授权声明（V2.4：/chat/* 全屏聊天页隐藏） */
export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/chat")) return null;
  return (
    <footer className={styles.footer}>
      <div className={styles.footInner}>
        <div className={styles.footLeft}>
          <span className={styles.brandMark} aria-hidden="true">
            <svg viewBox="0 0 32 32" width="15" height="15" fill="none">
              <ellipse cx="12" cy="21" rx="5" ry="3.8" transform="rotate(-18 12 21)" fill="currentColor"/>
              <line x1="16" y1="19" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 6Q22 8 23 14Q21 11 16 11" fill="currentColor"/>
              <path d="M16 11Q20 12 21 16Q19 14 16 14" fill="currentColor"/>
            </svg>
          </span>
          <span className={styles.footName}>漂流 DRIFT · 星海版</span>
          <span className={styles.footSlogan}>在星海里迷路，是一件好事。</span>
        </div>
        {/* FR-6：暂无真实社交落地页，明确标注「敬请期待」，不再指向 # */}
        <div className={styles.footLinks}>
          <span className={styles.soonLink}>
            B站<em>敬请期待</em>
          </span>
          <span className={styles.soonLink}>
            小红书<em>敬请期待</em>
          </span>
          <span className={styles.soonLink}>
            关于<em>敬请期待</em>
          </span>
        </div>
      </div>
      <div className={styles.footCopy}>
        <span>© 2026 漂流 DRIFT</span>
        <span className={styles.credit}>
          试听音乐：Kevin MacLeod（incompetech.com）CC-BY-4.0 · SoundHelix · 角色「汐」为虚构形象
        </span>
        <span>
          免费下载，<b>从今天开始</b>。
        </span>
      </div>
    </footer>
  );
}
