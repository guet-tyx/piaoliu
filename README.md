# 漂流 DRIFT · Web 重构

二次元音乐网站「漂流 DRIFT · 星海版」从单文件 HTML 原型（`archive/anime-style.html`）重构为 Next.js 应用。

## 技术栈

- **Next.js 16（App Router）+ TypeScript** — 框架
- **CSS Modules** — 样式（全局变量/基础/keyframes 在 `src/app/globals.css`，组件私有样式在各组件 `.module.css`）
- **Zustand** — 状态管理（`src/stores/`）
- **Supabase** — BaaS（已接入真实云后端，接入步骤见 **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**；未配置 env 时自动降级本地模拟池）
- **AI 聊天（V2.3 → V2.5）** — 多 Provider 大池子（魔搭 / 智谱 / 硅基流动 / 阿里百炼 / Kimi / OpenRouter / Gemini / Groq / Cerebras，均为 OpenAI 兼容端点 + 服务端代理，key 不暴露浏览器）+ SSE 流式打字机 + 跨 Provider auto fallback（限流/额度用尽自动切下一家，失败冷却 5 分钟）+ `<think>` 思维链剥离（含跨帧切碎标签）+ 无 key 本地回复池降级；接入说明见 **[AI_CHAT_SETUP.md](./AI_CHAT_SETUP.md)**

## 版本状态

