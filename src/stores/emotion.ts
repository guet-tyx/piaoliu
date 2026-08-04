"use client";

import { create } from "zustand";
import {
  defaultEmotion,
  isEmotionState,
  updateEmotion,
  type EmotionState,
} from "@/data/emotion";
import { emotionKey, readStorage, writeStorage } from "@/lib/storage";

/**
 * 角色情感状态 store（人机感 P1-④）：
 * 持久化 drift-emotion-<roleId>，聊天空态恢复；send 时按用户输入更新情绪，
 * 最新状态随 /api/chat 请求携带，供服务端注入「当前状态」与动态温度。
 */
interface EmotionStore {
  emotions: Record<string, EmotionState>;
  /** 按用户输入更新某角色情绪并持久化；返回最新状态（供 chat store 组装请求） */
  update: (roleId: string, userText: string) => EmotionState;
  /** 挂载时按需恢复某角色情绪（懒加载，缺省用默认状态） */
  restore: (roleId: string) => void;
  /** 清空会话时重置该角色情绪 */
  clear: (roleId: string) => void;
}

export const useEmotionStore = create<EmotionStore>()((set, get) => ({
  emotions: {},

  update: (roleId, userText) => {
    const prev = get().emotions[roleId] ?? defaultEmotion(roleId);
    const next = updateEmotion(prev, userText);
    set((s) => ({ emotions: { ...s.emotions, [roleId]: next } }));
    writeStorage(emotionKey(roleId), next);
    return next;
  },

  restore: (roleId) => {
    if (roleId in get().emotions) return;
    const saved = readStorage<EmotionState | null>(emotionKey(roleId), null, isEmotionState);
    set((s) => ({
      emotions: { ...s.emotions, [roleId]: saved ?? defaultEmotion(roleId) },
    }));
  },

  clear: (roleId) => {
    set((s) => {
      const next = { ...s.emotions };
      delete next[roleId];
      return { emotions: next };
    });
    try {
      localStorage.removeItem(emotionKey(roleId));
    } catch {
      // 隐私模式等场景忽略
    }
  },
}));
