import { Fragment } from "react";
import { GENRES } from "@/data/marquee";
import { Reveal } from "@/components/shared/Reveal";
import styles from "./MarqueeSection.module.css";

/**
 * 星海航线跑马灯：深色底 + 双组轨道无缝循环（装饰性，aria-hidden）
 * 动画 marquee 40s 在 globals.css 全局定义；
 * 米哈游风格：外层进入视口时整体浮现一次（不干扰内部持续循环动画）
 */
export function MarqueeSection() {
  return (
    <Reveal as="div" className={styles.marquee} aria-hidden="true">
      <div className={styles.marqueeTrack}>
        {[0, 1].map((group) => (
          <div className={styles.marqueeGroup} key={group}>
            {GENRES.map((genre) => (
              <Fragment key={genre}>
                <span className={styles.mItem}>{genre}</span>
                <span className={styles.mSep}>✦</span>
              </Fragment>
            ))}
          </div>
        ))}
      </div>
    </Reveal>
  );
}
