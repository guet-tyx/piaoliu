"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useChatStore } from "@/stores/chat";
import { useTtsStore } from "@/stores/tts";
import { usePlayerStore } from "@/stores/player";
import { useLifeStatusStore } from "@/stores/lifeStatus";
import { lifePoolOf, pickLifeStatus, lifeIntervalOf, channelLifeOf } from "@/data/life-status";

/**
 * 角色生活状态驱动（PRD 需求③，唯一消费者 ChatHeader）：
 * - 递归 setTimeout 轮换，间隔按时段动态（白天 30s / 深夜 45s / 午夜 60s）；
 * - AI 回复中暂停；输入框聚焦（用户正在输入）跳过本次切换；
 * - 切后台暂停，回来显示「🕊️ 刚回来」5s 后恢复随机；
 * - 合并展示：error→不显示生活段 / thinking·streaming→固定文案 /
 *   TTS 朗读中→「🎤 正在说话」/ 频道在播→「正在听{频道名}」/ 否则轮换状态。
 */

/** 切后台回来「刚回来」展示时长 */
const JUST_BACK_MS = 5000;
/** 恢复时判定「离开太久」阈值（>5min 显示刚回来，PRD §2.3） */
const AWAY_STALE_MS = 5 * 60 * 1000;

export interface DisplayedLifeStatus {
  key: string;
  icon: string;
  text: string;
}

export function useLifeStatus(roleId: string) {
  const chatStatus = useChatStore((s) => s.status[roleId] ?? "idle");
  const ttsPlaying = useTtsStore((s) => s.playingKey !== null);
  const channelId = usePlayerStore((s) => s.channelId);
  const channelPlaying = usePlayerStore((s) => s.isPlaying);

  const life = useLifeStatusStore((s) => s.byRole[roleId]);
  const justBack = useLifeStatusStore((s) => s.justBackByRole[roleId] ?? false);

  /** 轮换：随机取一条并落盘（读 store 当前 key 避免闭包过期） */
  const rotate = useCallback(() => {
    const s = useLifeStatusStore.getState();
    const cur = s.byRole[roleId];
    const next = pickLifeStatus(lifePoolOf(roleId), cur?.key, new Date().getHours() < 6);
    s.setStatus(roleId, next);
  }, [roleId]);

  // 挂载：幂等恢复 + 陈旧性判定（离开太久 → 「刚回来」）
  useEffect(() => {
    const s = useLifeStatusStore.getState();
    s.restore(roleId);
    const cur = s.byRole[roleId];
    if (cur && Date.now() - cur.at > AWAY_STALE_MS) {
      s.setJustBack(roleId, true);
      const t = window.setTimeout(() => {
        useLifeStatusStore.getState().setJustBack(roleId, false);
      }, JUST_BACK_MS);
      return () => window.clearTimeout(t);
    }
  }, [roleId]);

  // 轮换定时器（动态间隔；AI 回复中暂停；输入聚焦跳过）+ 切后台暂停
  useEffect(() => {
    if (chatStatus !== "idle") return;
    let timer: number | null = null;
    let disposed = false;

    const tick = () => {
      if (disposed) return;
      // 用户正在输入（textarea 聚焦）：本次不切换，稍后再试
      if (document.activeElement?.tagName === "TEXTAREA") {
        timer = window.setTimeout(tick, 5000);
        return;
      }
      rotate();
      timer = window.setTimeout(tick, lifeIntervalOf(new Date()));
    };
    timer = window.setTimeout(tick, lifeIntervalOf(new Date()));

    let awayAt = 0;
    const onVis = () => {
      if (document.hidden) {
        awayAt = Date.now();
        return;
      }
      // 切回前台：任何离开时长都显示「刚回来」，5s 后恢复随机（验收用例 4）
      if (awayAt) {
        const s = useLifeStatusStore.getState();
        s.setJustBack(roleId, true);
        window.setTimeout(() => {
          if (disposed) return;
          s.setJustBack(roleId, false);
          rotate();
        }, JUST_BACK_MS);
      }
      awayAt = 0;
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      disposed = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [roleId, chatStatus, rotate]);

  // 合并展示计算（优先级：异常 > AI 状态 > TTS > 频道 > 刚回来 > 轮换）
  const pool = lifePoolOf(roleId);
  const displayed: DisplayedLifeStatus | null = (() => {
    if (chatStatus === "error") return null; // 异常不显示生活段
    if (chatStatus === "thinking") return pool?.thinking ?? null;
    if (chatStatus === "streaming") return pool?.streaming ?? null;
    if (ttsPlaying) return { key: "tts-speaking", icon: "🎤", text: "正在说话" };
    if (channelId && channelPlaying) return channelLifeOf(channelId);
    if (justBack) return { key: "just-back", icon: "🕊️", text: "刚回来" };
    if (life) return { key: life.key, icon: life.icon, text: life.text };
    return null;
  })();

  // 悬停细节：按状态 key 确定性取一条（状态变化时 tooltip 跟着变，不随渲染抖动）
  const tooltip = useMemo(() => {
    if (!displayed || !pool) return "";
    const tips = pool.tooltips;
    if (tips.length === 0) return "";
    let h = 0;
    for (const ch of displayed.key) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return tips[((h % tips.length) + tips.length) % tips.length];
  }, [displayed, pool]);

  return { displayed, tooltip, rotate };
}
