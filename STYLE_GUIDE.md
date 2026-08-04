# 漂流 DRIFT · 前端开发指南（STYLE GUIDE）

> 项目：`drift-web`（Next.js 16 App Router + TypeScript + CSS Modules + Zustand + Supabase）
> 本文档是组件开发、动效接入、状态管理的第一手规范。修改全局样式/动效前请先阅读。

---

## 一、设计系统

### 1.1 设计变量（`src/app/globals.css` `:root`）

所有颜色、字体、布局令牌以 CSS 变量定义，**组件内一律 `var(--*)` 引用，禁止写死色值**。

| 分类 | 变量 | 用途 |
|---|---|---|
| 深空色系 | `--space` `--space-2` | hero/跑马灯等深色区块背景 |
| 亮色底 | `--bg` `--bg-top` `--panel` `--panel-2` | 页面渐变背景、卡片面板 |
| 品牌粉 | `--pink` `--pink-bright` `--pink-deep` | 主 CTA、强调、渐变起点（B站粉） |
| 品牌蓝 | `--blue` `--blue-bright` `--blue-deep` | 次要强调、渐变终点 |
| 辅助色 | `--gold` `--ice` | 金色徽标 / 冷色描边 |
| 文字 | `--ink` `--ink-2` `--ink-3` | 主/次/弱文字 |
| 边框 | `--line` | 分隔线与描边 |
| 字体 | `--sans` | 系统字体栈（**禁止引入 Web Font**） |

渐变规律：品牌渐变统一为 `linear-gradient(120deg, var(--pink), var(--blue))` 或粉→粉深。
文字渐变（`.hl`、`.cstat b`）用 `background-clip: text; color: transparent`。

### 1.2 布局

- 页面内容宽度：`1120px`（`.section` 共享类，定义于 `globals.css`）
- 区块垂直节奏：`padding: 96px 24px`（960px 以下 `76px 20px`）

---

## 二、动效规范

### 2.1 `--kf-*` 变量代理约定（重要）

**背景**：Turbopack 会把 CSS Module 里的 `animation` 名局部化（如 `marquee` → `MarqueeSection-module__xxx__marquee`），而 keyframes 定义在 `globals.css` 中是全局名 → 直接引用会产生**悬空引用，动画静默失效**。

**约定**：10 个 keyframes 全部定义在 `globals.css`，同时在 `:root` 提供 `--kf-*` 别名变量。**CSS Module 内统一写作 `animation: var(--kf-xxx) …`**（CSS 变量不受模块作用域影响，运行时正确解析到全局 keyframes）。

```css
/* ✅ 正确 */
.marqueeTrack { animation: var(--kf-marquee) 40s linear infinite; }

/* ❌ 错误：Turbopack 会局部化 marquee，动画不生效 */
.marqueeTrack { animation: marquee 40s linear infinite; }
```

### 2.2 全局 keyframes 用途表（`globals.css`）

| keyframes | 别名 | 用途 |
|---|---|---|
| `dmFloat` | `--kf-dmFloat` | 弹幕右→左匀速漂移（hero 弹幕带 / 唱片弹幕） |
| `rise` | `--kf-rise` | 首屏文案错落淡入上浮（nth-child stagger） |
| `hintDrop` | `--kf-hintDrop` | "SCROLL" 指示线呼吸 |
| `marquee` | `--kf-marquee` | 跑马灯无缝循环（双组轨道 -50%） |
| `spin` | `--kf-spin` | 黑胶唱片旋转（idle 16s / playing 7s） |
| `eqb` | `--kf-eqb` | 频谱柱呼吸（`.live` 才运行） |
| `heartPop` | `--kf-heartPop` | 红心点赞弹性弹出 |
| `revealUp` | `--kf-revealUp` | 滚动揭示（view() 时间线） |
| `heroFade` | `--kf-heroFade` | hero 文案滚动渐隐上移（scroll-driven，exit range） |
| `heroScrub` | `--kf-heroScrub` | hero 整体缩放淡出（scroll-driven，exit range） |

新增 keyframes：先加进 `globals.css`（定义 + `:root` 别名），模块里用 `var()` 引用。

### 2.3 滚动动效策略

- **CSS scroll-driven 优先**：`@supports (animation-timeline: scroll())` 内启用 `view()` 时间线动画；**首屏元素用 exit range，非首屏用 entry range**
- **JS 降级兜底**：不支持的浏览器由组件内 effect 手动计算滚动进度（`Hero.tsx` 已实现 hero exit-scrub 降级，数值与 CSS 版一致）；支持时 effect 直接 return
- 只动 `transform` / `opacity`（合成器友好）

### 2.4 动效偏好与性能

- `prefers-reduced-motion: reduce`：全局压制（globals.css 兜底）+ 各模块内显式禁用重动画（`.dm/.record/.eq i` 等）+ JS 侧（StarField/useCountUp）直接跳终值或不初始化
- Canvas 粒子：`visibilitychange` 隐藏时 `cancelAnimationFrame`、恢复时重启；`resize` passive
- 断点：`960px`（导航隐藏/区块单列）、`560px`（悬浮组件）、`420px`（网格单列）

