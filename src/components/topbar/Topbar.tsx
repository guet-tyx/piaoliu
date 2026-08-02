import styles from "./Topbar.module.css";

/** 顶栏（B站式亮色毛玻璃）— 静态壳，导航锚点对应后续迁移区块 */
export function Topbar() {
  return (
    <header className={styles.topbar}>
      <div className={styles.topbarIn}>
        <a className={styles.brand} href="#top" aria-label="漂流 DRIFT 星海版 回到顶部">
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
          <a href="#char">角色</a>
          <a href="#playlist">歌单</a>
          <a href="#player">电台</a>
          <a href="#bottle">漂流</a>
          <a className={styles.navDl} href="#download">
            免费下载
          </a>
        </nav>
      </div>
    </header>
  );
}
