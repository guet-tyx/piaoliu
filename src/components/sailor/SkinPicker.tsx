"use client";

import { useIdentityStore } from "@/stores/identity";
import { SKINS } from "@/data/collection";
import { SkinBoat, type SkinVariant } from "@/components/shared/SkinBoat";
import Image from "next/image";
import styles from "./SkinPicker.module.css";

/**
 * 纸船皮肤选择器（FR-12 + P1 F-05）：随等级解锁（月船需「月船船客」徽章——
 * 连续 30 天任务奖励），选择即时生效（影响漂流区船位与瓶面卡）
 */
export function SkinPicker() {
  const sailor = useIdentityStore((s) => s.sailor);
  const switchSkin = useIdentityStore((s) => s.switchSkin);
  if (!sailor) return null;

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>纸船皮肤</h3>
      <p className={styles.desc}>随等级解锁。你的船，替你在星海里航行。</p>
      <div className={styles.list}>
        {SKINS.map((skin) => {
          const badgeLocked =
            skin.unlockBadge !== undefined && !sailor.badges.includes(skin.unlockBadge);
          const levelLocked = sailor.level < skin.unlockLevel;
          const locked = levelLocked || badgeLocked;
          const active = sailor.bottleStyle === skin.id;
          return (
            <button
              key={skin.id}
              className={`${styles.skin}${active ? ` ${styles.active}` : ""}`}
              type="button"
              disabled={locked}
              aria-label={`${skin.name}${levelLocked ? `（Lv.${skin.unlockLevel} 解锁）` : badgeLocked ? "（30 天任务解锁）" : ""}`}
              aria-pressed={active}
              onClick={() => switchSkin(skin.id)}
            >
              <span className={styles.iconWrap}>
                <SkinBoat variant={skin.id as SkinVariant} className={styles.icon} />
                {levelLocked ? (
                  <em className={styles.lock}>Lv.{skin.unlockLevel}</em>
                ) : badgeLocked ? (
                  <em className={styles.lock}>30 天</em>
                ) : null}
              </span>
              <span className={styles.meta}>
                <b>{skin.name}</b>
                <small>{skin.desc}</small>
              </span>
              <span className={styles.preview}>
                <Image
                  src={skin.image}
                  alt={`${skin.name}搭配场景`}
                  fill
                  style={{ objectFit: "cover" }}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
