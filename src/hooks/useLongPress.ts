"use client";

import { useEffect, useRef } from "react";

interface LongPressHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
}

/**
 * R4 移动端长按检测（2026-08-03）：
 * - 按压 0.5s（可配置）触发 onTrigger，只触发一次；
 * - touchmove（列表滚动）/ 提前抬起 / 取消 时复位计时；
 * - PC 端不绑定（桌面走悬浮操作栏），故仅 touch 事件。
 */
export function useLongPress(
  onTrigger: () => void,
  { delay = 500 }: { delay?: number } = {},
): LongPressHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);
  const onTriggerRef = useRef(onTrigger);
  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  const clear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    firedRef.current = false;
  };

  return {
    onTouchStart: () => {
      clear();
      timerRef.current = setTimeout(() => {
        if (!firedRef.current) {
          firedRef.current = true;
          onTriggerRef.current();
        }
      }, delay);
    },
    onTouchMove: clear,
    onTouchEnd: clear,
    onTouchCancel: clear,
  };
}
