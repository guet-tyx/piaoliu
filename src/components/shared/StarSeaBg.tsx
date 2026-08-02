import styles from "./StarSeaBg.module.css";

/**
 * 星海背景层（AI 生图，sensenova-u1-fast，2026-08-02）：
 * 深空蓝 + 粉紫极光 + 星辰 + 水面倒影的氛围图，配深色蒙版渐变压制亮度。
 * - 固定视口层（fixed z-index 0 + pointer-events none），内容覆盖其上
 * - 服务器组件（静态 DOM，无 JS）；webp 24KB，加载零成本
 * - 与 ParticleRails 同层：本组件先挂载（图在下），粒子后挂载（线点在上）
 * - 纯装饰层，aria-hidden
 */
export function StarSeaBg() {
  return <div className={styles.bg} aria-hidden="true" />;
}
