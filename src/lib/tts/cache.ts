/**
 * 手写 LRU 内存缓存（2026-08-04，TTS 音频 Blob URL 缓存用）：
 * Map 迭代序即最近使用序——get/set 都先删后插保持 LRU 语义，超容淘汰最久未用项。
 * 无第三方依赖；淘汰时回调 onEvict（如 revokeObjectURL 释放 Blob URL）。
 */

export interface LruCache<K, V> {
  get: (key: K) => V | undefined;
  set: (key: K, value: V) => void;
  delete: (key: K) => void;
  has: (key: K) => boolean;
  size: number;
  /** 测试/调试用：当前缓存键（最近使用在前） */
  keys: () => K[];
}

export function createLruCache<K, V>(
  max: number,
  onEvict?: (key: K, value: V) => void,
): LruCache<K, V> {
  const map = new Map<K, V>();

  const evictIfOver = () => {
    while (map.size > max) {
      const oldest = map.keys().next().value as K | undefined;
      if (oldest === undefined) break;
      const value = map.get(oldest);
      map.delete(oldest);
      if (value !== undefined) onEvict?.(oldest, value);
    }
  };

  return {
    get(key) {
      const value = map.get(key);
      if (value === undefined) return undefined;
      // 命中即刷新为最近使用
      map.delete(key);
      map.set(key, value);
      return value;
    },
    set(key, value) {
      if (map.has(key)) map.delete(key);
      map.set(key, value);
      evictIfOver();
    },
    delete(key) {
      map.delete(key);
    },
    has(key) {
      return map.has(key);
    },
    get size() {
      return map.size;
    },
    keys() {
      return [...map.keys()];
    },
  };
}
