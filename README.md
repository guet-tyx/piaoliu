# 漂流 DRIFT · Web 重构

二次元音乐网站「漂流 DRIFT · 星海版」从单文件 HTML 原型（`archive/anime-style.html`）重构为 Next.js 应用。

## 技术栈

- **Next.js 16（App Router）+ TypeScript** — 框架
- **CSS Modules** — 样式（全局变量/基础/keyframes 在 `src/app/globals.css`，组件私有样式在各组件 `.module.css`）
- **Zustand** — 状态管理（`src/stores/`）
- **Supabase** — BaaS（客户端 `src/lib/supabase/client.ts`，尚未接入真实后端）

## 版本状态

- **V1.0.1（体验修补，已完成）**：进度条可拖动、音量/静音、三种播放模式、收藏持久化、弹幕开关真实接线、下载/社交链接真实化（FR-1~FR-6）
- **V1.1（纸船漂流 + 汐的陪伴）**：架构蓝图见 [ARCHITECTURE.md](./ARCHITECTURE.md)，实现另起阶段

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
- **字体**：系统字体栈 `--sans`，不引入 Web Font
- **动效**：米哈游/B站风微交互 + 滚动动效；scroll-driven CSS 优先（`@supports`）、JS 降级；`prefers-reduced-motion` 全局压制；只动 transform/opacity
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
