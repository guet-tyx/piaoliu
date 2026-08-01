# 阶段二：跑马灯 + 角色卡组件迁移

## 0. Git 基线提交（用户已明确要求）
- `git add -A && git commit -m "feat: 初始化 Next.js 项目架构与全局样式系统"`

## 1. 数据文件
- **`src/data/marquee.ts`**：导出 `GENRES: string[]`（后摇/爵士嘻哈/城市民谣/环境电子/港乐/独立流行/说唱/氛围/合成器浪潮/部落节拍，共 10 个）
- **`src/data/character.ts`**：导出 `CHARACTER` 对象 + 类型：
  - `name: "汐"`、`en: "SIO"`、`lv: "★ 星海版限定"`、`image: "/images/anime-hero.png"`、`alt`
  - `tags: [{ label: "# 星海导游", variant: "hot" }, { label: "# 纸船船长", variant: "blue" }, …]`（4 个）
  - `desc`、`stats: [{ value: "128.4", suffix: "万", label: "次播放" }, …]`（3 项）
  - 统计项**保留 `data-count`/`data-suffix` 属性**为后续数字滚动组件留钩子，本次静态渲染最终值

## 2. 组件
- **`src/components/marquee/MarqueeSection.tsx` + `.module.css`**
  - 深色跑马灯条（`--space` 底 + 顶部蓝色细边），`aria-hidden`
  - `GENRES` map 渲染，双组轨道实现无缝循环；`animation: marquee 40s linear infinite`（keyframes 已在 globals.css 全局定义）
  - `.m-item` + `.m-sep`（✦）结构，CSS 原样移植（211-221 行）
- **`src/components/character/CharacterSection.tsx` + `.module.css`**
  - `section id="char"` + `.section-head`（tag-dot 发光圆点 + h2 + sec-sub）
  - `.char-card` 双列 Grid（`minmax(280px,.9fr) 1.1fr`），hover 上浮阴影
  - 角色图用 **next/image `fill`**（替代裸 `<img>`，避免 ESLint no-img-element 告警，object-fit 由 CSS 保持）
  - `.char-pic::after` 白色渐变过渡层、`.lv` 金色徽标、4 个 `.ctag`（hot/blue 变体）、`.char-stats` 渐变数字
  - 滚动揭示 `revealUp`（view() 时间线）移植到 `.section-head`/`.char-card`
  - 响应式：960px 单列（图片 min-height 240px、渐变改纵向）、420px stats 改 2 列

## 3. 共享样式微调
- `globals.css` 补一个**共享布局原语** `.section`（max-width 1120px + padding 96px 24px，960px 时 76px 20px）——后续歌单/播放器/下载区共用，避免各模块重复

## 4. 页面组装（`src/app/page.tsx`）
- 顺序：`<Topbar /> → <Hero /> → <MarqueeSection /> → <CharacterSection />`（nav 的 `#char` 锚点随之生效）

## 5. 验收
- `npm run lint` 零告警 + `npm run build` 无报错；dev server 冒烟（HTTP 200 + 新区块文案渲染检查）

## 不在本次范围
- 数字滚动动画、跑马灯 hover 暂停、歌单/播放器等后续区块