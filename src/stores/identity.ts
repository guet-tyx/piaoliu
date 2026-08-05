import { create } from "zustand";
import {
  bumpStat,
  checkBadges,
  claimRecoveryCode,
  earnBond,
  genRecoveryCode,
  getLocalSailorSync,
  getOrCreateSailor,
  mapSailorRow,
  pushListen,
  resetListenStreak,
  updateNickname,
  type BondKind,
} from "@/lib/api/sailor";
import { reportQuest, type QuestRewardResult } from "@/lib/api/quests";
import { useQuestStore } from "@/stores/quests";
import { ensureAnonSession, isSupabaseReady } from "@/lib/supabase/anon";
import { getSupabase } from "@/lib/supabase/client";
import { useDanmakuStore } from "@/stores/danmaku";
import { readStorage, writeStorage, STORAGE } from "@/lib/storage";
import { pickRandom } from "@/lib/random";
import { levelOfBond, SKINS, titleOf } from "@/data/collection";
import {
  BOND_MILESTONE_KINDS,
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

/** 选取行为回应台词（同类 7 天不重复；池耗尽时兜底随机） */
function pickResponse(kind: ShioResponseKind): ShioLine {
  const records = readStorage<ResponseRecord[]>(STORAGE.responsesRecent, []);
  const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
  const used = new Set(
    records.filter((r) => r.kind === kind && r.at > cutoff).map((r) => r.lineId),
  );
  const pool = SHIO_RESPONSES[kind].filter((l) => !used.has(l.id));
  // 池耗尽时回退整池首句（保持原语义：同类 7 天不重复是尽力而为）
  const line = pickRandom(pool) ?? SHIO_RESPONSES[kind][0];
  records.push({ kind, lineId: line.id, at: Date.now() });
  // 每类保留最近 14 条，防无限增长
  const trimmed = records
    .filter((r) => r.kind === kind)
    .slice(-14);
  writeStorage(STORAGE.responsesRecent, [
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
  /** P1 F-05：一次性发放 N 点羁绊（任务奖励/全勤/连续奖励） */
  rewardBond: (points: number) => Promise<void>;
  /** P1 F-05：解锁徽章（连续任务奖励；真实模式 badges 以本地为准，符合需求 localStorage-first） */
  unlockBadge: (badgeId: string) => void;
  /** P1 F-05：结算任务奖励结果（单任务 + 全勤 + 连续奖励）并同步任务面板 */
  applyQuestReward: (r: QuestRewardResult) => Promise<void>;
  /** 生成找回码 */
  recoveryCode: () => Promise<string | null>;
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

    // 匿名身份引导（真实模式）就绪后再取船员证——消除「signInAnonymously 未完成
    // 就调 RPC 被拒 → 首屏误报 offline」的竞态；cancel 防 unmount 后 setState
    let cancel = false;
    let authCleanup: (() => void) | null = null;

    ensureAnonSession()
      .then((cleanup) => {
        authCleanup = cleanup;
        if (cancel) return;
        return getOrCreateSailor();
      })
      .then((s) => {
        if (cancel) return;
        set(s ? { sailor: s, status: "ready", title: titleOf(s.level) } : { status: "offline" });
        // 航行 1 天 +1 羁绊（每日一次）
        if (s) get().bond("daily", true);
      })
      .catch(() => {
        if (!cancel) set({ status: "offline" });
      });

    return () => {
      cancel = true;
      authCleanup?.();
    };
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
    // P1 F-05 月船：需持有「月船船客」徽章（连续 30 天任务奖励）
    if (skin.unlockBadge && !sailor.badges.includes(skin.unlockBadge)) return false;
    sailor.bottleStyle = skinId;
    // 本地模拟直接持久化（真实模式由 RPC 同步）
    writeStorage(STORAGE.sailor, sailor);
    set({ sailor: { ...sailor } });
    return true;
  },

  bond: async (kind, oncePerDay = false) => {
    const prev = get().sailor?.bondValue ?? 0;
    const sailor = await earnBond(kind, oncePerDay);
    if (sailor) {
      set({ sailor, title: titleOf(sailor.level) });
      // 羁绊里程碑（V2.0）：跨过 10/20/30 触发汐专属回应（7 天去重复用现有机制）
      for (const kind of BOND_MILESTONE_KINDS) {
        const milestone = Number(kind.split("-")[1]);
        if (prev < milestone && sailor.bondValue >= milestone) {
          get().respond(kind);
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
      writeStorage(STORAGE.sailor, sailor);
      set({ sailor: { ...sailor } });
    }
    // P1 F-05 任务埋点：拾瓶/回信推动每日任务（fire-and-forget，不阻塞行为链路）
    // noteAction 用漂流瓶词汇（picked/replied），任务接口用任务词汇（pick/reply），传入前映射
    const questKind = kind === "picked" ? "pick" : kind === "replied" ? "reply" : kind;
    if (questKind === "pick" || questKind === "reply") {
      void (async () => {
        const r = await reportQuest(questKind);
        if (r) {
          await get().applyQuestReward(r);
          useQuestStore.getState().applyResult(r);
        }
      })();
    }
  },

  noteListen: (trackId) => {
    const sailor = get().sailor;
    if (!sailor) return;
    const stats = pushListen(trackId);
    // 真实模式：切歌上报服务端（周报收听数据源；fire-and-forget，失败静默不阻塞连听/羁绊）
    if (isSupabaseReady()) {
      void (async () => {
        try {
          await getSupabase()?.rpc("record_listen", { p_track_id: trackId });
        } catch {
          // 静默
        }
      })();
    }
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
      writeStorage(STORAGE.sailor, sailor);
      set({ sailor: { ...sailor } });
    }
    // P1 F-05 任务埋点：听歌推进「听歌 3 首」（当日去重曲目，trackId 传入）
    void (async () => {
      const r = await reportQuest("listen", trackId);
      if (r) {
        await get().applyQuestReward(r);
        useQuestStore.getState().applyResult(r);
      }
    })();
  },

  resetListen: () => {
    // 暂停时重置连续计数（不更新徽章）
    resetListenStreak();
  },

  rewardBond: async (points) => {
    if (points <= 0 || !get().sailor) return;
    if (!isSupabaseReady()) {
      const sailor = getLocalSailorSync();
      if (!sailor) return;
      const updated = {
        ...sailor,
        bondValue: sailor.bondValue + points,
        level: levelOfBond(sailor.bondValue + points),
      };
      writeStorage(STORAGE.sailor, updated);
      set({ sailor: updated, title: titleOf(updated.level) });
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.rpc("reward_quest", { p_amount: points });
    if (data) {
      const sailor = mapSailorRow(data);
      if (sailor) set({ sailor, title: titleOf(sailor.level) });
    }
  },

  unlockBadge: (badgeId) => {
    const sailor = get().sailor;
    if (!sailor || sailor.badges.includes(badgeId)) return;
    sailor.badges = [...sailor.badges, badgeId];
    // 徽章以本地为准（需求「跨设备时以 localStorage 记录为准」）
    writeStorage(STORAGE.sailor, sailor);
    set({ sailor: { ...sailor } });
  },

  applyQuestReward: async (r) => {
    // 单任务/全勤奖励 + 14 天连续一次性奖励
    await get().rewardBond(r.reward);
    for (const badgeId of r.badgesToUnlock) get().unlockBadge(badgeId);
    if (r.streak14Reward) await get().rewardBond(5);
  },

  recoveryCode: () => genRecoveryCode(),

  claim: async (code) => {
    const result = await claimRecoveryCode(code);
    if (!result.ok) return false;
    set({ sailor: result.sailor, title: titleOf(result.sailor.level), status: "ready" });
    return true;
  },
}));
