# public/data · 爬取数据说明

真实弹幕/评论数据（爬自 B站/网易云等公开评论区），用于「真实弹幕/评论填充」：
播放曲目时注入历史弹幕，歌曲留言墙展示历史热评种子。

## 文件清单

| 文件 | 内容 | 说明 |
|---|---|---|
| `all_danmaku.json` | 日系弹幕 | 4 首（夜に駆ける/妄想/紅蓮華/千本桜），每首 ~1200 条 |
| `all_danmaku_starsea.json` | starsea 中文圈弹幕 | 7 首（星茶会/夜航星/夜的钢琴曲五/海の幽霊/星の在り処/海の見える街/星になる） |
| `all_comments.json` | 日系热评 | 10 首 × 65 条，含真实点赞数 |
| `all_comments_starsea.json` | starsea 中文圈热评 | 13 首 × 若干条，含真实点赞数 |
| `dm_*.json` / `cm_*.json` | 单曲拆分 | 与汇总文件同源 |
| **`crawled-danmaku.json`** | **弹幕清洗产物（已生成）** | `{ trackId: string[] }`，每曲 ≤120 条，去重 + 截断 40 字 |
| **`crawled-comments.json`** | **热评清洗产物（已生成）** | `{ trackId: [{text, liked}] }`，每曲 top 20，按点赞降序 |

> 两个 `crawled-*.json` 为脚本生成产物（勿手改），前端运行时按需 fetch。

## 歌曲映射

爬取歌曲与星海电台曲库（t01-t52 自制曲目）名称不对应，
映射关系见 `src/data/crawled-mapping.ts`（按 tag/mood 语义配对，如 紅蓮華→t48、夜航星→t05）。
脚本对 starsea 批的「歌名 - 艺术家」source 自动剥后缀后查表。

## 重新生成

```bash
node scripts/gen-crawled-data.mjs              # 重建两个 crawled-*.json（固定随机种子，输出幂等）
node scripts/gen-crawled-data.mjs --seed-sql   # 附加重建 supabase/migrations/011_crawled_seed.sql
```

## 前端接入点

- **弹幕**：`src/hooks/useCrawledDanmaku.ts`（PlayerBridge 挂载）——播放曲目时每 4s 注入 1 条历史弹幕
- **评论（本地模式）**：`src/lib/api/comments.ts` 的 `fetchComments`——爬取热评种子（只读）与 localStorage 用户评论合并展示
- **评论（Supabase 模式）**：执行 `supabase/migrations/011_crawled_seed.sql` 一次
  （新增 `song_comments.hot_likes` 列 + 种子行，幂等可重跑）
- **展示**：留言墙热评带「🔥 历史热评」badge 与真实点赞数，不可点赞

## 数据合规备注

- 仅用于本地 demo 展示，未随构建部署外部服务
- 弹幕/评论内容保留原文（含少量梗/网络用语），未做二次编辑
