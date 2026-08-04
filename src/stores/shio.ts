import { create } from "zustand";
import { CHARACTER_LINES, shioSlotOf, type ShioLine, type ShioSlot } from "@/data/shio-lines";

/** localStorage 键前缀：每个角色独立选句持久化（V2.2 由单键 drift-greeting 迁移） */
const GREETING_KEY_PREFIX = "drift-greeting";

/** 角色 id → 本地键 */
function greetingKey(roleId: string): string {
  return `${GREETING_KEY_PREFIX}-${roleId}`;
}

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

function readSaved(roleId: string): SavedGreeting | null {
  try {
    const raw = localStorage.getItem(greetingKey(roleId));
    return raw ? (JSON.parse(raw) as SavedGreeting) : null;
  } catch {
    return null;
  }
}

function writeSaved(roleId: string, g: SavedGreeting) {
  try {
    localStorage.setItem(greetingKey(roleId), JSON.stringify(g));
  } catch {
    // 隐私模式等场景忽略写入失败
  }
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
    const saved = readSaved(roleId);
    const slot = shioSlotOf(new Date().getHours());

    if (saved && saved.date === today) {
      // 同日已问候：恢复该角色当日选的同一句（跨路由刷新保持一致）
      const line = poolBySlot[slot].find((l) => l.id === saved.lineId) ?? poolBySlot[slot][0];
      set((s) => ({ greetings: { ...s.greetings, [roleId]: { line, slot } } }));
      return;
    }

    // 新的一天：按当前时段随机选句（运行期随机，非渲染期）
    const pool = poolBySlot[slot];
    const line = pool[Math.floor(Math.random() * pool.length)];
    writeSaved(roleId, { date: today, lineId: line.id });
    set((s) => ({ greetings: { ...s.greetings, [roleId]: { line, slot } } }));
  },
}));
