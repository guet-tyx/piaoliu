# 漂流 DRIFT · 架构蓝图（ARCHITECTURE）

> 项目：`drift-web`（Next.js 16 App Router + TypeScript + CSS Modules + Zustand + Supabase）
> 版本：V1.0（基于 PRD V1.0 评审基线，聚焦 **V1.0.1 + V1.1** 两版；V1.2+ 仅记录预留点）
> 关联文档：[STYLE_GUIDE.md](./STYLE_GUIDE.md)（开发规范）· [README.md](./README.md)（项目总览）

---

## 1. 文档定位

本文档是 PRD → 技术的桥梁：为 V1.0.1（体验修补）与 V1.1（纸船漂流 + 汐的陪伴）给出
可落地的架构方案，同时记录后续版本的**数据模型预留点**，避免 V1.1 设计把 V1.2+ 走死。

- 实施入口：V1.0.1 已按本文档落地（见 git 提交 `feat: V1.0.1 基础体验修补`）
- 实施入口：V1.1 按本文档 §5 的迁移/建表/RPC 契约推进，另起实施阶段

---

## 2. 架构总览

### 2.1 现状（V1.0 基线）

```
浏览器
  ├─ src/app/page.tsx       单页组装：Topbar → Hero → Marquee → Character → Playlist → Player → Download → Footer
  ├─ components/*           8 区块 + shared（SectionHead / CountUp），Server/Client 按交互边界划分
  ├─ stores/player.ts       Zustand 播放器状态中枢（唯一状态源）
  ├─ hooks/useAudioPlayer   store ↔ <audio> 唯一桥接（多源降级、进度回写、localStorage 持久化）
  ├─ data/*                 静态内容（tracks / playlists / character / danmaku / marquee）
  └─ lib/supabase/client.ts getSupabase() 懒加载单例（未配 env 返回 null）
```

**核心结论**：页面结构 100% 完成，唯一真实交互是「歌单→播放」；数据层全部来自 `src/data`，
Supabase 仅有 null-safe 骨架。PRD 的「连接为零」判断与技术现状一致。

### 2.2 目标架构（V1.1 完成态）

```
浏览器
  ├─ 页面/组件层            新增 bottle 区块、InboxModal、汐问候区；动效沿用 --kf-* 约定
  ├─ stores                 player（唯一状态源）+ identity（船员证）+ bottle（收件箱）+ shio（陪伴）
  ├─ lib/api/*              查询层：统一接口，isSupabaseReady() 分支（真实 RPC vs 本地模拟池）
  ├─ lib/supabase/*         client（懒加载）+ anon（匿名身份引导）+ realtime（V1.3 用）
  └─ data/*                 静态内容保留；汐台词/匿名代号/敏感词进入 data 层（人工维护白名单）
                │
        Supabase（BaaS，未配置 env 时全站走本地模拟池，功能不降级）
          ├─ Auth：Anonymous Sign-In（零注册身份）
          ├─ PostgreSQL：sailors / bottles / replies / action_logs / bad_words / reports
          ├─ RLS：全表开启，最小可见性
          └─ RPC：launch_bottle / pick_bottle / reply_bottle / fetch_inbox / report_content（SECURITY DEFINER）
```

---

## 3. 核心架构决策（ADR 摘要）

| # | 决策 | 方案 | 理由 / 约束 |
|---|---|---|---|
| A1 | 身份底座 | **Supabase Anonymous Auth**（`signInAnonymously`） | PRD FR-9「零注册获得身份」；session 自动持久化于 localStorage；V1.2 可升级为永久账号 |
| A2 | 数据层演进 | `src/lib/api/` 查询层统一封装，**null-safe 降级** | 沿用 `getSupabase()` 骨架与 STYLE_GUIDE「未来切换 Supabase 时替换为查询层」；未配 env 时本地模拟池，全功能可玩 |
| A3 | 限额/防重复拾取 | **服务端强制**：RPC（SECURITY DEFINER）+ `action_logs` 计数 + 原子 claim（`update … where id=(select …) returning`） | NFR-4：超限拦截不可绕过；同一瓶子不可被两人拾取 |
| A4 | 航海日边界 | RPC 内 `(now() at timezone 'Asia/Shanghai')::date` | 每日投 1/拾 3 的「日」以服务端时区为准，防客户端改时钟 |
| A5 | 汐台词 | 白名单文案库 `src/data/shio-lines.ts`，人工维护、评审后合入；**无任何生成式内容** | NFR-2；台词是角色口碑红线 |
| A6 | 内容安全 | 本地词库即时拦截（体验） + RPC 内权威校验（安全） + `reports` 举报表（治理） | NFR-1 三层防线 |
| A7 | 语汇统一 | 全站文案按 PRD §3 术语表（船客/启航/靠岸/回信/记录航线/航行天数/星尘称号/星海来讯） | 需求硬性要求，空态/按钮/动效反馈/错误提示均遵守 |
| A8 | 回信可见性 | 数据模型上强制：`replies` 的 select 仅对 `bottle.author_id=auth.uid()` 开放 | PRD FR-7.4「回信仅原投瓶人可见」，不可在 UI 层妥协 |
| A9 | 动效 | 沿用 STYLE_GUIDE §2：新增 keyframes 注册进 globals.css + `:root` 别名，模块内 `var(--kf-*)`；只动 transform/opacity；reduced-motion 压制 | 新动效（启航/靠岸/卡牌翻转）都走此通道 |

