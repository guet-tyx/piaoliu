"use client";

import { create } from "zustand";
import { lifePoolOf, pickLifeStatus, type LifeStatus } from "@/data/life-status";

/**
 * 角色生活状态 store（PRD 需求③）：
 * 每角色当前「生活状态」+ localStorage 持久化（drift-life-status-<roleId>，刷新恢复），
 * 以及「刚回来」标记（切后台返回时显示 5s）。
 * 轮换时机由 src/hooks/useLifeStatus.ts 驱动，本 store 只存状态与落盘。
 */

export interface LifeStatusState {
  key: string;
  icon: string;
  text: string;
  /** 状态产生时间戳（陈旧性判定：离开 >5min 显示「刚回来」） */
  at: number;
}

export interface LifeStatusStore {
  byRole: Record<string, LifeStatusState>;
  justBackByRole: Record<string, boolean>;
  /** 幂等恢复：仅当该角色未初始化时读 localStorage；无记录/损坏 → 随机一条并落盘 */
  restore: (roleId: string) => void;
  /** 写入某角色当前状态并持久化 */
  setStatus: (roleId: string, status: LifeStatus, at?: number) => void;
  /** 设置/清除「刚回来」标记 */
  setJustBack: (roleId: string, justBack: boolean) => void;
}

const KEY_PREFIX = "drift-life-status";

function lifeKey(roleId: string): string {
  return `${KEY_PREFIX}-${roleId}`;
}

/** 读持久化状态；无记录/损坏/缺字段 → null（调用方兜底随机） */
function readLocal(roleId: string): LifeStatusState | null {
  try {
    const raw = localStorage.getItem(lifeKey(roleId));
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<LifeStatusState>;
    if (
      typeof p?.key === "string" &&
      typeof p?.icon === "string" &&
      typeof p?.text === "string" &&
      typeof p?.at === "number"
    ) {
      return { key: p.key, icon: p.icon, text: p.text, at: p.at };
    }
    return null;
  } catch {
    return null;
  }
}

function writeLocal(roleId: string, state: LifeStatusState) {
  try {
    localStorage.setItem(lifeKey(roleId), JSON.stringify(state));
  } catch {
    // 隐私模式等忽略写入失败
  }
}

export const useLifeStatusStore = create<LifeStatusStore>()((set, get) => {
  /** 随机初始状态（按当前时段选池：深夜用安静池） */
  const randomOf = (roleId: string): LifeStatus =>
    pickLifeStatus(lifePoolOf(roleId), undefined, new Date().getHours() < 6);

  return {
    byRole: {},
    justBackByRole: {},

    restore: (roleId) => {
      if (roleId in get().byRole) return;
      const saved = readLocal(roleId);
      if (saved) {
        set((s) => ({ byRole: { ...s.byRole, [roleId]: saved } }));
        return;
      }
      // 无记录（首次/损坏/清空）：随机一条并落盘，下次打开可恢复
      const status = randomOf(roleId);
      const state = { ...status, at: Date.now() };
      set((s) => ({ byRole: { ...s.byRole, [roleId]: state } }));
      writeLocal(roleId, state);
    },

    setStatus: (roleId, status, at = Date.now()) => {
      const state = { ...status, at };
      set((s) => ({ byRole: { ...s.byRole, [roleId]: state } }));
      writeLocal(roleId, state);
    },

    setJustBack: (roleId, justBack) => {
      set((s) => ({ justBackByRole: { ...s.justBackByRole, [roleId]: justBack } }));
    },
  };
});
