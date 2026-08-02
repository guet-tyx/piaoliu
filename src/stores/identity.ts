import { create } from "zustand";
import { getOrCreateSailor, getLocalSailorSync } from "@/lib/api/sailor";
import { ensureAnonSession } from "@/lib/supabase/anon";
import type { Sailor } from "@/types/social";

/** 身份状态：idle 引导中 / ready 就绪 / offline 后端不可用（本地游客模式已兜底） */
type IdentityStatus = "idle" | "ready" | "offline";

/**
 * 星尘船员证状态（FR-9 身份底座，V1.1 最小版：匿名代号）
 * bootstrap() 由使用方组件在 mount 时调用一次；返回 cleanup 供 effect 释放
 */
interface IdentityState {
  sailor: Sailor | null;
  status: IdentityStatus;
  bootstrap: () => () => void;
}

export const useIdentityStore = create<IdentityState>()((set) => ({
  sailor: null,
  status: "idle",

  bootstrap: () => {
    // 本地模拟兜底：首帧即可显示船员证（客户端专属数据，须在 effect 后读取）
    const local = getLocalSailorSync();
    if (local) set({ sailor: local, status: "ready" });

    // 匿名身份引导（真实模式）；cleanup 释放 onAuthStateChange 订阅
    const cleanup = ensureAnonSession();

    getOrCreateSailor()
      .then((s) => set(s ? { sailor: s, status: "ready" } : { status: "offline" }))
      .catch(() => set({ status: "offline" }));

    return cleanup;
  },
}));