---

## 4. V1.0.1 设计（FR-1 ~ FR-6，已实施）

**范围原则**：纯本地、零后端依赖、不改数据源。所有改动集中在
`stores/player.ts` + `hooks/useAudioPlayer.ts` + `components/player/*` + `components/hero/*`。

### 4.1 数据模型扩展（`src/types/music.ts` / `data/tracks.ts`）

- `Track` 增加 `id` 字段（`"t01"~"t04"`）——收藏集合的稳定主键，并为 V1.1 曲库快照预留
- 收藏从单布尔升级为 `likedIds: string[]`（FR-4 按曲目粒度）

### 4.2 store 扩展（`stores/player.ts`）

| 字段 | 类型 | 默认 | 对应需求 |
|---|---|---|---|
| `volume` | number | 1 | FR-2 |
| `muted` | boolean | false | FR-2 |
| `playMode` | `"order" \| "loop" \| "shuffle"` | "order" | FR-3 |
| `likedIds` | string[] | [] | FR-4 |
| `seekTarget` | number \| null | null | FR-1（瞬态，由 hook 消费后归零） |

新增 actions：`seekTo`、`setVolume`、`toggleMute`、`cyclePlayMode`、`toggleLike(id)`；
删除 `isLiked`（改由 `likedIds.includes(track.id)` 派生）。

### 4.3 桥接层扩展（`hooks/useAudioPlayer.ts`）

- **FR-1**：effect 消费 `seekTarget` → `audio.currentTime = seekTarget`（播放不中断；duration=0 忽略）
- **FR-2**：effect 同步 `audio.volume = muted ? 0 : volume`
- **FR-3**：`onEnded` 按 `playMode` 分派——`loop` → 本曲重播；`shuffle` → 随机另一首（运行期 `Math.random`，
  非渲染期，符合水合规范）；`order` → 现状 `next()`
- **持久化 v2**：`drift-player-state` 升级 schema（currentIndex / isPlaying / volume / muted / playMode / danmakuOn），
  旧格式 try/catch 容错；新增 `drift-favorites` 键存 `likedIds`
  - 注：`danmakuOn` 纳入持久化（FR-5 开关状态刷新保留）

### 4.4 UI（`components/player/PlayerSection.tsx` + `.module.css`）

- **FR-1**：进度条 `aria-hidden` 的 `<i>` → 原生 `<input type="range">`（min 0 / max duration / step 1；
  滑块/轨道用设计令牌；键盘可达；duration=0 禁用）
- **FR-2**：`nowCtrl` 内新增音量滑杆 + 静音按钮（compact）
- **FR-3**：播放模式按钮（顺序/单曲/随机循环切换 + aria-label）
- **FR-4**：红心由 `likedIds` 派生
- **FR-5**：`.recordDm` 弹幕层受 `danmakuOn` 控制（条件类名 opacity 过渡，保留动画能力）
- `components/hero/HeroDanmaku.tsx` 读 `danmakuOn` 统一控制 Hero 装饰弹幕层（Hero 已是 client）

### 4.5 FR-6 链接真实化

`DownloadSection` / `Footer` 中 `#` 占位链接按 PRD 规则处理：有真实落地页 → 真实地址；
无 → 统一「敬请期待」禁用态徽标。不指向 `#`。

---

