/**
 * P3 A-01 角色星海赞（配置 + 角色↔话题/曲风映射）：
 * 4 位角色会以「星海赞」（⭐ 角色赞了）出现在漂流广场，点赞判定条件配置全部收敛于此。
 * 台词全部来自白名单，非模型生成。
 */

export interface StarPraiseRole {
  roleId: string;
  name: string;
  avatar: string;
  /** 主持频道风格池（条件 B：瓶子的歌属于该角色主持频道的曲风，固定 80% 点赞） */
  styles: string[];
  /** 匹配话题（条件 C：瓶子的话题标签匹配角色性格，固定 60% 点赞） */
  topics: string[];
  /** 点赞台词池（卡片 hover 展示；白名单，非模型生成） */
  lines: string[];
}

export const STAR_PRAISE_ROLES: StarPraiseRole[] = [
  {
    roleId: "sio",
    name: "汐",
    avatar: "/images/avatar-sio.png",
    styles: ["后摇", "氛围", "纯音乐"],
    topics: ["insomnia", "night_radio"],
    lines: ["这艘船里有很温柔的心事呢。", "深夜的星海，又亮了一颗星。", "这艘船，汐想替它点一盏灯。"],
  },
  {
    roleId: "lumen",
    name: "流明",
    avatar: "/images/avatar-lumen.png",
    styles: ["纯音乐", "钢琴", "轻音乐"],
    topics: ["study"],
    lines: ["这篇文字里有光。", "安静的字句，最有力量。", "这艘船的航迹，值得被记下。"],
  },
  {
    roleId: "soku",
    name: "朔空",
    avatar: "/images/avatar-soku.png",
    styles: ["日系", "J-Pop", "电子"],
    topics: ["postrock", "jp_morning"],
    lines: ["这艘船太对味了！", "元气满满的一艘船！", "这波，必须点赞！"],
  },
  {
    roleId: "yoe",
    name: "悠",
    avatar: "/images/avatar-yoe.png",
    styles: ["钢琴", "环境", "氛围"],
    topics: ["mood"],
    lines: ["星图上，这艘船标注着「重要」。", "它的心事，星海都收到了。", "这艘船的航迹，与今夜月色同频。"],
  },
];

/** 按角色 id 取星海赞配置（A-01 卡片展示 / A-04 投瓶预览复用） */
export function starRoleOf(roleId: string): StarPraiseRole | undefined {
  return STAR_PRAISE_ROLES.find((r) => r.roleId === roleId);
}

/** 话题 → 最匹配的角色（A-01 条件 C / A-04 投瓶自动匹配；无匹配返回 null） */
export function roleOfTopic(topic: string | undefined | null): string | null {
  if (!topic) return null;
  return STAR_PRAISE_ROLES.find((r) => r.topics.includes(topic))?.roleId ?? null;
}

/** 曲风标签 → 主持该风格频道的角色（A-04 无话题时按歌曲兜底；无匹配返回 null） */
export function roleOfTrackTag(tag: string | undefined | null): string | null {
  if (!tag) return null;
  return STAR_PRAISE_ROLES.find((r) => r.styles.includes(tag))?.roleId ?? null;
}