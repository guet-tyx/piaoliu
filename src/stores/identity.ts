import { create } from "zustand";
import {
  bumpStat,
  checkBadges,
  claimRecoveryCode,
  earnBond,
  genRecoveryCode,
  getLocalSailorSync,
  getOrCreateSailor,
  pushListen,
  resetListenStreak,
  updateNickname,
  type BondKind,
} from "@/lib/api/sailor";
import { ensureAnonSession } from "@/lib/supabase/anon";
import { useDanmakuStore } from "@/stores/danmaku";
import { SKINS, titleOf } from "@/data/collection";
import {
  SHIO_RESPONSES,
  type ShioLine,
  type ShioResponseKind,
} from "@/data/shio-lines";
import type { Sailor } from "@/types/social";

/** 身份状态：idle 引导中 / ready 就绪 / offline 后端不可用（本地游客模式已兜底） */
type IdentityStatus = "idle" | "ready" | "offline";

/** 汐回应 7 天去重记录 */
interface ResponseRecord {
  kind: string;
  lineId: string;
  at: number;
}

const RESPONSES_KEY = "drift-responses-recent";

function readResponses(): ResponseRecord[] {
  try {
    const raw = localStorage.getItem(RESPONSES_KEY);
    return raw ? (JSON.parse(raw) as ResponseRecord[]) : [];
  } catch {
    return [];
  }
}

function writeResponses(records: ResponseRecord[]) {
  try {
    localStorage.setItem(RESPONSES_KEY, JSON.stringify(records));
  } catch {
    // 隐私模式等场景忽略写入失败
  }
}

/** 选取行为回应台词（同类 7 天不重复；池耗尽时兜底随机） */
function pickResponse(kind: ShioResponseKind): ShioLine {
  const records = readResponses();
  const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
  const used = new Set(
    records.filter((r) => r.kind === kind && r.at > cutoff).map((r) => r.lineId),
  );
  const pool = SHIO_RESPONSES[kind].filter((l) => !used.has(l.id));
  const line = (pool.length > 0 ? pool : SHIO_RESPONSES[kind])[
    Math.floor(Math.random() * pool.length)
  ];
  records.push({ kind, lineId: line.id, at: Date.now() });
  // 每类保留最近 14 条，防无限增长
  const trimmed = records
    .filter((r) => r.kind === kind)
    .slice(-14);
  writeResponses([
    ...records.filter((r) => r.kind !== kind),
    ...trimmed,
  ]);
  return line;
}

/**
 * 星尘船员证状态（FR-9 身份底座，V1.2 激活昵称/羁绊/等级/皮肤/徽章）
 * bootstrap() 由使用方组件在 mount 时调用一次；返回 cleanup 供 effect 释放
 */
interface IdentityState {
  sailor: Sailor | null;
  status: IdentityStatus;
  /** 汐的最近一次行为回应（气泡展示） */
  response: { line: ShioLine; at: number } | null;
  /** 称号（由等级派生） */
  title: string;
  bootstrap: () => () => void;
  /** 昵称修改（1-12 字 + 敏感词校验） */
  rename: (nickname: string) => Promise<boolean>;
  /** 切换皮肤（校验解锁等级） */
  switchSkin: (skinId: string) => boolean;
  /** 羁绊 +1（oncePerDay 行为每日限一次） */
  bond: (kind: BondKind, oncePerDay?: boolean) => Promise<void>;
  /** 汐行为回应（7 天不重复） */
  respond: (kind: ShioResponseKind) => void;
  /** 行为计数 + 徽章刷新（投瓶/拾瓶/回信后调用） */
  noteAction: (kind: "launched" | "picked" | "replied") => void;
  /** 听歌记录 + 连续听歌推进（useBondTracker 调用；每满 3 首触发羁绊+回应；周报收听数据源） */
  noteListen: (trackId: string) => void;
  /** 听歌中断重置 */
  resetListen: () => void;
  /** 生成找回码 */
  recoveryCode: () => string | null;
  /** 输入找回码恢复 */
  claim: (code: string) => Promise<boolean>;
}

