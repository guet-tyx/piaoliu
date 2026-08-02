/**
 * 匿名代号词库（FR-9 匿名保护）：形容词 × 名词 + 随机 2 位字母数字
 * 生成「晚风船客·A7F3」风格代号；词库人工维护
 */

const MARK_ADJ = [
  "晚风",
  "薄雾",
  "纸鹤",
  "星尘",
  "夜航",
  "远山",
  "潮汐",
  "候鸟",
  "白鲸",
  "萤火",
];

const MARK_NOUN = [
  "船客",
  "水手",
  "灯塔",
  "航线",
  "港湾",
  "信使",
  "漂流者",
  "守望者",
  "引航员",
  "拾贝人",
];

/** 生成随机匿名代号（运行期随机，非渲染期，无水合问题） */
export function randomAnonMark(): string {
  const adj = MARK_ADJ[Math.floor(Math.random() * MARK_ADJ.length)];
  const noun = MARK_NOUN[Math.floor(Math.random() * MARK_NOUN.length)];
  const code = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${adj}${noun}·${code}`;
}
