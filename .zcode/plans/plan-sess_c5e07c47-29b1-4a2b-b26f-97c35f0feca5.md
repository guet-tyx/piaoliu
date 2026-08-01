# 阶段四：歌单交互 + 下载/页脚收尾

## 0. Git 提交（用户已明确要求）
- `git commit -m "feat: 实现播放器状态中枢与 useAudioPlayer，迁移星海电台区块"`

## 1. 数据 `src/data/playlists.ts`
- `Playlist` 接口：`name / cover / alt / ribbon?（{label, gold?}）/ meta（{plays, dms, time}）`
- 4 个歌单卡（与原型 708-751 行逐字对齐）：深夜电台·第1001夜（推荐）、城市漫游BGM·晚霞限定（新/gold）、雨天漂流·纸船不打烊、失眠者之海·给睡不着的你（热）

## 2. `src/components/playlist/`（"use client"，带交互）
- 结构：`section#playlist` + section-head（PLAYLISTS）+ `.p-grid` 4 卡
- 卡片：`tabIndex=0 role="button"`，**点击 → `playTrack(index)` + `getElementById('player').scrollIntoView({ behavior: 'smooth' })`**；键盘 Enter/Space 同效（无障碍）
- 卡片结构：`.p-cover`（ribbon 斜切绶带 + next/image fill + hover 浮现 ▶ 角标）+ `.p-name` + `.p-meta`
- CSS 完整移植（284-319 行）：hover 上浮/封面放大/播放角标浮现；`revealUp` 滚动揭示；960px 2 列、420px 1 列
- 歌单 1-4 对应曲目 1-4（视觉关联，原型同规则）

## 3. `src/components/download/DownloadSection.tsx` + module css（静态）
- `section#download` 居中 section-head（DOWNLOAD）+ `.store-row` 双 store-btn（**App Store / Android SVG 原样移植**）+ `.dl-note`
- CSS 移植（428-448 行）：hover 粉色描边浮起

## 4. `src/components/layout/Footer.tsx` + module css（静态）
- `footer`：`.foot-inner`（小号 brand-mark SVG + foot-name + foot-slogan）+ `.foot-links`（B站/小红书/关于）+ `.foot-copy`（© 2026 · 音乐版权 credit · 免费下载）
- CSS 移植（450-465 行）

## 5. 页面最终组装 `src/app/page.tsx`
- `Topbar → Hero → MarqueeSection → CharacterSection → PlaylistSection → PlayerSection → DownloadSection → Footer`
- 仅 PlaylistSection 为 client 组件（其余保持静态 SSR）

## 6. 验收
- lint + build 无报错
- 浏览器 GUI：点击歌单卡 → 页面平滑滚动到播放器 + 对应曲目开始播放（标题/kicker 变化 + record.playing）；滚动底部 Footer 正常渲染
- Console 报错：IAB 无 console 采集能力则如实说明，以页面无错误覆盖层/空白 + dev server 日志无报错为证据

## 备注
- `.section-head`（tag-dot/h2/sec-sub）样式已复制 4 份（角色/播放器/歌单/下载）——建议下阶段提取共享 `SectionHead` 组件（本次按指令保持逐组件移植）
- hero 弹幕带、数字滚动、LocalStorage 持久化仍留待后续