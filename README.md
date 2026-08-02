# 漂流 DRIFT · Web 重构

二次元音乐网站「漂流 DRIFT · 星海版」从单文件 HTML 原型（`archive/anime-style.html`）重构为 Next.js 应用。

## 技术栈

- **Next.js 16（App Router）+ TypeScript** — 框架
- **CSS Modules** — 样式（全局变量/基础/keyframes 在 `src/app/globals.css`，组件私有样式在各组件 `.module.css`）
- **Zustand** — 状态管理（`src/stores/`）
- **Supabase** — BaaS（客户端 `src/lib/supabase/client.ts`，尚未接入真实后端）

## 版本状态

- **V1.0.1（体验修补，已完成）**：进度条可拖动、音量/静音、三种播放模式、收藏持久化、弹幕开关真实接线、下载/社交链接真实化（FR-1~FR-6）
- **V1.1（纸船漂流 + 汐的陪伴，已完成）**：匿名投瓶（绑定当前歌曲）、随机拾瓶（卡牌开箱）、回信靠岸、星海来讯、瓶面卡分享图、汐每日一句（时段变化）；Supabase SQL（建表/RLS/RPC/种子）已就绪待配置联调，未配置 env 时走本地模拟池全流程可玩
- **V1.2（星尘身份 + 收集系统，已完成）**：`/sailor` 独立船员证页（代号/昵称/等级称号/羁绊进度）、汐行为回应与羁绊累积（7 天去重）、纸船皮肤 3 款（等级解锁，漂流区/瓶面卡生效）、徽章 4 枚、跨设备找回码、举报入口（NFR-1）；SQL 增量迁移 `002_collection.sql` 待联调
- **V1.3（同船共听 + 真实弹幕，已完成）**：实时通道抽象层（本地 BroadcastChannel 双标签演示 / Supabase Realtime 预留）、同曲在线人数与匿名头像流、同船弹幕（1-50 字 + 敏感词过滤 + 10s 自动消失）、发弹幕入口、系统事件弹幕（启航/拾瓶/回信/听歌/收信，30s 频控）、假弹幕全部移除（FR-11）；SQL 增量迁移 `003_realtime.sql` 待联调
- **V2.0（星海周报 + 节日活动，已完成）**：`/report` 周报页（本周航行小结/热门航线 top3/收听星图/启航瓶子 + canvas 分享图）、收听追踪（每歌次数/按天分布）、节日活动框架 + 2 示例（夏日漂流祭 8 月自动生效 / 新年许愿瓶配置就绪，`?event=` 测试开关）、活动限定瓶面样式落库、羁绊里程碑（10/20/30 汐专属回应）+ 船员证最近航行小结；SQL 增量迁移 `004_report_events.sql` 待联调
- **后续**：真实 Supabase 联调（`001`~`004` 迁移）、周报定时推送（pg_cron 预留）

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
│  ├─ layout.tsx           # 全局 metadata（标题/描述/theme-color #050C1E）
│  ├─ page.tsx             # 首页：Topbar + Hero
│  └─ globals.css          # 设计变量 + 基础样式 + 共享 keyframes
├─ components/
│  ├─ topbar/              # 顶栏（B站式亮色毛玻璃）
│  └─ hero/                # 首屏（深空压轴，星空/弹幕待接入）
├─ data/tracks.ts          # 星海电台曲目（多源音频降级）
├─ lib/supabase/client.ts  # Supabase 懒加载客户端
├─ stores/player.ts        # 播放器 Zustand store（骨架）
└─ types/music.ts          # Track 类型
public/
├─ images/                 # 封面与 hero 背景
└─ audio/                  # 本地试听音频
archive/                   # 旧版单文件原型（引用根目录 images/ audio/）
```

## 迁移地图（原型 → 组件）

| 原型区块（archive/anime-style.html） | 新位置 | 状态 |
|---|---|---|
| 顶栏 `.topbar` | `src/components/topbar/` | ✅ 第一步（静态壳） |
| 首屏 `.hero` | `src/components/hero/` | ✅ 第一步（静态壳，星空 canvas/弹幕待接入） |
| 跑马灯 `.marquee` | — | ⏳ 待迁移 |
| 角色登场 `#char` | — | ⏳ 待迁移 |
| 歌单 `#playlist` | — | ⏳ 待迁移 |
| 播放器 `#player` | — | ⏳ 待迁移（store 已就绪） |
| 下载 `#download` | — | ⏳ 待迁移 |
| 页脚 `footer` | — | ⏳ 待迁移 |
| 视图切换器 `.view-switch` | — | 原型专有，重构后废弃 |

## 设计规范

> 完整开发指南见 **[STYLE_GUIDE.md](./STYLE_GUIDE.md)**（设计变量分类、`--kf-*` 动效约定、目录职责、"use client" 边界、清理铁律）。

- **配色**：全部 CSS 变量在 `src/app/globals.css` 的 `:root`，沿用原版（`--space` / `--pink` / `--blue` / `--gold` / `--ice` 等），组件内一律 `var(--*)` 引用，不写死色值
- **深海配色**（DARK_THEME_SPEC.md 全量落地 + 崩坏3官网配色二期）：深空蓝渐变 body + **半透明深蓝玻璃卡**（`--panel: rgba(17,26,51,.72)` + `rgba(255,255,255,.15)` 浅描边，参考 bh3.mihoyo.com 实测，无白色实心块）；全站浅色文字统一 `--ink*` 系列（`--ink-panel*` 同值保留分层）；卡片阴影为深空晕影 + 粉/青品牌辉光；输入框覆盖 UA 白底为玻璃色
- **AI 生图背景**：`StarSeaBg` 固定背景层（AI 生成星海氛围图 `public/images/star-sea-bg.webp`，sensenova-u1-fast，24KB）+ 深色蒙版渐变压制亮度（顶部最深衔接 Hero）；与 `ParticleRails` 同层（图在下粒子在上），body 保留纯色兜底；生成脚本可参考 `gui-test-screenshots/gen-star-sea-bg.sh`
- **角色切换页**：`CharacterSection` 仿崩坏3官网角色板块（调研自 `bh3.mihoyo.com` 的 75px 头像切换列表）——四位星海守望者（汐 SIO / 流明 LUMEN / 朔空 SOKU / 悠 YOE，同画师立绘 `public/images/`）：头像点击切换立绘 + 档案（名称/标签/描述/统计/表情），立绘切换淡入（`--kf-rise`）；每日一句与行为回应为汐专属（切换隐藏）；`CHARACTERS` 数据在 `src/data/character.ts`
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

未配置时 `getSupabase()` 返回 `null`，页面照常运行。

## 音乐版权

- 试听音乐：Kevin MacLeod（incompetech.com）CC-BY-4.0 · SoundHelix
- 角色「汐」为虚构形象
