# 苹果发布页动画规格（零依赖实施方案）

> 调研日期：2026-08-01 | 约束：纯 HTML/CSS 单文件 + 少量原生 JS，零外部库
> 适用页面：index.html（真身）/ qqmusic-style.html / wangyiyun-style.html

## 一、苹果发布页 10 大动效模式

| # | 模式 | 视觉特征 | 苹果参考页 |
|---|------|---------|-----------|
| 1 | 滚动讲故事（章节叠化） | 整屏章节随滚动切换：文案/场景叠化或滑移，像翻页电影 | iPhone 16 Pro / MacBook Air |
| 2 | 产品图 scroll-scrub | 产品图随滚动缩放/旋转/位移，进度严格绑定滚动位置，"3D 转台"感 | iPhone hero / MacBook Air 开合 |
| 3 | 滚动视频 scrub | 视频帧随滚动前进/后退，alpha 透明通道让产品"悬空" | AirPods Pro 2 |
| 4 | 大标题滚动渐隐 + 文字特效 | 巨型标题进入视口时缩放/模糊/渐隐；滚动擦色文字 | 各产品页 headline |
| 5 | 性能数字 count-up | 规格数字从 0 滚动到目标值 | MacBook Air "18 小时" |
| 6 | 星空/粒子/流光背景 | 粒子、光斑、渐变流动，材质感 | Apple Watch / AirPods 光影 |
| 7 | 序列帧伪 3D | 预渲染帧按滚动逐帧切换，省算力画质可控 | MacBook 合盖 |
| 8 | 卡片/元素阶梯揭示 | 特性卡片错峰滑入+淡入 | Compare 对比页 |
| 9 | 章节吸顶导航 + 视差多层 | 章节目录 sticky 吸顶随滚动高亮；背景多层错速 | 所有产品页 chapternav |
| 10 | 玻璃拟态吸顶栏 | 导航滚动后变 blur 半透明条 | 所有 apple.com 页面 |

## 二、浏览器兼容矩阵（2026-08 实测 MDN BCD）

| 特性 | Chrome/Edge | Safari | Firefox |
|---|---|---|---|
| `animation-timeline: scroll()/view()` | 115+ ✅ | **26.0+（2025-09-15）** | ❌ 仅 Nightly |
| `animation-range` | 115+ ✅ | 26.0+ | ❌ 仅 Nightly |
| `animation-trigger` | 146+ | ❌ | ❌（不要依赖） |
| `position: sticky` | ✅ | ✅ | ✅ |
| `linear()` 缓动 | 113+ | 17.5+ | 112+ |

**关键结论**：
- Safari 18.4~25.x（iOS 17/18 设备）与 Firefox 稳定版**均不支持** scroll-driven animations
- 所有 CSS scroll-driven 必须包 `@supports (animation-timeline: scroll())`，并提供等价 JS 降级
- Apple 官网源码抓取证实：苹果自用**自研 JS 媒体管线**（预渲染 HEVC 视频 + alpha 通道 + `data-inline-media-play-keyframe` 视口区间装载 + 海报帧兜底），未用 CSS scroll-driven；但 WebKit 官方教程（Safari 26 发布配套）示范"纯 CSS 复刻自家效果"——与本项目路线一致

## 三、零依赖实现方案映射

| 模式 | 首选实现 | 降级/风险 | 性能要点 |
|---|---|---|---|
| 1 滚动讲故事 | CSS：外层 `position:sticky; top:0; height:100vh`，内部 N 屏 absolute 叠放 + `view()` 控制 opacity/translateY 叠化 | `@supports` 外 JS rAF 切换 class | 只动 transform/opacity |
| 2 产品图 scrub | CSS：`view()` + range + `linear()` 缓动拼 Apple 式曲线 | 同上 | 只动 transform（或独立 rotate 属性） |
| 3 视频 scrub | JS：`<video muted playsinline preload='none'>` + poster，scroll 监听（passive）+ rAF 设 currentTime | 全兼容；iOS 需先 loadedmetadata | 720-1080p、HEVC |
| 4 标题渐隐/擦色 | CSS：`view()` + opacity/translateY；擦色用 `background-clip:text` + background-size | `@supports` 外 JS | 擦色是绘制层，元素要少 |
| 5 count-up | JS：IO 触发 + rAF easeOutExpo | 全兼容 | 只写 textContent |
| 6 粒子/星空 | JS canvas（40-60 行）或 CSS 多层渐变背景位移 | 全兼容 | 粒子 ≤150、DPR≤2 |
| 7 序列帧伪 3D | JS 切帧（sprite sheet background-position） | 全兼容 | sheet 宽 ≤4096px |
| 8 卡片阶梯 | CSS：每卡不同 `animation-range` 错峰（scroll-driven 下 delay 不可靠） | `@supports` 外 JS | 每卡独立合成层 ≤10 卡 |
| 9 吸顶导航/视差 | CSS sticky + `view()` 错速 | sticky 全兼容；视差需降级 | `content-visibility:auto` |
| 10 玻璃拟态 | CSS sticky + `backdrop-filter`（Safari 用 -webkit-） | 全兼容 | 只挂一个元素 |

