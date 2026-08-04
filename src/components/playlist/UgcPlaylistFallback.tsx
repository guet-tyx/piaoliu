"use client";

import { useEffect } from "react";
import { notFound } from "next/navigation";
import { bootstrapUgc, useUgcPlaylistsStore } from "@/stores/ugcPlaylists";
import { PlaylistDetailPage } from "@/components/playlist/PlaylistDetailPage";

/**
 * UGC 歌单详情兜底（P2-02）：
 * 官方 PLAYLISTS 查不到时由客户端渲染——从 UGC store 取数据，
 * 命中则复用 PlaylistDetailPage（纯 props 组件），未命中 notFound()。
 */
export function UgcPlaylistFallback({ id }: { id: string }) {
  const playlists = useUgcPlaylistsStore((s) => s.playlists);
  const ready = useUgcPlaylistsStore((s) => s.ready);

  // 挂载时恢复 localStorage（effect 内读，SSR 安全）
  useEffect(() => {
    bootstrapUgc();
  }, []);

  if (!ready) {
    return (
      <div className="section" style={{ padding: "120px 24px", textAlign: "center", color: "var(--ink-3)" }}>
        正在加载歌单…
      </div>
    );
  }

  const ugc = playlists.find((p) => p.id === id);
  if (!ugc) notFound();

  return <PlaylistDetailPage playlist={ugc} />;
}