export const useIdentityStore = create<IdentityState>()((set, get) => ({
  sailor: null,
  status: "idle",
  response: null,
  title: titleOf(1),

  bootstrap: () => {
    // 本地模拟兜底：首帧即可显示船员证（客户端专属数据，须在 effect 后读取）
    const local = getLocalSailorSync();
    if (local) set({ sailor: local, status: "ready", title: titleOf(local.level) });

    // 匿名身份引导（真实模式）；cleanup 释放 onAuthStateChange 订阅
    const cleanup = ensureAnonSession();

    getOrCreateSailor()
      .then((s) => {
        set(s ? { sailor: s, status: "ready", title: titleOf(s.level) } : { status: "offline" });
        // 航行 1 天 +1 羁绊（每日一次）
        if (s) get().bond("daily", true);
      })
      .catch(() => set({ status: "offline" }));

    return cleanup;
  },

  rename: async (nickname) => {
    const result = await updateNickname(nickname);
    if (!result.ok) return false;
    set({ sailor: result.sailor, title: titleOf(result.sailor.level) });
    return true;
  },

  switchSkin: (skinId) => {
    const sailor = get().sailor;
    if (!sailor) return false;
    const skin = SKINS.find((s) => s.id === skinId);
    if (!skin || sailor.level < skin.unlockLevel) return false;
    sailor.bottleStyle = skinId;
    // 本地模拟直接持久化（真实模式由 RPC 同步）
    try {
      localStorage.setItem("drift-sailor", JSON.stringify(sailor));
    } catch {
      // 忽略
    }
    set({ sailor: { ...sailor } });
    return true;
  },

  bond: async (kind, oncePerDay = false) => {
    const prev = get().sailor?.bondValue ?? 0;
    const sailor = await earnBond(kind, oncePerDay);
    if (sailor) {
      set({ sailor, title: titleOf(sailor.level) });
      // 羁绊里程碑（V2.0）：跨过 10/20/30 触发汐专属回应（7 天去重复用现有机制）
      for (const milestone of [10, 20, 30]) {
        if (prev < milestone && sailor.bondValue >= milestone) {
          get().respond(`bond-${milestone}` as ShioResponseKind);
        }
      }
    }
  },

  respond: (kind) => {
    set({ response: { line: pickResponse(kind), at: Date.now() } });
  },

  noteAction: (kind) => {
    const sailor = get().sailor;
    if (!sailor) return;
    const stats = bumpStat(kind);
    // 首次投瓶：汐的「第一艘船」回应（FR-8.2）
    if (kind === "launched" && stats.launched === 1) {
      get().respond("first-launch");
    }
    const fresh = checkBadges(stats, sailor.badges);
    if (fresh.length > 0) {
      sailor.badges = [...sailor.badges, ...fresh];
      try {
        localStorage.setItem("drift-sailor", JSON.stringify(sailor));
      } catch {
        // 忽略
      }
      set({ sailor: { ...sailor } });
    }
  },

  noteListen: (trackId) => {
    const sailor = get().sailor;
    if (!sailor) return;
    const stats = pushListen(trackId);
    // 每满 3 首：羁绊 + 回应 + 重置计数（周报收听计数与羁绊解耦，pushListen 已独立记录）
    if (stats.listenStreak >= 3) {
      get().bond("listen", true);
      get().respond("listen3");
      resetListenStreak();
      // 系统事件弹幕（FR-11）
      useDanmakuStore.getState().pushSystem("有人一口气听完了三首歌", "listen", "pink");
    }
    const fresh = checkBadges(stats, sailor.badges);
    if (fresh.length > 0) {
      sailor.badges = [...sailor.badges, ...fresh];
      try {
        localStorage.setItem("drift-sailor", JSON.stringify(sailor));
      } catch {
        // 忽略
      }
      set({ sailor: { ...sailor } });
    }
  },

  resetListen: () => {
    // 暂停时重置连续计数（不更新徽章）
    resetListenStreak();
  },

  recoveryCode: () => genRecoveryCode(),

  claim: async (code) => {
    const result = await claimRecoveryCode(code);
    if (!result.ok) return false;
    set({ sailor: result.sailor, title: titleOf(result.sailor.level), status: "ready" });
    return true;
  },
}));