- **V1.0.1（体验修补，已完成）**：进度条可拖动、音量/静音、三种播放模式、收藏持久化、弹幕开关真实接线、下载/社交链接真实化（FR-1~FR-6）
- **V1.1（纸船漂流 + 汐的陪伴，已完成）**：匿名投瓶（绑定当前歌曲）、随机拾瓶（卡牌开箱）、回信靠岸、星海来讯、瓶面卡分享图、汐每日一句（时段变化）；Supabase SQL（建表/RLS/RPC/种子）已就绪并完成联调，未配置 env 时走本地模拟池全流程可玩
- **V1.2（星尘身份 + 收集系统，已完成）**：`/sailor` 独立船员证页（代号/昵称/等级称号/羁绊进度）、汐行为回应与羁绊累积（7 天去重）、纸船皮肤 3 款（等级解锁，漂流区/瓶面卡生效）、徽章 4 枚、跨设备找回码、举报入口（NFR-1）；SQL 增量迁移 `002_collection.sql` 已联调（含 005 找回码 RPC）
- **V1.3（同船共听 + 真实弹幕，已完成）**：实时通道抽象层（真实模式 Realtime broadcast / 本地 BroadcastChannel 双标签演示）、同曲在线人数与匿名头像流、同船弹幕（1-50 字 + 敏感词过滤 + 10s 自动消失）、发弹幕入口、系统事件弹幕（启航/拾瓶/回信/听歌/收信，30s 频控）、假弹幕全部移除（FR-11）；SQL 增量迁移 `003_realtime.sql` 已联调（含 005 presence upsert，按用户计）
- **V2.0（星海周报 + 节日活动，已完成）**：`/report` 周报页（本周航行小结/热门航线 top3/收听星图/启航瓶子 + canvas 分享图）、收听追踪（每歌次数/按天分布）、节日活动框架 + 2 示例（夏日漂流祭 8 月自动生效 / 新年许愿瓶配置就绪，`?event=` 测试开关）、活动限定瓶面样式落库、羁绊里程碑（10/20/30 汐专属回应）+ 船员证最近航行小结；SQL 增量迁移 `004_report_events.sql` 已联调（含 005 周报 bottles 聚合）
- **V2.1（真实后端全面接通，已完成）**：云 Supabase 项目接入（`001~005` 迁移 + seed 已执行）、`npm run verify:real` 真实模式冒烟 33 项全绿、三个预留功能真实化——周报（`record_listen`/`get_weekly_report`）、跨设备找回（`set_recovery_code`/`claim_recovery`，bcrypt 哈希、单次有效）、同船在线（`upsert_listener`/`online_listeners` 脱敏视图）；真实模式周报双写收敛（徽章仍读本地 stats）
- **V2.2（角色区精简 + 自动轮播，已完成）**：移除角色「三种瞬间」表情切换（UI/数据/12 张表情图彻底清理）；每日一句从汐专属扩展为 4 位角色各一套专属文案（流明/朔空/悠新增 36 句人工文案，三时段规则沿用），切换角色同步更新；汐行为回应气泡浮动化（仅汐显示，出现 4 秒自动淡出，不撑高角色卡，四角色卡高度恒定）；角色区与漂流场景加入自动轮播（5s 间隔，hover/键盘聚焦暂停，`prefers-reduced-motion` 禁用，复用现有切换动画，共用 `useAutoCycle` hook）
- **V2.3（角色 AI 聊天，已完成）**：角色区新增 AI 聊天（Modal 弹窗 + 聊天入口，随当前角色切换 persona）、4 位星海守望者各一套 persona（system prompt 基于角色卡）、魔搭社区免费模型 + Next.js Route Handler 服务端代理（key 不暴露浏览器）、SSE 流式打字机、多模型 auto fallback（限流/额度用尽自动切换）、无 key 时本地回复池降级（页面照常可玩）、聊天历史按角色 localStorage 持久化；**NFR-2 豁免声明**：AI 聊天为生成式特性，豁免「禁止生成式发言」约束（预置台词库/每日一句仍人工维护）；接入步骤见 **[AI_CHAT_SETUP.md](./AI_CHAT_SETUP.md)**
- **V2.4（聊天界面全面重构，已完成）**：聊天从 Modal 小窗升级为独立全屏沉浸页 `/chat/[roleId]`（项目首个动态路由）——顶栏（返回 + 56px 角色头像点击展开角色信息 + 状态指示器在线/思考中/输入中/异常 + 预设占位 + ⚙ 设置菜单含清空/导出记录 .txt/切换角色）、消息列表（首次骨架屏 / 空状态立绘+问候语+「今日推荐歌曲」入口 / 用户粉色气泡与 AI 毛玻璃气泡带角色色装饰条与时间戳 / 连续消息头像合并 / `[music: 歌名]` 解析为歌曲 chip / 上滑阅读历史时不自动跳底、滚回底部恢复 / 错误横幅红底含重试·关闭·5s 自动消失）、输入栏（多行自适应、字数 12/200 提示、🎵 选歌浮层「热门歌单 / 我的收藏」光标处插入、🎤 语音占位、发送加载态）、4 角色专属配色（汐紫粉/流明蓝白/朔空金蓝/悠紫暗）、页面入场/返回与消息入场动效（`prefers-reduced-motion` 禁用）；`/chat/*` 下隐藏全站顶栏与页脚；ChatModal 组件删除
- **V2.5（多 Provider 大池子，已完成）**：AI 聊天从魔搭单池升级为 9 家 Provider 注册表（`src/lib/llm/providers.ts`：魔搭/智谱/硅基流动/阿里百炼/Kimi/OpenRouter/Gemini/Groq/Cerebras，均有 key 自动启用、无 key 跳过），route.ts 重构为跨 Provider 调度（显式配置→内置优选→动态池，`provider::模型` 5 分钟冷却），服务端统一剥离 `<think>` 思维链（升级为兼容跨帧切碎标签，智谱 z1 等推理模型验证）；魔搭侧 V4-Flash 下线排除、智谱实测启用 glm-z1-flash/glm-4-flash/glm-4.7；新增 `scripts/verify-providers.mjs` 多 Provider 流式实测脚本；**跨 Provider 兜底实测通过**（魔搭 key 失效→自动落到智谱回复）
- **V2.6（API 层重构，已完成）**：以「单一数据源 + 模块化 + 单测」降低大池子维护成本——Provider 注册表数据迁移至 `src/lib/llm/providers.json`（`providers.ts` 与 verify 脚本共用同一份，消除已发生的 NVIDIA supportsPool 漂移；verify 脚本顺带修复「跳过内置优选」问题）；route.ts 从 327 行瘦身，调度/思维链剥离/上游请求分别拆至 `scheduler.ts` / `strip.ts` / `upstream.ts`（OpenRouter 特殊头、temperature/max_tokens 收进 provider 配置，删除死代码 MAX_TOTAL 校验，失败打 `console.warn` 日志）；`MAX_HISTORY/MAX_TEXT` 抽为 `src/lib/chat/limits.ts` 前后端共用；新增 vitest 单元测试（`strip` 分片标签状态机 / `buildSchedule` 调度顺序 / `providers.json` 数据合法性，22 项全绿，`npm test`）；Vercel 部署要点写入文档（`maxDuration=60` 防 10s 超时掐断流式、环境变量需在控制台配置）
- **V2.7（核心补齐 Phase 1，已完成）**：曲库扩至 52 首（t01-t04 保留 + 接入 `public/music/` 48 首 Kevin MacLeod CC BY 4.0，时长取自 CREDITS 表由 `scripts/gen-tracks.mjs` 生成，中文曲名星海风格命名，播放器/聊天选歌/周报全链路兼容）；58 张 AI 生图封面（6 歌单 + 52 曲目，300×300 webp，`scripts/gen-covers.py`，SenseNova 生图）；「歌单广场」独立路由 `/playlist`（风格×场景×情绪 AND 筛选 + 推荐/播放/新发布排序 + 空态，顶栏与首页入口）；歌单详情页 `/playlist/[id]`（头部播放全部/收藏歌单/分享 + 曲目列表正在播放高亮 eq 动画 + 同风格推荐 + 404/空态）；播放器升「多频道电台」（深夜/日系/学习/雨天/私人 FM 五频道，切换动画与节目单「当前+未来 5 首可插队」，主持人=四位角色、私人 FM 动态抽样 10 首）；player store 升级为队列制（`playQueue`/`playQueueAt`/`switchChannel`/歌单收藏，空队列安全）；新增 `music.test.ts`（曲库/歌单/频道数据完整性共 15 项）+ `player.test.ts`（歌单/频道/队列 9 项），`npm test` 96 项全绿，`npm run build` 通过
- **V2.8（体验增强 Phase 2，已完成）**：收藏歌单闭环（详情页 ★ 收藏 + toast 反馈 + 船员证「我的歌单」区块展示收藏/自建，按钮抽为 `FavoriteButton`，`Toast` 迷你提示）；UGC 自建歌单（三步创建弹窗 Step1 名称/简介/封面/标签 → Step2 `TrackPicker` 搜索勾选/全选/↑↓+HTML5 拖拽排序/实时校验 ≥3 首 → Step3 成功页；`drift-ugc-playlists` 本地持久化，上限 5 个；歌单广场「🚢 船客自建」专区 + 删除；`/playlist/[id]` 官方查不到走客户端 UGC 兜底复用详情页）；私人 FM（`fmEngine.ts` 推荐引擎：未听过优先/同 tag 加权/收藏歌单低频/随机兜底；切进生成不重复队列、播完末尾自动追加、全听完停留不越界；FM 专属 UI 隐藏节目单 + 「已了解你 X/52 首」进度条；`drift-fm-state` 持久化）；定时关闭（⏱ 面板 15/30/60 分/当前曲目结束/自定义 5-120 分，设置后倒计时显示可取消，到时暂停——「当前曲目结束」在 useAudioPlayer ended 分支处理）；新增 vitest（`fmEngine.test.ts` 7 项 / `ugcPlaylists.test.ts` 12 项 / `player.test.ts` FM+定时 8 项），`npm test` 123 项全绿，`npm run build` 通过
- **V2.9（差异化与联调 Phase 3，已完成）**：虚拟主持人（`host-lines.ts` 4 角色 × enter/per3/idle 台词池 + `HostBubble` 气泡 + `HostToggle` 开关持久化 + `useHostTrigger` 触发管理：进频道打招呼/每 3 首换曲介绍/60s 空闲安慰，点击头像跳 `/chat/[roleId]`）；漂流瓶绑歌（`TrackAttachmentCard` 收瓶/收信歌曲卡片可「▶ 播放这首歌」自动切频道播放 + 投瓶无播放空态，TrackSnapshot 补 id）；AI 聊天推歌（markdown 扩展 `[playlist: id]`/`[channel: id]` 标签 → `PlaylistRecommendCard`/`ChannelRecommendCard` 渲染 + `RECOMMEND_PROMPT` 追加 system prompt 教模型推荐）；弹幕频道隔离（`DanmakuMessage.channelId` + danmakuChannel 广播粒度改频道、显示按「频道+曲目」双过滤、频道切换清空弹幕；同船 presence 按频道统计，本地/真实双模式，`006_danmaku_presence.sql` 迁移加 channel_id 列）；歌单分享（`ShareModal` 复制链接/生成 1080×540 canvas 分享卡 `ShareCard`/分享到聊天选主持人跳 `/chat/[roleId]?share=…` 预填输入框）；新增 vitest（markdown 推荐标签 5 / shareUtils 5 / host-lines 6 / danmaku store 4），`npm test` 143 项全绿，`npm run build` 通过
- **后续**：RPC 契约类型（`src/types/rpc.ts`）、bad_words 双源收敛、错误处理硬化、周报定时推送（pg_cron 预留）

