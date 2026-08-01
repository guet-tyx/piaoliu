import type { ReactNode } from "react";
import styles from "./SectionHead.module.css";

interface SectionHeadProps {
  /** 角标文案（如 PLAYLISTS / STAR SEA RADIO） */
  tag: string;
  /** 大标题 */
  title: string;
  /** 副标题（ReactNode，加粗段由调用方 JSX 传入，避免 HTML 字符串） */
  subtitle?: ReactNode;
  /** 居中变体（下载区用） */
  centered?: boolean;
  className?: string;
}

/** 通用段落头：发光圆点角标 + H2 + 副标题（角色/歌单/播放器/下载区块共用） */
export function SectionHead({ tag, title, subtitle, centered, className }: SectionHeadProps) {
  return (
    <div className={`${styles.sectionHead}${centered ? ` ${styles.centered}` : ""}${className ? ` ${className}` : ""}`}>
      <span className={styles.tagDot}>
        <i />
        {tag}
      </span>
      <h2>{title}</h2>
      {subtitle && <p className={styles.secSub}>{subtitle}</p>}
    </div>
  );
}
