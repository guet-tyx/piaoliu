# 阶段五：SectionHead 重构 + 星海 Canvas 粒子 + Hero 弹幕带

## 0. Git 提交（用户已明确要求）
- `git commit -m "feat: 新增歌单交互与下载/页脚区块，完成页面结构 100% 完整"`

## 1. 重构：`src/components/shared/SectionHead.tsx` + `.module.css`
- Props：`tag: string`、`title: string`、`subtitle?: ReactNode`（**ReactNode 而非 HTML 字符串**——避免 dangerouslySetInnerHTML，`<b>` 加粗由调用方 JSX 传入）、`centered?: boolean`（下载区居中变体）、`className?` 透传
- 结构：`.sectionHead > .tagDot(i) + h2 + .secSub`
- **替换 4 处重复**：CharacterSection / PlayerSection / PlaylistSection / DownloadSection（下载区传 `centered`）
- 样式从现有 4 份 module 中合并为一份（tag-dot/h2/sec-sub），删除各模块内的重复块

## 2. `src/components/hero/StarField.tsx` + `.module.css`（"use client"）
- 迁移原型 958-1005 行星尘 IIFE，React 化：
  - `useRef<HTMLCanvasElement>` + 挂载 effect 初始化（SSR 安全：canvas 无 JS 内容，无水合问题）
  - `matchMedia('(prefers-reduced-motion: reduce)')` 命中直接不初始化
  - `resize`（passive）重建：DPR = min(devicePixelRatio, 2)，粒子数 min(80, W×H/16000)，x/y/r/a/da 随机，70% 粉 (251,114,153) / 30% 蓝 (0,174,236)
  - `tick()`：clearRect + alpha 0.1-0.85 反弹 + arc 绘制 + rAF 循环
  - `visibilitychange`：hidden → cancelAnimationFrame；visible → 重启 tick
  - **cleanup：cancelAnimationFrame + 双 removeEventListener**（延续项目防泄漏惯例）
- 组装：Hero 内 `.stars`（absolute inset 0 + pointer-events:none），位于 hero-inner 之下

## 3. `src/data/danmaku.ts` + `src/components/hero/HeroDanmaku.tsx` + `.module.css`
- 数据：6 条（文案/top/dur/delay/variant，与原型 614-621 逐字对齐）
- 组件：map 渲染 `span.dm`，行内 `--dmdur/--dmdelay/top` 变量 + pink/blue 变体类（保持原型机制）
- CSS：`.dm-zone`（absolute inset 0 overflow hidden）+ `.dm`（白字黑描边、`animation: var(--kf-dmFloat) var(--dmdur,10s) linear infinite`）+ 变体
- 纯静态组件（无 JS）→ server 渲染，Hero 保持 server 组件

## 4. Hero.tsx 组装
- `<StarField />` + `<HeroDanmaku />` 替换原注释占位，层级：canvas → 弹幕 → hero-inner（内容之下，与原型一致）

## 5. 验收
- lint + build 无报错
- 浏览器 GUI：SectionHead 重构后 4 区块标题/角标文案不变（DOM 对比）；canvas 元素存在（可读尺寸）；弹幕 6 条 span 渲染（含行内变量）
- visibilitychange 暂停：IAB 单 tab 难模拟切换，以代码审查为证据如实说明；粒子闪烁可能受 IAB 动画时钟冻结影响（已知环境限制），以 canvas 存在 + 逻辑迁移正确为准

## 不在本次范围
- 数字滚动动画、hero scroll-driven JS 降级、LocalStorage 持久化（阶段六）