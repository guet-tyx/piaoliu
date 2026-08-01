# 阶段六（终章）：文档沉淀 + 交互打磨

## 0. Git 提交（用户已明确要求）
- `git commit -m "refactor: 提取 SectionHead 共享组件，新增星尘粒子与 Hero 弹幕特效"`

## 1. STYLE_GUIDE.md（开发指南）
- **设计系统**：CSS 变量分类（深空色系/亮色底/品牌粉蓝/文字/边框/字体栈）、用法约定（组件内一律 `var(--*)`）
- **动效规范**：`--kf-*` 变量代理约定的来龙去脉（Turbopack keyframes 作用域冲突）与 10 个全局 keyframes 用途表；reduced-motion / scroll-driven 策略；断点约定
- **目录结构**：app / components（含 shared）/ hooks / stores / lib / data / types 职责
- **开发约定**：TS 接口命名风格（`interface XxxProps` + 函数组件）、"use client" 使用边界（有交互/浏览器 API 的组件才用；纯静态保持 server）、事件监听 cleanup 铁律、SSR 水合注意事项（确定性伪随机等）

## 2. 数字滚动：`src/hooks/useCountUp.ts` + `src/components/shared/CountUp.tsx`
- **useCountUp(target, { duration = 1300 })**：返回 `{ ref, value }`
  - IO（threshold .4，触发一次即 unobserve）→ rAF + performance.now 驱动
  - 缓动：**cubic-bezier(.22, .61, .36, 1)**（标准求解器，Newton-Raphson，按用户要求；原型是 easeOutCubic）
  - reduced-motion 直接跳终值；cleanup 断开 IO + 取消 rAF
- **CountUp({ end, suffix?, decimals? })**：渲染 `<b>`（保持 `.cstat b` 渐变样式）+ `data-count/data-suffix` 属性；格式化按原型规则：整数目标 ≥1000 → `toLocaleString('en-US')` 千分位，小数 → 按 end 推导位数
- **CharacterSection → "use client"**，统计数字替换为 `<CountUp end={Number(stat.value)} suffix={stat.suffix} />`
- SSR 一致性：首屏渲染 0（与原型一致，data-count 供 SEO），IO 触发后才滚数

## 3. 滚动动效 JS 降级：`src/components/hero/Hero.tsx`（"use client"）
- 迁移原型 1049-1069 逻辑，React 化：
  - 守卫：`CSS.supports('animation-timeline','scroll()')` 支持 → 交 CSS；reduced-motion → 跳过
  - `p = clamp((vh - rect.top) / (vh*1.1), 0, 1)`；copy → `opacity 1-p*0.95` + `translate 0 -90p px`；hero → `opacity 1-p*0.75` + `scale(1+p*0.06) translateY(40p px)`（与 CSS 版数值一致）
  - **rAF 节流**（ticking 标志）+ scroll/resize passive 监听 + 初始 update
  - **cleanup：取消 rAF + 移除双监听**（原型 IIFE 未清理，React 版补上）
- 注：文件名为 `Hero.tsx`（用户指令写的 HeroSection.tsx，实际组件即 Hero.tsx）

## 4. 播放状态持久化：`src/hooks/useAudioPlayer.ts`
- **恢复**：挂载 effect 中读 localStorage → `setState({ currentIndex, isPlaying: false })`（**恢复曲目但不自动播放**——符合"避免浏览器阻止自动播放"；放挂载后而非 store 初始化，规避 SSR 水合不一致，因为恢复值只存在于客户端）
- **持久化**：`subscribe((state, prev) => 仅 currentIndex/isPlaying 变化时写入)`——避免 setProgress 4Hz 写 localStorage
- try/catch 容错损坏数据；cleanup 退订

## 5. 最终验收
- `npm run build` 无报错 + lint 干净
- STYLE_GUIDE.md 通读检查（清晰度/完整性）
- 浏览器 GUI：角色卡数字 data-count 属性保留、初始 0、滚动进入视口后滚数（IAB rAF 冻结则如实报告，以代码逻辑为准）；Hero 降级逻辑在支持 scroll-driven 的浏览器不介入（代码审查）

## 不在本次范围
- 光标微光（cursor-glow）、hero 弹幕 JS 化、多页面路由