---

## 三、目录结构

```
src/
├─ app/                    # App Router：layout（metadata）+ page（组装）+ globals.css（设计系统）
│  ├─ chat/[roleId]/       # 全屏聊天页动态路由（首个 [param] 路由，server 层校验 + 客户端组件）
│  └─ api/chat/route.ts    # 服务端代理（AI 聊天）：服务端密钥只在此层读取，不暴露浏览器
├─ components/
│  ├─ shared/              # 跨区块复用组件（SectionHead / CountUp / Modal）
│  ├─ chat/                # 全屏聊天页组件组（ChatPage 总装 + 顶栏/消息列表/输入栏/选歌浮层）
│  ├─ topbar|hero|marquee|character|playlist|player|download|layout/
│  │                       # 各区块：组件名 + 同名 *.module.css（样式私有化）
│  └─ 区块组件              # 有交互的加 "use client"，纯静态保持 server
├─ hooks/                  # 浏览器 API 封装（useAudioPlayer / useCountUp / usePrefersReducedMotion）
├─ stores/                 # Zustand 状态中枢（player.ts：唯一播放器状态源）
├─ lib/                    # 基础设施（supabase 客户端 / chat 本地回复池与常量）
│  └─ llm/                 # AI 调度层（providers.json 单一数据源 + scheduler/strip/upstream 模块）
├─ data/                   # 静态内容数据（tracks / playlists / danmaku / character…），
│                          # 未来切换 Supabase 时替换为查询层
└─ types/                  # 共享 TS 类型（music.ts / chat.ts 等）
```

分层依赖规则：`components → hooks/stores/data → types`，单向依赖，**禁止循环导入**。

---

## 四、开发约定

### 4.1 TypeScript

- 组件 Props 用 `interface XxxProps`，函数组件命名导出（`export function Xxx()`）
- 数据模型接口放 `src/types/` 或就近 `data/*.ts`；字段名与原型 TRACKS 对齐时保持简短（`t/s/tag`），并在注释中说明
- 行内 CSS 变量（`--dmdur` 等）用 `as CSSProperties` 断言
- 回调/事件监听内读取最新状态：用 `usePlayerStore.getState()` 或 ref 同步，**避免闭包过期**

### 4.2 "use client" 使用边界

| 场景 | 指令 |
|---|---|
| 使用 hooks（useState/useEffect/浏览器 API）| ✅ 文件顶部 `"use client"` |
| 点击/键盘交互、localStorage、IntersectionObserver、canvas | ✅ `"use client"` |
| 纯静态展示（无交互）| ❌ 保持 server 组件（默认） |
| 只读 store 状态（不调用动作）| 可保持 server（Zustand 纯数据）|

注意：client 组件不能直接 import server 组件；纯静态子组件被 client 父组件 import 时会并入 client 包（无 server-only API 即安全）。

### 4.3 事件监听与清理（铁律）

所有 `addEventListener` / `IntersectionObserver` / rAF 循环 / store subscribe 必须在 effect cleanup 中释放：

```ts
useEffect(() => {
  const audio = new Audio();
  const onX = () => {};
  audio.addEventListener("x", onX);
  return () => {
    audio.removeEventListener("x", onX); // 全量移除
    cancelAnimationFrame(raf);            // 取消动画循环
    observer.disconnect();                // 断开观察器
    unsubscribe();                        // 退订 store
  };
}, []);
```

StrictMode 双挂载下此模式安全；不清理会内存泄漏（audio 元素、IO、rAF 链）。

### 4.4 SSR 水合一致性

- **确定性伪随机**：客户端需要"随机"视觉效果（EQ 频谱柱高度/延迟）时用固定公式生成（如 `22 + (i*37)%67`），**禁止 `Math.random()`**（SSR 与客户端渲染不一致会报水合错误）
- 客户端专属数据（localStorage、设备信息）必须在 `useEffect`（挂载后）读取并 `setState`，不能在模块顶层/首渲染读取
- `next/image`：`fill` + `sizes` + 显式 `objectFit`

### 4.5 状态管理

- **唯一状态源**：播放器状态全部在 `stores/player.ts`；UI 层只读（仅调 actions），`useAudioPlayer` hook 是 store ↔ `<audio>` 的唯一桥接
- 持久化：localStorage 键 `drift-player-state`（存 `currentIndex/isPlaying`），恢复时**不自动播放**
- 新状态先想清楚归属：跨组件共享 → store；组件私有 → useState/useRef

### 4.6 提交规范

- 语义化 message：`feat:`（功能）/ `refactor:`（重构）/ `fix:`（修复）/ `docs:`（文档）
- 每个阶段一个提交，保证可回滚到任意阶段基线

---

## 五、音乐版权

试听音频：Kevin MacLeod（incompetech.com）CC-BY-4.0 · SoundHelix。新增音频需同样使用可商用来源并在 `Footer` credit 中声明。
