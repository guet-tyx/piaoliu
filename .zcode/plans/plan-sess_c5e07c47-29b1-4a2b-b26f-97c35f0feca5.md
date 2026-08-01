# 阶段三：交互式播放器（Store + Hook + UI）

## 0. Git 提交（用户已明确要求）
- `git commit -m "feat: 新增跑马灯与角色卡组件，修复 CSS Modules 动画引用冲突"`

## 1. 修正数据（与原型 JS TRACKS 逐字对齐，已核对 861-866 行）
- `src/data/tracks.ts`：`t` 为纯曲名（UI 渲染时加「」）、`s` 为艺术家行（"一支你没听过的乐队 · 后摇"）、`tag` 修正（晚风告别式→环境电子、雨季漂流记→氛围）、src 顺序对齐原型

## 2. Store 完善 `src/stores/player.ts`
- 新增状态：`currentTime`、`duration`（秒）、`progress`（0-100）、`failed`
- 新增动作：`playTrack(index)`（设 currentIndex + isPlaying=true）、`setProgress(cur, dur)`（内部算 progress）、`setFailed`
- 保留：`toggle()`、`next()/prev()`（模循环）、`toggleLike()`、`toggleDanmaku()`

## 3. Hook `src/hooks/useAudioPlayer.ts`（桥梁层，重点清理逻辑）
- 挂载 effect：客户端 `new Audio()`（preload="none"），绑定 4 个监听——`timeupdate`→setProgress、`ended`→next()、`loadedmetadata`→写时长、`error`→多源降级（源索引 ref+1 换 src，全失败 setFailed(true)）；**cleanup：pause + 移除全部监听 + 置空 ref**（StrictMode 双挂载安全，杜绝泄漏）
- `currentIndex` effect：setProgress(0,0) + 源索引归零 + 设 src；用 `usePlayerStore.getState().isPlaying` 判自动播放（避免闭包过期，切换后保持播放态）
- `isPlaying` effect：`play().catch()`（autoplay 拒绝静默）/ `pause()`
- `trackRef` 每渲染同步，error 监听不闭包过期

## 4. 播放器 UI `src/components/player/PlayerSection.tsx` + `.module.css`（"use client"）
- 结构：`section#player` + section-head（STAR SEA RADIO）+ `.player-wrap`（粉蓝渐变描边）+ `.player`（毛玻璃双列）
- **UI 全只读**：按钮只调 store actions，类名全部由状态派生
- 唱片：isPlaying → `.playing`（16s→7s 加速）；封面随 track 内联 background（封面 + 黑色盘面两层）
- 唱片弹幕：6 条三轨（--dmdur/--dmdelay 行内变量），isPlaying → `.live` 显隐
- EQ：32 柱用**确定性伪随机** --h/--d（避免 SSR 水合不一致），isPlaying → `.live` 激活
- 进度条：i 宽度 = progress%；时间行 mm:ss（duration 未载入时 "--:--"）
- 按钮：⏮/▶(failed 时 !)/❚❚/⏭/♡❤(.liked + heartPop)/弹幕开关（文案切换 + .on）
- 960 单列居中；reduced-motion 模块内禁用 record/eq/dm 动画
- 全局 keyframes 经 `var(--kf-dmFloat / spin / eqb / heartPop)` 引用（沿用已修复的约定）

## 5. 页面组装
- page.tsx：CharacterSection 后挂 `<PlayerSection />`（nav #player 锚点生效）

## 6. 验收
- lint + build 无报错
- 浏览器（IAB）GUI 实测：点击播放 → record.playing 类 + 按钮变 ❚❚ + eq.live；下一首 → 标题/封面/艺术家切换 + 进度归零；弹幕开关文案/类切换；刷新状态重置
- 已知环境限制：IAB 动画时钟冻结 → 黑胶转动/进度走动可能无法在 IAB 内观察到（如实报告，代码层面验证类名与状态）

## 不在本次范围
- LocalStorage 持久化、下载/页脚区块、hero 弹幕带、数字滚动组件