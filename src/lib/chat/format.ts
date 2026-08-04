/** 聊天页共用格式化小工具（R1 V2.4） */

/** 消息时间戳 → HH:mm（右上/右下角） */
export function formatTime(at: number): string {
  const d = new Date(at);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** 今日推荐曲目下标（按日期确定性取模，全天稳定） */
const DAY_MS = 24 * 60 * 60 * 1000;

export function todayTrackIndex(count: number): number {
  return Math.floor(Date.now() / DAY_MS) % count;
}
