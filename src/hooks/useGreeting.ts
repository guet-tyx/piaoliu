"use client";

import { useState } from "react";
import { usePlayerStore } from "@/stores/player";
import { greetingPoolOf, pickGreeting } from "@/data/greetings";
import { readRecentGreetings, rememberGreeting, lastMessageAtOf } from "@/lib/greetings";

/**
 * 开场白（PRD 需求⑤）：聊天页空态问候语，每次打开只计算一次。
 * 选择依据：当前小时（时段） + player store 的 channelId（频道联动） +
 * 该角色最后一条消息 at（久别重逢）；避开最近 2 次用过的句子。
 * 注意在 useState 初始化器内直接读 localStorage（restore effect 尚未执行）。
 */
export function useGreeting(roleId: string): string {
  const [text] = useState(() => {
    const recent = readRecentGreetings(roleId);
    const picked = pickGreeting(
      greetingPoolOf(roleId),
      {
        hour: new Date().getHours(),
        channelId: usePlayerStore.getState().channelId,
        lastVisitAt: lastMessageAtOf(roleId),
      },
      recent,
    );
    rememberGreeting(roleId, picked.key);
    return picked.text;
  });
  return text;
}
