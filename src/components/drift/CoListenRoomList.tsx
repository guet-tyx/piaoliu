"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { SectionHead } from "@/components/shared/SectionHead";
import { useColistenStore } from "@/stores/colisten";
import { usePlayerStore } from "@/stores/player";
import { timeAgo } from "@/lib/time";
import { TeahouseEntry } from "./TeahouseEntry";
import styles from "./CoListenRoomList.module.css";

/**
 * 星海共听房间列表（P2）：活跃房间按最近活跃降序，
 * 显示当前歌曲 + 在线人数；空态引导从歌曲处开房。
 * P3 A-02：顶部固定展示活动窗口内的「星海茶话会」入口。
 */
export function CoListenRoomList() {
  const rooms = useColistenStore((s) => s.rooms);
  const loading = useColistenStore((s) => s.loading);
  const refresh = useColistenStore((s) => s.refresh);
  const create = useColistenStore((s) => s.create);
  const refreshTeahouse = useColistenStore((s) => s.refreshTeahouse);
  const [toast, setToast] = useState<string | null>(null);

  // 播放器当前曲（用当前播放的歌开房）
  const playerTrack = usePlayerStore((s) => s.tracks[s.currentIndex]);

  useEffect(() => {
    refresh();
    refreshTeahouse();
  }, [refresh, refreshTeahouse]);

  const onCreateFromPlayer = async () => {
    if (!playerTrack) {
      setToast("播放器里还没有歌，先去电台放一首吧。");
      return;
    }
    const roomId = await create({
      id: playerTrack.id,
      t: playerTrack.t,
      tag: playerTrack.tag,
      s: playerTrack.s,
      cover: playerTrack.cover,
    });
    if (roomId) window.location.href = `/drift/colisten/${roomId}`;
    else setToast("星海暂时无风，稍后再试。");
  };

  return (
    <main className={`section ${styles.page}`}>
      <SectionHead
        tag="COLISTEN"
        title="星海共听"
        subtitle="同一首歌，同一片星海——房间内匿名弹幕，一起听。"
      />

      {/* P3 A-02 星海茶话会入口（仅活动窗口内显示） */}
      <TeahouseEntry />

      <div className={styles.toolbar}>
        {playerTrack && (
          <button type="button" className={styles.createBtn} onClick={onCreateFromPlayer}>
            🎧 用「{playerTrack.t}」开一间房
          </button>
        )}
        <span className={styles.hint}>从广场卡片 / 留言墙 / 播放器也能一键开房</span>
      </div>

      {loading ? (
        <p className={styles.empty}>正在打捞活跃的房间…</p>
      ) : rooms.length === 0 ? (
        <div className={styles.emptyBox}>
          <p className={styles.empty}>还没有共听房间。放一首歌，开一间吧。</p>
          <Link href="/#player" className={styles.launchLink}>
            🎧 去电台放首歌
          </Link>
        </div>
      ) : (
        <div className={styles.list}>
          {rooms.map((r) => {
            const online = (r.ghosts?.length ?? 0) + 1;
            return (
              <Link key={r.id} href={`/drift/colisten/${r.id}`} className={styles.room}>
                <Image
                  src={r.startTrack.cover}
                  alt=""
                  width={56}
                  height={56}
                  className={styles.cover}
                />
                <div className={styles.meta}>
                  <p className={styles.title}>{r.title}</p>
                  <p className={styles.track}>
                    🎵 {r.startTrack.t} · {r.startTrack.tag}
                  </p>
                  <p className={styles.sub}>
                    {r.createdBy} 开房 · {timeAgo(r.createdAt)}
                  </p>
                </div>
                <span className={styles.online}>👥 {online}</span>
                <span className={styles.join}>加入 →</span>
              </Link>
            );
          })}
        </div>
      )}

      {toast && <p className={styles.toast}>{toast}</p>}
    </main>
  );
}