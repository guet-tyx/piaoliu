/** 曲目数据（对应原型 TRACKS 数组） */
export interface Track {
  /** 稳定主键（收藏集合/未来 Supabase 曲库引用） */
  id: string;
  /** 曲名 */
  t: string;
  /** 流派标签 */
  tag: string;
  /** 电台站次/艺术家行 */
  s: string;
  /** 封面图片路径 */
  cover: string;
  /** 音频源列表：按顺序尝试，全部失败则放弃（多源降级） */
  src: string[];
}