## 四、三页适用性评估

| 模式 | index（暖纸水彩） | QQ（深色霓虹） | 网易云（深夜情绪） |
|---|---|---|---|
| 1 滚动讲故事 | ✅ hero 章节叠化 | ○ | ✅ 黑胶"转台"章节 |
| 2 产品图 scrub | ✅ 手机壳滚动缩小淡出（exit） | ○ banner 缩放 | ✅✅ 黑胶随滚动旋转（entry） |
| 3 视频 scrub | ✗（无视频素材） | ✗ | ✗ |
| 4 标题滚动渐隐 | ✅ 大字报随滚动渐隐（exit） | ○ | ✅ 情绪大字报 |
| 5 count-up | ○ | ✅ 已有 | ✅ 已有 |
| 6 粒子/星空 | ✗（纸感，不适用） | ○ | ✅ 微量星光粒子 |
| 7 序列帧 | ✗ | ✗ | ✗ |
| 8 卡片阶梯 | ✅ 特性卡升级 | ✅ 榜单/歌单阶梯 | ✅ 热评阶梯 |
| 9 吸顶导航 | ○ | ○ | ○ |
| 10 玻璃拟态 | ✅ 已有 | ✅ 已有 | ✅ 已有 |

✅=强烈推荐 ○=可选 ✗=不适用（克制调性/无素材）

## 五、实施路线

- **Phase A ✅（已完成）**：index hero exit-scrub（标题渐隐上移 + 手机壳缩小淡出）；网易云黑胶 entry 转台（rotate 0→360° 独立属性叠加）
- **Phase B**：三页大标题滚动渐隐全页化；QQ count-up 强化（"129 万人"）
- **Phase C**：网易云深夜星光粒子（canvas ≤80 粒子）；index 水波纹滚动视差增强

每阶段统一：
- `@supports (animation-timeline: scroll())` 包裹 CSS 路线 + JS rAF 降级共用"进度→样式"纯函数
- **首屏元素用 exit range（离开时动效），非首屏元素用 entry range（进入时动效）**——view() 语义关键
- 与既有动画叠加用独立属性（rotate/translate 与 transform 不冲突）
- `prefers-reduced-motion` 双保险；只动 transform/opacity

### 已踩坑记录（Phase A 实测，2026-08-01）
1. **多动画列表下 `animation-range` 解析失败**：`animation: rise ..., scrub ...; animation-range: auto, exit 0% exit 100%;`（含 `animation-range-start/end` 拆分）在 Chromium 中 computed 均为 `normal`，导致 scrub 落到 view() 默认 cover 语义的中间帧（初始半透明）。**修复：滚动动画独立到 wrapper 元素**（`.hero-scrub` / `.vinyl-wrap`），单动画 + 单 range，与入场动画完全解耦。
2. 首屏可见元素（黑胶播放卡）用 entry range 时动画在加载瞬间即完成、过程不可感知 → 改用 exit range。
3. IAB 自动化对重动画页面截图面超时（1500ms）——重动画页面验证以 DOM/computedStyle 断言为主，截图仅作参考。

## 六、参考资源

1. WebKit 官方教程：https://webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/
2. Safari 26.0 特性公告：https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
3. Bramus 交互 demo 库：https://scroll-driven-animations.style/
4. MDN 规范：https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll-driven_animations
5. 中文拆解：CSDN《苹果官网动画解析之 airpods 滚动光影效果》《超强的苹果官网滚动文字特效实现》《iPad mini 滚动动画实现原理探究》
