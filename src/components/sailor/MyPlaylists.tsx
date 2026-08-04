"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PLAYLISTS } from "@/data/playlists";
import { usePlayerStore } from "@/stores/player";
import { bootstrapUgc, useUgcPlaylistsStore } from "@/stores/ugcPlaylists";
import { PlaylistCard } from "@/components/playlist/PlaylistCard";
import { CreatePlaylistModal } from "@/components/playlist/CreatePlaylistModal";
import styles from "./MyPlaylists.module.css";

/**
 * 「我的歌单」区块（P2-01/02）：挂在船员证页底部
 * 收藏的官方歌单 + 自建歌单 + 新建入口；空态引导去歌单广场。
 */
export function MyPlaylists() {
  const likedPlaylistIds = usePlayerStore((s) => s.likedPlaylistIds);
  const ugc = useUgcPlaylistsStore((s) => s.playlists);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    bootstrapUgc();
  }, []);

  const favPlaylists = PLAYLISTS.filter((p) => likedPlaylistIds.includes(p.id));
  const isEmpty = favPlaylists.length === 0 && ugc.length === 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h2 className={styles.title}>🎵 我的歌单</h2>
        <button type="button" className={styles.createBtn} onClick={() => setCreateOpen(true)}>
          + 新建歌单
        </button>
      </div>

      {isEmpty ? (
        <p className={styles.empty}>
          还没有收藏歌单，去星海逛逛吧 ——{" "}
          <Link href="/playlist" className={styles.emptyLink}>
            去歌单广场 →
          </Link>
        </p>
      ) : (
        <>
          {favPlaylists.length > 0 && (
            <div className={styles.group}>
              <p className={styles.groupLabel}>收藏的歌单</p>
              <div className={styles.grid}>
                {favPlaylists.map((p) => (
                  <PlaylistCard key={p.id} playlist={p} />
                ))}
              </div>
            </div>
          )}

          {ugc.length > 0 && (
            <div className={styles.group}>
              <p className={styles.groupLabel}>自建歌单</p>
              <div className={styles.grid}>
                {ugc.map((p) => (
                  <PlaylistCard key={p.id} playlist={p} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <CreatePlaylistModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}