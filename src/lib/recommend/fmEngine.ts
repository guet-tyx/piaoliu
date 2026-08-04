import type { Track } from "@/types/music";
import { pickRandom } from "@/lib/random";

/**
 * 私人 FM 推荐引擎（P2-03，MVP 纯函数）
 *
 * 推荐优先级：
 * 1. 用户从未听过 / 未推荐过的歌曲（同风格优先）
 * 2. 与最近「喜欢」的歌曲同 tag 的未推荐歌曲
 * 3. 全部曲库中未推荐过的歌曲（随机兜底）
 * 4. 全部曲目（允许轻微重复的最终兜底）
 */
export interface FmState {
  /** 已推荐过的歌曲 ID（避免重复推荐） */
  recommendedIds: string[];
  /** 用户标记「喜欢」的歌曲 ID（影响同风格权重） */
  likedIds: string[];
  /** 用户最近播放的歌曲 ID（时间倒序，供同风格参考） */
  recentIds: string[];
  /** 用户播放过的所有歌曲 ID（听完/跳过都算） */
  playedIds: string[];
}

/** 从一批候选中随机取一首（同风格优先加权） */
function pickWeighted(candidates: Track[], lastLikedTag?: string): Track | null {
  if (candidates.length === 0) return null;
  if (lastLikedTag) {
    const same = candidates.filter((t) => t.tag === lastLikedTag);
    const hit = pickRandom(same);
    if (hit) return hit;
  }
  return pickRandom(candidates);
}

/** 推荐一首：返回推荐曲目，并给出更新后的状态（含 recommendedIds 累加） */
export function recommendNext(state: FmState, allTracks: Track[]): {
  track: Track | null;
  next: FmState;
} {
  if (allTracks.length === 0) return { track: null, next: state };

  const recommendedSet = new Set(state.recommendedIds);
  const playedSet = new Set(state.playedIds);
  const recentTag = state.recentIds.length > 0
    ? allTracks.find((t) => t.id === state.recentIds[0])?.tag
    : undefined;

  // 1. 从未听过也未推荐过（优先级最高）
  const unplayed = allTracks.filter((t) => !recommendedSet.has(t.id) && !playedSet.has(t.id));
  let track = pickWeighted(unplayed, recentTag);

  // 2. 所有都听过/推荐过 → 按「喜欢」风格优先
  if (!track) {
    const likedTags = new Set(
      allTracks.filter((t) => state.likedIds.includes(t.id)).map((t) => t.tag),
    );
    const byLikeTag = allTracks.filter(
      (t) => likedTags.has(t.tag) && !recommendedSet.has(t.id),
    );
    track = pickRandom(byLikeTag);
  }

  // 3. 未推荐过的任意曲目（兜底）
  if (!track) {
    const remaining = allTracks.filter((t) => !recommendedSet.has(t.id));
    track = pickRandom(remaining);
  }

  // 4. 全部推荐过一轮 → 允许从全曲库随机（清空 recommended 重置语义由调用方决定）
  if (!track) {
    // 顶部已保证 allTracks 非空，pickRandom 不会为 null
    track = pickRandom(allTracks) ?? allTracks[0];
  }

  const id = track.id;
  return {
    track,
    next: {
      ...state,
      recommendedIds: [...state.recommendedIds, id],
      recentIds: [id, ...state.recentIds.filter((x) => x !== id)].slice(0, 10),
    },
  };
}

/**
 * 批量推荐（FM 频道切进时生成初始队列）：
 * 连续调用 recommendNext 得到 size 首；曲库已全部推荐过（recommendNext 落到
 * 第 4 级兜底、开始重复）时提前终止，保证单批内不重复。
 */
export function recommendBatch(
  state: FmState,
  allTracks: Track[],
  size: number,
): { tracks: Track[]; next: FmState } {
  const tracks: Track[] = [];
  let s = state;
  const recommendedSet = new Set(state.recommendedIds);
  for (let i = 0; i < size; i++) {
    // 曲库未推荐曲目耗尽 → 终止（避免第 4 级兜底把重复曲塞进同一批）
    if (recommendedSet.size >= allTracks.length) break;
    const { track, next } = recommendNext(s, allTracks);
    if (!track) break;
    tracks.push(track);
    s = next;
    recommendedSet.add(track.id);
  }
  return { tracks, next: s };
}

/** 默认空状态 */
export function createEmptyFmState(): FmState {
  return { recommendedIds: [], likedIds: [], recentIds: [], playedIds: [] };
}
