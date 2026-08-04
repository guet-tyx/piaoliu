import { describe, expect, it } from "vitest";
import { PLAYLISTS } from "@/data/playlists";
import { CHANNELS } from "@/data/channels";
import { PLAYLIST_RECOMMEND, recommendPromptOf } from "./recommendPrompt";

describe("recommendPrompt（歌单/频道 ID 由数据生成）", () => {
  it("歌单推荐文案键集合与 PLAYLISTS 完全一致（新增歌单必须补文案）", () => {
    const keys = Object.keys(PLAYLIST_RECOMMEND).sort();
    const ids = PLAYLISTS.map((p) => p.id).sort();
    expect(keys).toEqual(ids);
  });

  it("prompt 覆盖全部歌单与频道 ID（消除硬编码漂移）", () => {
    const prompt = recommendPromptOf();
    for (const p of PLAYLISTS) expect(prompt).toContain(p.id);
    for (const c of CHANNELS) expect(prompt).toContain(c.id);
  });

  it("文案与 V2.6 硬编码版逐字一致（防止 prompt 漂移）", () => {
    expect(recommendPromptOf()).toBe(`\n\n## 推荐歌曲能力
你可以给用户推荐歌曲/歌单/频道。使用以下格式：
- 推荐单曲：[music: 歌名]
- 推荐歌单：[playlist: 歌单ID]
- 推荐频道：[channel: 频道ID]

可推荐的歌单（ID → 名称/风格/场景）：
- pl-night-postrock: 深夜电台 · 后摇诗篇（后摇/氛围，适合深夜/独处）
- pl-jp-breeze: 日系 breeze · 风之旅（J-Pop/日系，适合通勤/放松）
- pl-study-piano: 学习自习室 · 轻音（纯音乐，适合学习/工作）
- pl-rain-piano: 雨の日 · 钢琴物语（钢琴/环境，适合雨天/冥想）
- pl-stardust-electro: 星尘歌单 · 电子漫游（电子，适合运动/专注）
- pl-anime-ost: 次元之门 · 动漫 OST（动漫原声，适合日常/怀旧）

可推荐的频道（ID → 名称）：
- ch-night: 深夜频道 / ch-jp: 日系频道 / ch-study: 学习频道 / ch-rain: 雨天频道 / ch-fm: 私人 FM

按用户情绪推荐：累/难过 → 深夜或雨天频道；开心/无聊 → 日系频道；学习/工作 → 学习频道；想听某风格 → 对应歌单。`);
  });
});
