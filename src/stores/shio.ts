import { create } from "zustand";
import { CHARACTER_LINES, shioSlotOf, type ShioLine, type ShioSlot } from "@/data/shio-lines";
import { greetingKey, readStorage, writeStorage } from "@/lib/storage";
import { localDate } from "@/lib/time";
import { pickRandom } from "@/lib/random";

interface SavedGreeting {
  /** 本地日期 YYYY-MM-DD（同日不重复） */
  date: string;
  lineId: string;
}

/** 角色的单日问候（含时段） */
export interface CharacterGreeting {
  line: ShioLine;
  slot: ShioSlot;
}

/**
 * 角色每日一句（FR-8 扩展版，V2.2）：
 * 4 位星海守望者各按客户端时段（深夜/清晨/日常）从各自白名单库选句，
 * 每角色独立同日不重复、独立持久化（drift-greeting-<roleId>）；
 * 首次访问当日必有问候。
 */
interface ShioState {
  greetings: Record<string, CharacterGreeting>;
  /** 每日首次挂载/切换角色时调用：按角色与当日时段选句并持久化 */
  ensureDailyGreeting: (roleId: string) => void;
}

export const useShioStore = create<ShioState>()((set) => ({
  greetings: {},

  ensureDailyGreeting: (roleId) => {
    const poolBySlot = CHARACTER_LINES[roleId];
    if (!poolBySlot) return; // 未知角色直接跳过（防数据漂移）

    const today = localDate();
    const saved = readStorage<SavedGreeting>(greetingKey(roleId), null);
    const slot = shioSlotOf(new Date().getHours());

    if (saved && saved.date === today) {
      // 同日已问候：恢复该角色当日选的同一句（跨路由刷新保持一致）
      const line = poolBySlot[slot].find((l) => l.id === saved.lineId) ?? poolBySlot[slot][0];
      set((s) => ({ greetings: { ...s.greetings, [roleId]: { line, slot } } }));
      return;
    }

    // 新的一天：按当前时段随机选句（运行期随机，非渲染期）
    const pool = poolBySlot[slot];
    const line = pickRandom(pool) ?? pool[0];
    writeStorage(greetingKey(roleId), { date: today, lineId: line.id });
    set((s) => ({ greetings: { ...s.greetings, [roleId]: { line, slot } } }));
  },
}));
