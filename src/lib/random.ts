/**
 * 随机选取工具（全站统一实现，V2.7 收敛）：
 * 之前散落各处的 `arr[Math.floor(Math.random()*arr.length)]` 统一改用它，
 * 提供「避开最近用过的 key」语义（全部被排除时允许重复，保持现状）。
 */

export interface PickOptions<T> {
  /** 每条候选的稳定 key（用于排除）；缺省时不做排除 */
  keyOf?: (item: T, index: number) => string;
  /** 需要避开的 key 集合（最近用过的） */
  exclude?: readonly string[];
}

/**
 * 从候选数组随机取一条。
 * - 空数组 → null；
 * - 提供 keyOf/exclude 时，优先在「未被排除」的候选中随机；全部被排除则退回全量（允许重复）。
 */
export function pickRandom<T>(items: readonly T[], opts: PickOptions<T> = {}): T | null {
  if (items.length === 0) return null;
  const keyOf = opts.keyOf;
  const excludeSet = new Set(opts.exclude ?? []);
  if (!keyOf || excludeSet.size === 0) {
    return items[Math.floor(Math.random() * items.length)];
  }
  const candidates = items.filter((item, i) => !excludeSet.has(keyOf(item, i)));
  const src = candidates.length > 0 ? candidates : items;
  return src[Math.floor(Math.random() * src.length)];
}
