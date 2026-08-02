import { create } from "zustand";
import { SHIO_LINES, shioSlotOf, type ShioLine, type ShioSlot } from "@/data/shio-lines";

const GREETING_KEY = "drift-greeting";

interface SavedGreeting {
  /** 本地日期 YYYY-MM-DD（同日不重复） */
  date: string;
  lineId: string;
}

function localDate(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function readSaved(): SavedGreeting | null {
  try {
    const raw = localStorage.getItem(GREETING_KEY);
    return raw ? (JSON.parse(raw) as SavedGreeting) : null;
  } catch {
    return null;
  }
}

function writeSaved(g: SavedGreeting) {
  try {
    localStorage.setItem(GREETING_KEY, JSON.stringify(g));
  } catch {
    // 隐私模式等场景忽略写入失败
  }
}

/**
 * 汐的每日一句（FR-8 最小版）：
 * 按客户端时段（深夜/清晨/日常）从白名单库选句，同日不重复；
 * 首次访问当日必有问候。行为回应/羁绊值排 V1.2。
 */
interface ShioState {
  greeting: ShioLine | null;
  slot: ShioSlot | null;
  /** 每日首次挂载时调用：按当日时段选句并持久化 */
  ensureDailyGreeting: () => void;
}

export const useShioStore = create<ShioState>()((set) => ({
  greeting: null,
  slot: null,

  ensureDailyGreeting: () => {
    const today = localDate();
    const saved = readSaved();

    if (saved && saved.date === today) {
      // 同日已问候：恢复昨日选的同一句（跨路由刷新保持一致）
      const slot = shioSlotOf(new Date().getHours());
      const line =
        SHIO_LINES[slot].find((l) => l.id === saved.lineId) ?? SHIO_LINES[slot][0];
      set({ greeting: line, slot });
      return;
    }

    // 新的一天：按当前时段随机选句（运行期随机，非渲染期）
    const slot = shioSlotOf(new Date().getHours());
    const pool = SHIO_LINES[slot];
    const line = pool[Math.floor(Math.random() * pool.length)];
    writeSaved({ date: today, lineId: line.id });
    set({ greeting: line, slot });
  },
}));
