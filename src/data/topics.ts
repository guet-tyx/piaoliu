/**
 * 星海话题（P1 F-07）：静态定义，不开放用户自定义；
 * 投瓶可选（公开漂流时），广场按话题筛选，首页热门话题横条数据源。
 */

export interface TopicTag {
  /** 话题 ID（存于 Bottle.topic） */
  id: string;
  /** 显示名（含 # 前缀） */
  name: string;
  /** 标签颜色（CSS 值） */
  color: string;
  /** 话题说明 */
  description: string;
}

/** 初始话题（6 个，可扩展；增删需同步投瓶界面与广场筛选） */
export const TOPICS: TopicTag[] = [
  { id: "insomnia", name: "#失眠夜", color: "#7BB1FF", description: "深夜睡不着的人" },
  { id: "mood", name: "#今日心情", color: "#FB7299", description: "今天的心情日记" },
  { id: "postrock", name: "#后摇推荐", color: "#B18CFF", description: "后摇音乐推荐" },
  { id: "night_radio", name: "#深夜电台", color: "#5F9DFF", description: "深夜电台氛围" },
  { id: "study", name: "#自习歌单", color: "#7CC47C", description: "学习/工作时听的歌" },
  { id: "jp_morning", name: "#日系早安", color: "#FFA94D", description: "日系音乐/早安" },
];

/** 按 id 取话题（未知 id 返回 null） */
export function topicOf(id: string | undefined): TopicTag | null {
  if (!id) return null;
  return TOPICS.find((t) => t.id === id) ?? null;
}