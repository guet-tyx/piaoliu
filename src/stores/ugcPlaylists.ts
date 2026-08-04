import { create } from "zustand";
import type { UgcPlaylist } from "@/types/music";
import { TRACKS } from "@/data/tracks";
import { PLAYLISTS } from "@/data/playlists";

/** localStorage 键（P2-02 UGC 歌单） */
export const UGC_KEY = "drift-ugc-playlists";

/** 限制规则（P2-02） */
export const UGC_LIMITS = {
  maxPlaylists: 5,
  minTracks: 3,
  maxTracks: 50,
  nameMin: 2,
  nameMax: 20,
  descMax: 100,
} as const;

/** 创建歌单可选预设封面（官方歌单封面集合） */
export const UGC_COVER_OPTIONS = PLAYLISTS.map((p) => p.cover);

interface UgcPlaylistsState {
  /** 用户自建歌单（创建时间倒序） */
  playlists: UgcPlaylist[];
  /** 初始化倒序中（bootstrap 后恢复 localStorage） */
  ready: boolean;
  /** 创建歌单：校验不通过抛 Error（message 供 UI 展示） */
  create: (input: {
    name: string;
    desc?: string;
    cover?: string;
    tags?: string[];
    trackIds: string[];
    creatorId?: string;
  }) => string;
  /** 删除歌单（无返回：不存在则静默） */
  removeById: (id: string) => void;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 隐私模式等场景忽略写入失败
  }
}

/** 把 localStorage 读出的数据补齐缺省字段（跨版本迁移兜底） */
function sanitizeLoaded(raw: unknown): UgcPlaylist[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is Partial<UgcPlaylist> =>
        typeof item === "object" && item !== null && typeof (item as Partial<UgcPlaylist>).id === "string",
    )
    .map((p) => makeUgcPlaylist(p))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * 工厂：补默认值（mood/scene 默认、meta 占位、alt 取歌单名）。
 * 输入可带部分字段（读取/diff/校验用），输出为完整 UgcPlaylist。
 */
export function makeUgcPlaylist(
  p: Partial<UgcPlaylist>,
): UgcPlaylist {
  const name = p.name?.trim() || "未命名歌单";
  const now = Date.now();
  return {
    id: p.id || `ugc-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    cover: p.cover || PRESET_COVER_FALLBACK,
    alt: p.alt ?? name,
    desc: p.desc ?? "",
    tags: Array.isArray(p.tags) ? p.tags.slice(0, 2) : [],
    mood: p.mood ?? "治愈",
    scene: p.scene ?? "日常",
    trackIds: Array.isArray(p.trackIds) ? p.trackIds : [],
    official: false,
    ribbon: undefined,
    meta: { plays: "0", dms: "0", time: "刚刚", ...(p.meta ?? {}) },
    createdAt: p.createdAt ?? now,
    creatorId: p.creatorId ?? "local-guest",
  };
}

/** 预设封面兜底（数据缺失时使用，避免无效路径） */
const PRESET_COVER_FALLBACK = "/images/playlist-covers/pl-night-postrock.webp";

export const useUgcPlaylistsStore = create<UgcPlaylistsState>()((set, get) => ({
  playlists: [],
  ready: false,

  create: (input) => {
    const name = input.name.trim();
    if (
      name.length < UGC_LIMITS.nameMin ||
      name.length > UGC_LIMITS.nameMax
    ) {
      throw new Error(`歌单名称需 ${UGC_LIMITS.nameMin}-${UGC_LIMITS.nameMax} 字`);
    }
    if (input.desc && input.desc.length > UGC_LIMITS.descMax) {
      throw new Error(`歌单简介最多 ${UGC_LIMITS.descMax} 字`);
    }
    if (input.trackIds.length < UGC_LIMITS.minTracks) {
      throw new Error(`至少选择 ${UGC_LIMITS.minTracks} 首歌`);
    }
    if (input.trackIds.length > UGC_LIMITS.maxTracks) {
      throw new Error(`最多选择 ${UGC_LIMITS.maxTracks} 首歌`);
    }
    if (new Set(input.trackIds).size !== input.trackIds.length) {
      throw new Error("同一首歌不能重复");
    }
    if (get().playlists.length >= UGC_LIMITS.maxPlaylists) {
      throw new Error(`最多创建 ${UGC_LIMITS.maxPlaylists} 个歌单`);
    }
    // 曲目 id 必须来自曲库
    const valid = input.trackIds.every((id) => TRACKS.some((t) => t.id === id));
    if (!valid) {
      throw new Error("包含无效曲目");
    }

    const ugc = makeUgcPlaylist({
      name,
      desc: input.desc?.trim() ?? "",
      cover: input.cover ?? PRESET_COVER_FALLBACK,
      tags: input.tags ?? [],
      trackIds: input.trackIds,
      creatorId: input.creatorId ?? "local-guest",
    });
    const next = [ugc, ...get().playlists];
    set({ playlists: next });
    writeJson(UGC_KEY, next);
    return ugc.id;
  },

  removeById: (id) => {
    const next = get().playlists.filter((p) => p.id !== id);
    if (next.length === get().playlists.length) return;
    set({ playlists: next });
    writeJson(UGC_KEY, next);
  },
}));

/** 恢复本地数据（挂载时由 SDK 边界调用；store 内不直接读 localStorage 以保 node 可测） */
export function bootstrapUgc(): void {
  const raw = readJson<unknown>(UGC_KEY);
  useUgcPlaylistsStore.setState({ playlists: sanitizeLoaded(raw), ready: true });
}