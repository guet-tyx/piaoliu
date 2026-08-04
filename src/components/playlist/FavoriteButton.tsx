"use client";

import styles from "./FavoriteButton.module.css";

interface FavoriteButtonProps {
  liked: boolean;
  onToggle: () => void;
  /** 默认显示「☆ 收藏歌单」/「★ 已收藏」；false 时只显示图标 */
  withText?: boolean;
  className?: string;
  id?: string;
}

/**
 * 收藏按钮（P2-01 抽取，详情页/播放器共用）：
 * 未收藏通明描边；已收藏金色填充；hover 微放大；点击心跳缩放动画。
 */
export function FavoriteButton({
  liked,
  onToggle,
  withText = true,
  className,
  id,
}: FavoriteButtonProps) {
  return (
    <button
      id={id}
      type="button"
      className={`${styles.favBtn}${liked ? ` ${styles.favOn}` : ""}${className ? ` ${className}` : ""}`}
      aria-pressed={liked}
      aria-label={liked ? "取消收藏歌单" : "收藏歌单"}
      onClick={onToggle}
    >
      <span className={styles.icon} aria-hidden="true">
        {liked ? "★" : "☆"}
      </span>
      {withText && <span>{liked ? "已收藏" : "收藏歌单"}</span>}
    </button>
  );
}