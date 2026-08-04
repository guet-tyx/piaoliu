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
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
              <path d="M12 3v11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 4.5 19 11h-7z" fill="currentColor" />
              <path d="M2.5 13.5Q12 17.5 21.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
