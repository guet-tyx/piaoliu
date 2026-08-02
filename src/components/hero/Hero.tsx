"use client";

import { useEffect, useRef } from "react";
import { StarField } from "./StarField";
import { HeroDanmaku } from "./HeroDanmaku";
import styles from "./Hero.module.css";

/**
 * 首屏：深空压轴（米哈游质感）
 * 层级：星尘 canvas → 弹幕带 → 内容（z-index 2），均位于深空背景之上
 * 滚动动效：支持 scroll-driven 的浏览器走 CSS（@supports 块），
 * 不支持的旧浏览器由本组件 JS 降级（数值与 CSS 版完全对应）
 */
export function Hero() {
  const heroRef = useRef<HTMLElement | null>(null);
  const copyRef = useRef<HTMLDivElement | null>(null);

  // 苹果风格滚动降级：不支持 scroll-driven 时 JS 实现 hero exit-scrub
  useEffect(() => {
    if (typeof CSS === "undefined" || !CSS.supports || CSS.supports("animation-timeline", "scroll()")) {
      return; // CSS 路线接管
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ticking = false;
    const update = () => {
      ticking = false;
      const hero = heroRef.current;
      const copy = copyRef.current;
      if (!hero || !copy) return;
      const vh = window.innerHeight;
      const r = hero.getBoundingClientRect();
      // 0 = 页面顶部，1 = 完全滚出
      const p = Math.min(Math.max((vh - r.top) / (vh * 1.1), 0), 1);
      copy.style.opacity = String(1 - p * 0.95);
      copy.style.translate = `0 ${p * -90}px`;
      hero.style.opacity = String(1 - p * 0.75);
      hero.style.transform = `scale(${1 + p * 0.06}) translateY(${p * 40}px)`;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section ref={heroRef} className={`${styles.hero} ${styles.heroScrub}`} aria-label="首屏">
      <StarField />
      <HeroDanmaku />

      <span className={`${styles.hudCorner} ${styles.hudTl}`} aria-hidden="true" />
      <span className={`${styles.hudCorner} ${styles.hudBr}`} aria-hidden="true" />

      <div className={styles.heroInner}>
        <div ref={copyRef} className={styles.heroCopy}>
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
