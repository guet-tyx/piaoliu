"use client";

import { useState } from "react";
import { useIdentityStore } from "@/stores/identity";
import { isSafeText } from "@/lib/api/moderation";
import styles from "./NicknameForm.module.css";

/**
 * 昵称自定义（FR-9.1）：1-12 字 + 敏感词即时校验 + 即时生效
 */
export function NicknameForm() {
  const sailor = useIdentityStore((s) => s.sailor);
  const rename = useIdentityStore((s) => s.rename);
  const [value, setValue] = useState(sailor?.nickname ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const len = value.trim().length;
  const safe = isSafeText(value);
  const valid = len >= 1 && len <= 12 && safe.ok;

  const onSubmit = async () => {
    if (!valid) return;
    const success = await rename(value);
    setOk(success);
    setMsg(
      success
        ? "昵称已生效。星海会记住这个名字。"
        : "改名失败，稍后再试。",
    );
    window.setTimeout(() => setOk(false), 2600);
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>昵称</h3>
      <p className={styles.desc}>1-12 字，可随时更换。匿名保护：昵称不会被搜索。</p>
      <div className={styles.row}>
        <input
          className={styles.input}
          value={value}
          maxLength={12}
          placeholder="输入你的昵称…"
          aria-label="船员证昵称"
          onChange={(e) => {
            setValue(e.target.value);
            setMsg(null);
          }}
        />
        <button
          className={styles.btn}
          type="button"
          disabled={!valid}
          onClick={onSubmit}
        >
          保存
        </button>
      </div>
      {!safe.ok && <p className={styles.warn}>名字里有不能上船的文字。</p>}
      {safe.ok && len > 12 && <p className={styles.warn}>最多 12 字。</p>}
      {msg && <p className={ok ? styles.ok : styles.warn}>{msg}</p>}
    </div>
  );
}
