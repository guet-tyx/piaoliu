"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Modal.module.css";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** dialog 的可访问名称（对应内部标题 id） */
  labelledBy?: string;
  children: ReactNode;
}

/**
 * 通用模态：ESC/背景点击关闭、焦点陷阱（Tab 循环）、初始聚焦、背景滚动锁定；
 * 所有监听在 cleanup 中全量释放（STYLE_GUIDE 清理铁律）
 */
export function Modal({ open, onClose, labelledBy, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // 焦点陷阱：Tab / Shift+Tab 在面板内循环
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    panel?.addEventListener("keydown", onTab);
    const focusTimer = window.setTimeout(() => {
      panel
        ?.querySelector<HTMLElement>("button, [href], input, textarea, select")
        ?.focus();
    }, 0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      panel?.removeEventListener("keydown", onTab);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.mask}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        ref={panelRef}
      >
        {children}
      </div>
    </div>
  );
}
