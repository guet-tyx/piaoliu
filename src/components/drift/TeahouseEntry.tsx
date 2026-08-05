"use client";

import { useState } from "react";
import { useColistenStore } from "@/stores/colisten";
import { ensureTeahouseRoom } from "@/lib/colisten/teahouse";
import styles from "./CoListenRoomList.module.css";

/**
 * P3 A-02 星海茶话会入口（共听房间列表页顶部）：
 * 仅活动窗口内显示（非茶话会时间 store.teahouse 为 null，不渲染）。
 * 点击入场：惰性建房（首次创建，幂等）后跳转房间页。
 */
export function TeahouseEntry() {
  const info = useColistenStore((s) => s.teahouse);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!info) return null;

  // 入口展示时间（本地时区，如「今晚 22:00 汐主持」）
  const startLabel = hourLabel(info.startAt);
  const endLabel = hourLabel(info.endAt);

  const enter = async () => {
    setBusy(true);
    setError(null);
    const room = await ensureTeahouseRoom(info);
    setBusy(false);
    if (room) {
      window.location.href = `/drift/colisten/${room.id}`;
    } else {
      setError("星海暂时无风，稍后再试。");
    }
  };

  return (
    <div className={styles.entry}>
      <span className={styles.entryIcon} aria-hidden="true">
        🌟
      </span>
      <div className={styles.entryMeta}>
        <p className={styles.entryTitle}>
          星海茶话会 · 今晚 {startLabel} {info.roleName}主持
        </p>
        <p className={styles.entrySub}>
          {info.theme} · {startLabel}-{endLabel}
        </p>
        {error && <p className={styles.entryError}>{error}</p>}
      </div>
      <button
        type="button"
        className={styles.entryBtn}
        disabled={busy}
        onClick={() => void enter()}
      >
        {busy ? "入场中…" : "🎧 进入房间"}
      </button>
    </div>
  );
}

/** 时间戳 → 「22:00」样式本地小时 */
function hourLabel(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:00`;
}