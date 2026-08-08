import { SectionHead } from "@/components/shared/SectionHead";
import { Reveal } from "@/components/shared/Reveal";
import styles from "./DownloadSection.module.css";

/** Android APK 直链（GitHub Release latest 资产，后续版本发布自动跟随） */
const APK_URL = "https://github.com/guet-tyx/drift-app/releases/latest/download/app-release.apk";

/** 下载 CTA：Android APK 已上线直链，App Store 仍为占位 */
export function DownloadSection() {
  return (
    <section className={`section ${styles.download}`} id="download">
      <SectionHead
        tag="DOWNLOAD"
        title="今晚，漂向星海。"
        centered
        subtitle={
          <>
            免费下载。会员订阅解锁无限漂流、离线收听与无损音质。
            <br />
            没有广告，没有排行榜绑架你的耳朵。
          </>
        }
      />

      {/* 米哈游风格：下载按钮区进入视口浮现 */}
      <Reveal className={styles.storeRow}>
        {/* FR-6：暂无真实应用商店落地页，明确标注「敬请期待」，不再指向 # */}
        <span className={`${styles.storeBtn} ${styles.soon}`} aria-label="App Store 免费下载，敬请期待">
          <svg viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
          </svg>
          <span className={styles.stTxt}>
            <em>App Store</em>
            <small>免费下载</small>
          </span>
          <b className={styles.soonTag}>敬请期待</b>
        </span>
        <a className={styles.storeBtn} href={APK_URL} aria-label="Android 免费下载 APK">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.4 11.4 0 0 0-8.94 0L5.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83l1.84 3.18C3.95 11 2.5 13.42 2.5 16.17h19c0-2.75-1.45-5.17-3.9-6.69zM7.5 13.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm9 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
          </svg>
          <span className={styles.stTxt}>
            <em>Android</em>
            <small>免费下载</small>
          </span>
          <b className={styles.soonTag}>APK 直装</b>
        </a>
      </Reveal>

      <Reveal as="p" className={styles.dlNote}>
        第一次打开，就有一条漂流线在等你。<b>✦</b>
      </Reveal>
      <Reveal as="p" className={styles.dlHint}>
        Android 版为 APK 直装包（约 160MB，全机型），安装时需允许「安装未知应用」；iOS 版正在路上。
      </Reveal>
    </section>
  );
}
