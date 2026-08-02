import styles from "./ParticleRails.module.css";

/**
 * 全站背景点线粒子（调研自 bh3.mihoyo.com 的 .line-dot-ani，2026-08-02 落地）：
 * 6 条 1px 竖线 × 每线 4 个 5px 圆点，两档透明度交错（亮组 .25/.35、暗组 .05/.15），
 * 散布于视口。点沿线缓慢漂移 + 线呼吸闪烁（只动 transform/opacity）。
 *
 * - 纯服务器组件（静态 DOM，无 JS/无 cleanup）
 * - 固定视口层 z-index 0 + pointer-events none，不挡内容与交互
 * - 确定性伪随机（STYLE_GUIDE 禁 Math.random）：(i*37+j*13)%N 公式，SSR/CSR 一致
 * - reduced-motion 由全局压制接管（静止显示）
 */

/** 线：水平位置/起点/高度（视口百分比）+ 动画参数（确定性公式） */
interface Rail {
  x: number;
  top: number;
  h: number;
  bright: boolean;
  lineDur: number;
  lineDelay: number;
  dots: { p: number; dur: number; delay: number }[];
}

const RAILS: Rail[] = Array.from({ length: 6 }, (_, i) => {
  const bright = i % 2 === 0;
  const dots = Array.from({ length: 4 }, (_, j) => ({
    p: +(((j * 23 + i * 41) % 92) / 100 * 100).toFixed(1), // 沿线位置 0-91%
    dur: 11 + ((i * 7 + j * 13) % 10),                      // 11-20s
    delay: -((j * 3 + i * 5) % 12),                         // 负延迟错峰
  }));
  return {
    x: (i * 37 + 11) % 100,        // 线水平位置
    top: ((i * 29 + 7) % 42) + 4,  // 线起点
    h: ((i * 53 + 31) % 42) + 34,  // 线高度
    bright,
    lineDur: 6 + ((i * 5 + 3) % 5), // 6-10s
    lineDelay: -((i * 2 + 1) % 7),
    dots,
  };
});

export function ParticleRails() {
  return (
    <div className={styles.rails} aria-hidden="true">
      {RAILS.map((rail, i) => (
        <div
          key={i}
          className={`${styles.rail}${rail.bright ? ` ${styles.railBright}` : ""}`}
          style={{
            left: `${rail.x}%`,
            top: `${rail.top}%`,
            height: `${rail.h}%`,
            animationDuration: `${rail.lineDur}s`,
            animationDelay: `${rail.lineDelay}s`,
          }}
        >
          {rail.dots.map((dot, j) => (
            <i
              key={j}
              className={`${styles.dot}${rail.bright ? ` ${styles.dotBright}` : ""}`}
              style={{
                top: `${dot.p}%`,
                animationDuration: `${dot.dur}s`,
                animationDelay: `${dot.delay}s`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
