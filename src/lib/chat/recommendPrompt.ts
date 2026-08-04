import { PLAYLISTS } from "@/data/playlists";
import { CHANNELS } from "@/data/channels";

/**
 * AI 推荐歌曲能力说明（P3-03）：追加到 system prompt 末尾，教会模型用
 * [playlist: id] / [channel: id] / [music: 歌名] 推荐。
 * V2.7 起歌单/频道 ID 从 data 层生成，消除 route.ts 硬编码 → 数据漂移风险。
 * 歌单「名称（风格/场景，适合…）」为人工精修文案（数据里 name 带 emoji，不适合直接进
 * prompt），由 PLAYLIST_RECOMMEND 按 id 索引；完整性由测试交叉校验（新增歌单必须补文案）。
 */

/** 歌单推荐文案（id → 名称（风格/场景，适合…））；键集合必须与 PLAYLISTS 的 id 完全一致 */
export const PLAYLIST_RECOMMEND: Record<string, string> = {
  "pl-night-postrock": "深夜电台 · 后摇诗篇（后摇/氛围，适合深夜/独处）",
  "pl-jp-breeze": "日系 breeze · 风之旅（J-Pop/日系，适合通勤/放松）",
  "pl-study-piano": "学习自习室 · 轻音（纯音乐，适合学习/工作）",
  "pl-rain-piano": "雨の日 · 钢琴物语（钢琴/环境，适合雨天/冥想）",
  "pl-stardust-electro": "星尘歌单 · 电子漫游（电子，适合运动/专注）",
  "pl-anime-ost": "次元之门 · 动漫 OST（动漫原声，适合日常/怀旧）",
};

/** 组装推荐能力说明（追加进 system prompt，文案与 V2.6 硬编码版一致） */
export function recommendPromptOf(): string {
  const playlistLines = PLAYLISTS.map(
    (p) => `- ${p.id}: ${PLAYLIST_RECOMMEND[p.id] ?? p.name}`,
  ).join("\n");
  const channelLine = CHANNELS.map((c) => `${c.id}: ${c.name}`).join(" / ");
  return `\n\n## 推荐歌曲能力
你可以给用户推荐歌曲/歌单/频道。使用以下格式：
- 推荐单曲：[music: 歌名]
- 推荐歌单：[playlist: 歌单ID]
- 推荐频道：[channel: 频道ID]

可推荐的歌单（ID → 名称/风格/场景）：
${playlistLines}

可推荐的频道（ID → 名称）：
- ${channelLine}

按用户情绪推荐：累/难过 → 深夜或雨天频道；开心/无聊 → 日系频道；学习/工作 → 学习频道；想听某风格 → 对应歌单。`;
}