## 5. V1.1 设计（纸船漂流 FR-7 + 汐的陪伴 FR-8 最小版）

### 5.1 激活前置

1. `.env.local` 配置 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. `supabase/migrations/` SQL 在 Supabase 项目执行（建表 + RLS + RPC + 种子）
3. 客户端引导：`lib/supabase/anon.ts` `ensureAnonSession()`（无 session 时 `signInAnonymously`，
   `onAuthStateChange` 订阅按清理铁律释放）——在 client 引导组件挂载时调用一次

### 5.2 数据模型

#### `sailors`（星尘船员证）

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | uuid PK = `auth.uid()` | 身份即行主键 |
| `anon_mark` | text | 随机代号（「纸船·A7F3」风格，词库见 `data/anon-marks.ts`） |
| `nickname` | text null | V1.2 激活（1-12 字，敏感词校验） |
| `bottle_style` | text | 纸船样式（V1.2 皮肤系统启用） |
| `bond_value` / `level` | int | V1.2 羁绊系统激活，预留列 |
| `shio_state` | jsonb | `{recent_lines[], last_greeting_date}` 汐状态，V1.1 即写入 |

RLS：`select/update` 仅本人行。

#### `bottles`（漂流瓶）

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | uuid PK | |
| `author_id` | uuid | 投瓶人 |
| `text` | text | 10–200 字 |
| `track_snapshot` | jsonb | `{t, tag, s, cover}` 曲目快照，防曲库变更后展示失真 |
| `bottle_style` / `anon_mark` | text | 展示样式与匿名标识 |
| `status` | enum | `drifting → picked → replied / sunk` |
| `picked_by` | uuid null | 拾取人（原子 claim 写入） |
| `read_at` | timestamptz null | 星海来讯已读 |
| `expires_at` | timestamptz | 投递 +72h 自动沉没（清理或查询过滤） |
| `is_system` | bool | 冷启动预热瓶 |

RLS：insert/update 仅经 RPC；select = 本人发起 或 `picked_by = auth.uid()`。

#### `replies`（回信）

`id` / `bottle_id` FK / `author_id` / `text`(10–200) / `created_at`。
RLS：select 仅当 `bottle.author_id = auth.uid()`（A8 强制）；insert 仅经 RPC。

#### `action_logs`（行为流水：限额 + 羁绊 + 周报素材）

`sailor_id` / `action`（`launch` `pick` `reply`，V1.2 增 `listen_3` 等）/ `day`（Asia/Shanghai 日期）/
`meta jsonb` / `created_at`。仅 RPC 写入；RPC 内按 `(action, day, sailor_id)` 计数做限额。

#### `bad_words`（敏感词）与 `reports`（举报）

- `bad_words`：`word` 唯一；RLS 全量可读（客户端缓存即时拦截）、写仅管理员；种子 30–50 条人工评审
- `reports`：`target_type/target_id/reason/status('open')`；RLS insert 仅本人、select 本人+管理员

### 5.3 RPC 契约（全部 SECURITY DEFINER，`search_path` 收紧）

| RPC | 校验链 | 行为 |
|---|---|---|
| `launch_bottle(p_text, p_track_snapshot)` | 长度 10–200 · `has_bad_word` · 当日 launch ≤ 1 | 建瓶 + 记流水，返回瓶子 |
| `pick_bottle()` | 当日 pick ≤ 3 | `update … where id=(select 随机未拾/未过期/非本人 order by random() limit 1) returning *` 原子 claim；池空返回 null（前端空态「星海此刻很安静」+ 汐旁白） |
| `reply_bottle(p_bottle_id, p_text)` | `picked_by=me` · 未回信 · 长度/敏感词 | 建回信 + status='replied' + 记流水 |
| `fetch_inbox()` | — | 本人发起的瓶 + 回信（星海来讯） |
| `mark_inbox_read(p_bottle_id)` | 本人发起 | 写 read_at |
| `report_content(...)` | 长度/频率 | 写 reports |
| `has_bad_word(text)`（内部） | — | 逐词命中即 true |

### 5.4 冷启动与种子（`supabase/seed.sql`）

- 6–8 条系统世界观瓶（`is_system=true`，署名「星海信使」）——保证早期必有瓶可拾（PRD §8 冷启动对策）
- `bad_words` 初值（人工评审后定稿）

### 5.5 前端结构（V1.1 新增）

