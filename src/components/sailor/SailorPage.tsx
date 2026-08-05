"use client";

import { useEffect } from "react";
import { SectionHead } from "@/components/shared/SectionHead";
import { SailorCard } from "@/components/sailor/SailorCard";
import { SkinPicker } from "@/components/sailor/SkinPicker";
import { BadgeWall } from "@/components/sailor/BadgeWall";
import { NicknameForm } from "@/components/sailor/NicknameForm";
import { RecoverySection } from "@/components/sailor/RecoverySection";
import { MyPlaylists } from "@/components/sailor/MyPlaylists";
import { SocialEntries } from "@/components/sailor/SocialEntries";
import { useIdentityStore } from "@/stores/identity";
import styles from "./SailorPage.module.css";

/**
 * 星尘船员证页（FR-9）：代号/昵称/等级称号/羁绊 + 收集系统（皮肤/徽章）+ 跨设备找回
 * 身份 bootstrap 在本页挂载时执行（首页由 BottleSection 执行，双向兼容）
 */
export function SailorPage() {
  const sailor = useIdentityStore((s) => s.sailor);
  const status = useIdentityStore((s) => s.status);
  const bootstrap = useIdentityStore((s) => s.bootstrap);

  useEffect(() => {
    const cleanup = bootstrap();
    return cleanup;
  }, [bootstrap]);

  return (
    <main className={`section ${styles.page}`}>
      <SectionHead
        tag="SAILOR CERT"
        title="星尘船员证"
        subtitle="零注册的身份，只属于你。匿名，是星海的规则。"
      />

      {sailor ? (
        <>
          <div className={styles.grid}>
            <SailorCard />
            <div className={styles.column}>
              <NicknameForm />
              <SkinPicker />
              <BadgeWall />
              <RecoverySection />
            </div>
          </div>
          {/* P0 F-01/F-04：我的收藏 · 我的关注 · 我的漂流（社交入口区） */}
          <SocialEntries />
          {/* P2-01/02：我的歌单（收藏 + 自建） */}
          <MyPlaylists />
        </>
      ) : status === "offline" ? (
        <p className={styles.empty}>星海暂时无风，船员证稍后再发。</p>
      ) : (
        <p className={styles.empty}>正在发放船员证…</p>
      )}
    </main>
  );
}
