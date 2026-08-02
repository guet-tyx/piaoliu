"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { KeyboardEvent } from "react";
import { PLAYLISTS } from "@/data/playlists";
import { usePlayerStore } from "@/stores/player";
import { SectionHead } from "@/components/shared/SectionHead";
import styles from "./PlaylistSection.module.css";

/**
 * 歌单（米哈游舞台式焦点横排，2026-08-02 改造）：
 * 桌面端 1 张大卡 + 3 张小卡横排，hover / 键盘聚焦切换焦点卡（大卡展示
 * 叙事描述 + 立即播放），点击任意卡播放对应曲目；溢出容器横向可滚动。
 * <960px 降级为原有网格布局（无 hover 焦点概念，activeIndex 恒为 0）。
 */
export function PlaylistSection() {
  const playTrack = usePlayerStore((s) => s.playTrack);
  const [activeIndex, setActiveIndex] = useState(0);
  const railRef = useRef<HTMLDivElement | null>(null);

  /** 焦点卡切换时保证其在可视区（越界才平滑滚动） */
  useEffect(() => {
    const rail = railRef.current;
    const activeEl = rail?.children[activeIndex] as HTMLElement | undefined;
    if (!rail || !activeEl) return;
    const left = activeEl.offsetLeft;
    const right = left + activeEl.offsetWidth;
    if (left < rail.scrollLeft || right > rail.scrollLeft + rail.clientWidth) {
      rail.scrollTo({ left: Math.max(left - 24, 0), behavior: "smooth" });
    }
  }, [activeIndex]);

  /** 播放对应曲目并滚动到播放器 */
  const handlePlay = (index: number) => {
    playTrack(index);
    document.getElementById("player")?.scrollIntoView({ behavior: "smooth" });
  };

  /** 键盘可访问：左右切换焦点，Enter / Space 播放 */
  const handleKeyDown = (index: number) => (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const next = e.key === "ArrowLeft" ? index - 1 : index + 1;
      if (next >= 0 && next < PLAYLISTS.length) setActiveIndex(next);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handlePlay(index);
    }
  };

  return (
    <section className="section" id="playlist">
      <SectionHead tag="PLAYLISTS" title="今夜在漂的歌单" subtitle="每一张都是一条航线。点进去，船就开了。" />

      <div ref={railRef} className={styles.pRail}>
        {PLAYLISTS.map((playlist, index) => {
          const active = index === activeIndex;
          return (
            <div
              key={playlist.name}
              className={`${styles.pCard}${active ? ` ${styles.pActive}` : ""}`}
              tabIndex={0}
              role="button"
              aria-label={`${playlist.name}歌单`}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onClick={() => handlePlay(index)}
              onKeyDown={handleKeyDown(index)}
            >
              <div className={styles.pCover}>
                {playlist.ribbon && (
                  <span
                    className={`${styles.ribbon}${playlist.ribbon.gold ? ` ${styles.gold}` : ""}`}
                  >
                    {playlist.ribbon.label}
                  </span>
                )}
                <Image
                  src={playlist.cover}
                  alt={playlist.alt}
                  fill
                  sizes="(max-width: 960px) 50vw, 480px"
                  style={{ objectFit: "cover" }}
                />
                <span className={styles.pPlay}>▶</span>
              </div>
              <p className={styles.pNo}>[NO.0{index + 1}]</p>
              <p className={styles.pName}>{playlist.name}</p>
              {active && (
                <div className={styles.pDesc}>
                  <p>{playlist.desc}</p>
                  <p className={styles.pMeta}>
                    <b>{playlist.meta.plays}</b>播放 · <b>{playlist.meta.dms}</b>弹幕 ·{" "}
                    {playlist.meta.time}
                  </p>
                  <span className={`${styles.pPlayBtn} sweepGold`} data-text="立即播放">
                    立即播放 ▶
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
