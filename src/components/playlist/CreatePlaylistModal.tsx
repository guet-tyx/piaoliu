"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Modal } from "@/components/shared/Modal";
import { trackById } from "@/data/music-utils";
import { useUgcPlaylistsStore, UGC_COVER_OPTIONS, UGC_LIMITS } from "@/stores/ugcPlaylists";
import type { UgcPlaylist } from "@/types/music";
import { TrackPicker } from "./TrackPicker";
import styles from "./CreatePlaylistModal.module.css";

const TAG_OPTIONS = ["后摇", "日系", "电子", "纯音乐", "钢琴", "氛围", "动漫OST", "流行"];

interface CreatePlaylistModalProps {
  open: boolean;
  onClose: () => void;
  /** 创建成功回调（跳详情用） */
  onCreated?: (playlist: UgcPlaylist) => void;
}

type Step = 1 | 2 | 3;

/**
 * 创建歌单弹窗（P2-02）：
 * Step1 名称/简介/封面/标签 → Step2 TrackPicker 选歌排序 → Step3 保存成功。
 * 复用共享 Modal（ESC/遮罩关闭 + 焦点陷阱）。
 */
export function CreatePlaylistModal({ open, onClose, onCreated }: CreatePlaylistModalProps) {
  const create = useUgcPlaylistsStore((s) => s.create);

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [cover, setCover] = useState<string>(UGC_COVER_OPTIONS[0]);
  const [useFirstCover, setUseFirstCover] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [trackIds, setTrackIds] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<UgcPlaylist | null>(null);

  // 关闭时重置全部状态（下次打开是全新表单）
  const handleClose = () => {
    onClose();
    setStep(1);
    setName("");
    setDesc("");
    setCover(UGC_COVER_OPTIONS[0]);
    setUseFirstCover(false);
    setTags([]);
    setTrackIds([]);
    setErr(null);
    setCreated(null);
  };

  const toggleTag = (t: string) =>
    setTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : prev.length < 2 ? [...prev, t] : prev,
    );

  const goStep2 = () => {
    if (name.trim().length < UGC_LIMITS.nameMin || name.trim().length > UGC_LIMITS.nameMax) {
      setErr(`歌单名称需 ${UGC_LIMITS.nameMin}-${UGC_LIMITS.nameMax} 字`);
      return;
    }
    if (desc.length > UGC_LIMITS.descMax) {
      setErr(`歌单简介最多 ${UGC_LIMITS.descMax} 字`);
      return;
    }
    setErr(null);
    setStep(2);
  };

  const save = () => {
    if (trackIds.length < UGC_LIMITS.minTracks) {
      setErr(`至少选择 ${UGC_LIMITS.minTracks} 首歌`);
      return;
    }
    try {
      const finalCover =
        useFirstCover && trackIds[0] ? trackById(trackIds[0])?.cover ?? cover : cover;
      const id = create({
        name,
        desc,
        cover: finalCover,
        tags,
        trackIds,
      });
      const ugc = useUgcPlaylistsStore.getState().playlists.find((p) => p.id === id);
      setCreated(ugc ?? null);
      setErr(null);
      setStep(3);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "创建失败，请重试");
    }
  };

  return (
    <Modal open={open} onClose={handleClose} labelledBy="create-pl-title">
      <div className={styles.modal}>
        <div className={styles.head}>
          <h2 id="create-pl-title" className={styles.title}>
            {step === 1 ? "创建歌单" : step === 2 ? "选择歌曲" : "🎉 保存成功"}
          </h2>
          <span className={styles.stepBadge}>{step}/3</span>
        </div>

        {step === 1 && (
          <div className={styles.step1}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                歌单名称 <em>{name.length}/{UGC_LIMITS.nameMax}</em>
              </span>
              <input
                className={styles.input}
                value={name}
                maxLength={UGC_LIMITS.nameMax}
                placeholder={`${UGC_LIMITS.nameMin}-${UGC_LIMITS.nameMax} 字，支持 emoji`}
                autoFocus
                onChange={(e) => {
                  setName(e.target.value);
                  setErr(null);
                }}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                歌单简介 <em>{desc.length}/{UGC_LIMITS.descMax}</em>
              </span>
              <input
                className={styles.input}
                value={desc}
                maxLength={UGC_LIMITS.descMax}
                placeholder="选填，一句话介绍这张歌单…"
                onChange={(e) => {
                  setDesc(e.target.value);
                  setErr(null);
                }}
              />
            </label>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>选择封面</span>
              <div className={styles.covers}>
                {UGC_COVER_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`${styles.coverBtn}${cover === c && !useFirstCover ? ` ${styles.coverOn}` : ""}`}
                    aria-pressed={cover === c && !useFirstCover}
                    onClick={() => {
                      setCover(c);
                      setUseFirstCover(false);
                    }}
                  >
                    <Image src={c} alt="预设封面" width={56} height={56} />
                  </button>
                ))}
                <button
                  type="button"
                  className={`${styles.coverBtn}${useFirstCover ? ` ${styles.coverOn}` : ""}`}
                  aria-pressed={useFirstCover}
                  onClick={() => setUseFirstCover(true)}
                >
                  <span className={styles.firstCover}>🎵</span>
                  <span className={styles.firstCoverLabel}>用第一首歌的封面</span>
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>风格标签（选填，1-2 个）</span>
              <div className={styles.tags}>
                {TAG_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`${styles.tag}${tags.includes(t) ? ` ${styles.tagOn}` : ""}`}
                    aria-pressed={tags.includes(t)}
                    onClick={() => toggleTag(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {err && <p className={styles.err}>{err}</p>}

            <div className={styles.actions}>
              <button type="button" className={styles.ghost} onClick={handleClose}>
                取消
              </button>
              <button type="button" className={styles.primary} onClick={goStep2}>
                下一步：选择歌曲 →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.step2}>
            <TrackPicker selected={trackIds} onChange={setTrackIds} />
            {err && <p className={styles.err}>{err}</p>}
            <div className={styles.actions}>
              <button type="button" className={styles.ghost} onClick={() => setStep(1)}>
                ← 上一步
              </button>
              <button
                type="button"
                className={styles.primary}
                disabled={trackIds.length < UGC_LIMITS.minTracks}
                onClick={save}
              >
                保存歌单 →
              </button>
            </div>
          </div>
        )}

        {step === 3 && created && (
          <div className={styles.step3}>
            <p className={styles.successArt}>🎉</p>
            <p className={styles.successTitle}>恭喜，你的第一艘纸船下水了！</p>
            <p className={styles.successDesc}>
              《{created.name}》已保存到你的歌单，共 {created.trackIds.length} 首。
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.ghost} onClick={handleClose}>
                继续逛逛
              </button>
              <Link
                href={`/playlist/${created.id}`}
                className={styles.primary}
                onClick={handleClose}
              >
                查看歌单 →
              </Link>
            </div>
            {onCreated && created && (
              <button
                type="button"
                className={styles.createMore}
                onClick={() => {
                  setName("");
                  setDesc("");
                  setTrackIds([]);
                  setCover(UGC_COVER_OPTIONS[0]);
                  setUseFirstCover(false);
                  setTags([]);
                  setErr(null);
                  setStep(1);
                }}
              >
                继续创建
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}