## 开发命令

```bash
npm run dev     # 开发服务器 http://localhost:3000
npm run build   # 生产构建
npm run start   # 运行生产构建
npm run lint    # ESLint
```

## 目录结构

```
src/
├─ app/                    # App Router
│  ├─ layout.tsx           # 根布局：星海背景层 + 粒子 + Topbar/Footer + ScrollChrome
│  ├─ page.tsx             # 首页：Hero → 跑马灯 → 角色 → 歌单 → 播放器 → 漂流 → 下载
│  ├─ sailor/page.tsx      # 船员证页（/sailor）
│  ├─ report/page.tsx      # 星海周报页（/report）
│  ├─ playlist/page.tsx    # 歌单广场（/playlist）
│  ├─ playlist/[id]/page.tsx # 歌单详情（/playlist/[id]，动态路由）
│  └─ globals.css          # 设计变量 + 基础样式 + 共享 keyframes
├─ components/             # 各区块组件 + 同名 *.module.css（交互组件 "use client"）
│  ├─ shared/              # 跨区块复用（SectionHead / Reveal / Modal / SkinBoat / StarSeaBg…）
│  └─ topbar|hero|marquee|character|playlist|player|bottle|download|sailor|report|layout/
├─ data/                   # 静态内容数据（tracks / playlists / channels / character / events / shio-lines…）
├─ hooks/                  # 浏览器 API 封装（useAudioPlayer / useReveal / usePresence…）
├─ lib/                    # api 查询层（isSupabaseReady 分支）+ realtime + supabase 客户端
├─ stores/                 # Zustand 状态中枢（player / identity / bottle / danmaku / shio）
└─ types/                  # 共享 TS 类型（music.ts / social.ts）
public/
├─ images/                 # 正式引用的封面/立绘/皮肤资源（webp + png）
├─ audio/                  # 本地试听音频
└─ 汐.mp4                  # Hero 视频背景
archive/                   # 历史归档（不参与构建）
├─ *.html / *.mp3          # 旧版单文件原型（对照物）
├─ docs/                   # 已落地的历史规格（ARCHITECTURE / DARK_THEME_SPEC / animation-spec）
├─ generated/              # AI 生图原始素材（正式版已在 public/images/）
└─ media/                  # 原型媒体 + public 未引用 png 源图
scripts/                   # 工具脚本（gen-star-sea-bg.sh 星海背景图生成）
supabase/                  # SQL 迁移（001~004）+ 种子，待配置联调
```

