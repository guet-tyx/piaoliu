"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import type { HostBrief, HostLine } from "@/lib/colisten/teahouse";
import styles from "./CoListenRoomHost.module.css";

/**
 * P3 A-02 茶话会角色主持区：
 * 独立于船客弹幕区的「角色旁白」展示（角色头像 + 主题色），
 * 角色发言不进入弹幕列表、不参与弹幕频率控制。
 */
interface CoListenRoomHostProps {
  host: HostBrief;
  lines: HostLine[];
}

export function CoListenRoomHost({ host, lines }: CoListenRoomHostProps) {
  return (
    <section
      className={styles.hostBox}
      style={{ "--hostColor": host.color } as CSSProperties}
      aria-label={`${host.name}的主持旁白`}
    >
      <p className={styles.hostTitle}>
        ✦ {host.name}的旁白
        <em>角色主持</em>
      </p>
      <div className={styles.hostList}>
        {lines.length === 0 ? (
          <p className={styles.hostEmpty}>{host.name}正在挑歌…</p>
        ) : (
          lines.slice(-6).map((l) => (
            <p key={l.key} className={styles.hostLine}>
              <Image src={host.avatar} alt="" width={22} height={22} className={styles.hostAvatar} />
              <span>{l.text}</span>
            </p>
          ))
        )}
      </div>
    </section>
  );
}