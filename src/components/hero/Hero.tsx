import styles from "./Hero.module.css";

/**
 * 首屏：深空压轴（米哈游质感）
 * 静态壳：星空粒子 canvas、弹幕带（.dm-zone）留待后续接入
 */
export function Hero() {
  return (
    <section className={`${styles.hero} ${styles.heroScrub}`} aria-label="首屏">
      {/* 星空粒子 canvas + 弹幕歌词带：下一步接入 */}
      <span className={`${styles.hudCorner} ${styles.hudTl}`} aria-hidden="true" />
      <span className={`${styles.hudCorner} ${styles.hudBr}`} aria-hidden="true" />

      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            DRIFT × STAR SEA <span className={styles.en}>星海版限定</span>
          </p>
          <h1>
            在星海里，<br />
            漂向<span className={styles.hl}>下一首歌</span>。
          </h1>
          <p className={styles.lead}>
            每晚一条漂流线，从你熟悉的歌出发，
            <br />
            漂向<b>星海深处没人听过的旋律</b>。耳机戴好，船要开了。
          </p>
          <div className={styles.cta}>
            <a className={`${styles.btn} ${styles.btnPink}`} href="#download">
              免费下载 <span style={{ opacity: 0.85 }}>↘</span>
            </a>
            <a className={`${styles.btn} ${styles.btnBlue}`} href="#player">
              听听星海电台
            </a>
          </div>
          <p className={styles.fineprint}>
            免费下载<i>·</i>无广告<i>·</i>会员解锁无限漂流
          </p>
        </div>
      </div>

      <p className={styles.heroCoord} aria-hidden="true">
        星海站 <b>#3</b> · 22.4°N 118.1°E · 航线未知
      </p>
      <div className={styles.scrollHint} aria-hidden="true">
        SCROLL<i />
      </div>

      {/* 波峰分隔线：深空 → 亮色（透明区露出深空） */}
      <div className={styles.waveDivider} aria-hidden="true">
        <svg viewBox="0 0 1440 70" preserveAspectRatio="none">
          <path d="M0 34 Q 120 66 260 50 T 520 44 T 780 52 T 1040 42 T 1300 52 T 1440 40 L 1440 70 L 0 70 Z" fill="#FDF2F7" />
        </svg>
      </div>
    </section>
  );
}