## 迁移地图（原型 → 组件，已全部完成）

| 原型区块（archive/anime-style.html） | 新位置 | 状态 |
|---|---|---|
| 顶栏 `.topbar` | `src/components/topbar/` | ✅ |
| 首屏 `.hero` | `src/components/hero/` | ✅（含星空 canvas + 弹幕层） |
| 跑马灯 `.marquee` | `src/components/marquee/` | ✅ |
| 角色登场 `#char` | `src/components/character/` | ✅（多角色切换版） |
| 歌单 `#playlist` | `src/components/playlist/` | ✅（米哈游焦点横排版） |
| 播放器 `#player` | `src/components/player/` | ✅（V1.0.1 全量体验） |
| 下载 `#download` | `src/components/download/` | ✅ |
| 页脚 `footer` | `src/components/layout/Footer` | ✅ |
| 视图切换器 `.view-switch` | — | 原型专有，重构后废弃 |

## 设计规范

> 完整开发指南见 **[STYLE_GUIDE.md](./STYLE_GUIDE.md)**（设计变量分类、`--kf-*` 动效约定、目录职责、"use client" 边界、清理铁律）。

- **配色**：全部 CSS 变量在 `src/app/globals.css` 的 `:root`，沿用原版（`--space` / `--pink` / `--blue` / `--gold` / `--ice` 等），组件内一律 `var(--*)` 引用，不写死色值
- **深海配色**（[archive/docs/DARK_THEME_SPEC.md](./archive/docs/DARK_THEME_SPEC.md) 已全量落地 + 崩坏3官网配色二期）：深空蓝渐变 body + **半透明深蓝玻璃卡**（`--panel: rgba(17,26,51,.72)` + `rgba(255,255,255,.15)` 浅描边，参考 bh3.mihoyo.com 实测，无白色实心块）；全站浅色文字统一 `--ink*` 系列（`--ink-panel*` 同值保留分层）；卡片阴影为深空晕影 + 粉/青品牌辉光；输入框覆盖 UA 白底为玻璃色
- **AI 生图背景**：`StarSeaBg` 固定背景层（AI 生成星海氛围图 `public/images/star-sea-bg.webp`，sensenova-u1-fast，24KB）+ 深色蒙版渐变压制亮度（顶部最深衔接 Hero）；与 `ParticleRails` 同层（图在下粒子在上），body 保留纯色兜底；生成脚本可参考 `scripts/gen-star-sea-bg.sh`
- **角色切换页**：`CharacterSection` 仿崩坏3官网角色板块（调研自 `bh3.mihoyo.com` 的 75px 头像切换列表）——四位星海守望者（汐 SIO / 流明 LUMEN / 朔空 SOKU / 悠 YOE，同画师立绘 `public/images/`）：头像点击切换立绘 + 档案（名称/标签/描述/统计），立绘切换淡入（`--kf-rise`）；每日一句为 4 位角色各一套专属文案（深夜/清晨/日常三时段，切换角色同步更新，汐沿用原文案库）；行为回应气泡浮动化（汐专属，出现 4 秒自动消失，不改变角色卡高度）；`CHARACTERS` 数据在 `src/data/character.ts`，文案在 `src/data/shio-lines.ts`
- **字体**：系统字体栈 `--sans`，不引入 Web Font
- **动效**：米哈游/崩坏3 官网风格滚动动画——全区块内容错落浮现（scroll-driven `view()` 优先 + IntersectionObserver 降级，共享 `Reveal` 组件）+ 轻微视差（标题区/角色图，`scroll(root)` 时间线）；Hero 首屏 exit-scrub 滚动叙事；`prefers-reduced-motion` 全局压制；只动 transform/opacity
  - **文字扫金 hover**：米哈游官网招牌动效（调研自 `bh3.mihoyo.com` 的 `.lf-to-rt`）——全局工具类 `.sweepGold`，元素加 `data-text="可见文字"` 后金色文字从左到右扫过（`attr(data-text)` 双层文本 + `width 0→100%`，0.3s）；`.sweepGold--left` 变体用于左对齐导航链接；已接入顶栏导航/免费下载胶囊、Hero 双按钮、启航按钮；`:focus-visible` 同样触发（无障碍）
  - **歌单焦点横排**：歌单区为米哈游「舞台」式焦点卡列表（调研自 `bh3.mihoyo.com` 舞台板块）——1 张大卡（480px，叙事描述 + 立即播放）+ 3 张小卡（220px）横排，hover/键盘聚焦切换焦点（`flex-basis` 0.5s 过渡，4 卡低频破例于 transform/opacity 铁律），溢出容器横向滚动；`<960px` 降级为原有网格
  - **背景点线粒子**：全站背景装饰层 `ParticleRails`（调研自 `bh3.mihoyo.com` 的 `.line-dot-ani`）——6 条 1px 竖线 × 每线 4 个 5px 圆点，两档透明度（.25/.35 亮组、.05/.15 暗组）散布视口；点沿线漂移（`railDot` 11-20s）+ 线呼吸（`railLine` 6-10s）；纯服务器组件（无 JS），确定性伪随机分布（SSR 一致），fixed z-index 0 + pointer-events none，reduced-motion 全局压制
  - **keyframes 约定**：10 个 keyframes 定义在 `globals.css`，同时 `:root` 提供 `--kf-xxx` 别名变量；CSS Module 内统一写 `animation: var(--kf-xxx) …`（Turbopack 会把模块内 animation 名局部化，直接写全局名会产生悬空引用）
- **断点**：960px（导航隐藏/区块单列）、560px（悬浮组件）、420px（网格单列）

## 环境变量

```bash
cp .env.example .env.local   # 填入 Supabase URL 与 anon key
```

未配置时 `getSupabase()` 返回 `null`，页面照常运行（本地模拟池）。

> **从本地模拟切到真实 Supabase 后端**：完整步骤见 **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**（建项目 → 启用匿名登录 → 执行迁移 → `npm run verify:real` 冒烟验证）。SQL 迁移 `supabase/migrations/001~004 + seed.sql` 已就绪待执行。

## 音乐版权

- 试听音乐：Kevin MacLeod（incompetech.com）CC-BY-4.0 · SoundHelix
- 角色「汐」为虚构形象
