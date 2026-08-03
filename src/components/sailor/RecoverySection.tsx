"use client";

import { useState } from "react";
import { useIdentityStore } from "@/stores/identity";
import styles from "./RecoverySection.module.css";

/**
 * 跨设备找回（FR-9.3 渐进实现）：
 * 生成找回码（本地模拟：码 ↔ 船员证快照映射）→ 新设备输入码恢复。
 * 真实模式（claim_recovery RPC）联调后启用，UI 不变。
 */
export function RecoverySection() {
  const recoveryCode = useIdentityStore((s) => s.recoveryCode);
  const claim = useIdentityStore((s) => s.claim);
  const [code, setCode] = useState("");
  const [generated, setGenerated] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [generating, setGenerating] = useState(false);

  const onGen = async () => {
    setGenerating(true);
    try {
      const c = await recoveryCode();
      setGenerated(c);
      setMsg(
        c
          ? { text: "保存好这串码。换设备时输入它，就能找回你的船员证。", ok: true }
          : { text: "生成失败，稍后再试。", ok: false },
      );
    } finally {
      setGenerating(false);
    }
  };

  const onClaim = async () => {
    const ok = await claim(code);
    setMsg(
      ok
        ? { text: "船员证已恢复。欢迎回来，船客。", ok: true }
        : { text: "找回码无效，请检查后重试。", ok: false },
    );
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>跨设备找回</h3>
      <p className={styles.desc}>
        匿名保护：找回码不落服务端明文（哈希存储），生成后可随时作废。
      </p>
      <div className={styles.genRow}>
        <button className={styles.genBtn} type="button" disabled={generating} onClick={onGen}>
          {generating ? "生成中…" : "生成找回码"}
        </button>
        {generated && <code className={styles.code}>{generated}</code>}
      </div>
      <div className={styles.claimRow}>
        <input
          className={styles.input}
          value={code}
          placeholder="在新设备输入找回码…"
          aria-label="找回码"
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <button
          className={styles.claimBtn}
          type="button"
          disabled={code.trim().length < 3}
          onClick={onClaim}
        >
          恢复
        </button>
      </div>
      {msg && <p className={msg.ok ? styles.ok : styles.warn}>{msg.text}</p>}
    </div>
  );
}
