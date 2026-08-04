"use client";

import { usePlayerStore } from "@/stores/player";
import styles from "./VoiceToggle.module.css";

/**
 * 主持人语音开关（TTS，PRD 需求② §2.4）：电台区域右上角胶囊
 * 关闭后切换频道/换曲只显示文字气泡，不播语音（useHostTrigger 内部判断并停止）。
 */
export function VoiceToggle() {
  const hostVoiceOn = usePlayerStore((s) => s.hostVoiceOn);
  const toggleHostVoice = usePlayerStore((s) => s.toggleHostVoice);

  return (
    <button
      type="button"
      className={`${styles.toggle}${hostVoiceOn ? ` ${styles.on}` : ""}`}
      aria-label="主持人语音开关"
      aria-pressed={hostVoiceOn}
      onClick={toggleHostVoice}
    >
      🔊 {hostVoiceOn ? "语音开" : "语音关"}
    </button>
  );
}