```
src/
├─ lib/api/           查询层：bottles.ts / sailor.ts / moderation.ts（统一接口，isSupabaseReady 分支）
├─ lib/supabase/      anon.ts（匿名身份引导）+ realtime.ts（V1.3 预留）
├─ lib/moderation.ts  本地词库 isSafeText() + 上报封装
├─ stores/            identity.ts（船员证/代号）/ bottle.ts（收件箱/unread）/ shio.ts（每日一句）
├─ data/              shio-lines.ts（汐台词白名单：每日一句 3 时段 + 行为回应，V1.2 启用）
│                      anon-marks.ts（匿名代号词库）/ bad-words.ts（本地敏感词缓存源）
└─ components/
   ├─ bottle/         BottleSection（新区块，插在 PlayerSection 后——投瓶绑定当前播放歌曲）
   │                   LaunchBottle（启航动画）· BottleDock（拾瓶卡牌翻转开箱）·
   │                   InboxModal（星海来讯强提醒 + 靠岸动画 + 汐旁白 + 回信）·
   │                   BottleCard（瓶面卡 canvas 生成 → 下载）
   ├─ character/      CharacterSection 扩展：每日一句区（时段变化）+ 羁绊/等级展示（复用 CountUp）
   └─ shared/         Modal（焦点陷阱 / ESC / cleanup 铁律）
```

**动效清单**（按 A9 注册进 globals.css）：`--kf-bottleWave`（启航/靠岸水波）、
卡牌翻转（`rotateY` + `perspective`，仍只动 transform/opacity）、`--kf-rise` 复用。

**汐陪伴范围（按 PRD §7 交付节奏）**：V1.1 = 每日一句（深夜 22:00–06:00 治愈系 /
清晨 06:00–12:00 元气系 / 其他日常系），`shio_state` 结构预留；行为回应与羁绊值排 V1.2。

**降级策略（A2）**：`isSupabaseReady() === false` 时——
身份 → 本地游客模拟；投/拾/回信 → 本地模拟池（含系统瓶副本）；收件箱 → 本地模拟；
汐问候/羁绊 → 本地 localStorage 计算。**全部功能本地可玩，后端接入只是换数据源。**

### 5.6 V1.1 明确不做（防蔓延）

昵称自定义、皮肤/徽章、同船共听、真实弹幕、周报、活动、跨设备找回——均见 §6 预留点。

---

## 6. 版本路线图与预留点（V1.2+）

| 版本 | 主题 | 关键预留点（V1.1 设计已兼容） |
|---|---|---|
| V1.2 | 星尘身份 FR-9 + 收集 FR-12 + 审核完善 | `sailors.nickname/bond_value/level/bottle_style` 激活；`action_logs` 增 `listen_3` 等行为；跨设备找回 = 一次性找回码（哈希存 sailors，新设备 RPC 转移） |
| V1.3 | 同船共听 FR-10 + 真实弹幕 FR-11 | Realtime：`listeners` 心跳表（upsert 20s + 60s 过期过滤）+ broadcast 频道 `danmaku:<track_id>`；`danmakuOn` 开关已就绪（V1.0.1 FR-5 接线完成）；弹幕来源 = broadcast + `action_logs` 系统事件 |
| V2.0 | 星海周报 FR-13 + 节日活动 FR-14 | `action_logs` 即周报素材（热漂/热门航线/收听星图）；活动 = `bottles.bottle_style` 限定 + `is_system` 复用 |

**开放问题决策记录**：①纸船皮肤初期数量与获取方式 → V1.2 评审定；②周报分享形态 → V2.0 定；
③同船人数过少 → 空态以汐陪伴文案承接（「星海此刻很安静，汐在听」），V1.3 生效。

---

## 7. 风险对策

| 风险 | 对策（映射） |
|---|---|
| 匿名 UGC 内容安全 | 三层防线（A6）+ 每日限额 + 举报 + 抽审字段预留 |
| 汐台词 OOC 炎上 | 白名单库 + 人工评审合入（A5），无生成式发言 |
| 冷启动无瓶可拾 | 系统预热瓶种子（§5.4） |
| 回信泄漏给他人 | RLS 强制（A8），UI 层无妥协余地 |
| 超限/重复拾取 | RPC 原子 claim + 服务端计数（A3） |
| 低配设备卡顿 | 动效只动 transform/opacity + reduced-motion 压制（A9） |
