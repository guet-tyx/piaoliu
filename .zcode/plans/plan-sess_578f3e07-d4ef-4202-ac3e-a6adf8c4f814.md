## 第五个页面：漂流 DRIFT · 星轨版（mihoyo-style.html）

米哈游主导风格（上次调研时用户选了 B站主导做第 4 页，这一页补上米哈游主导）：**全页深空电影感**，原神金 + 冰蓝全息点缀，HUD 元素铺满。延续「真实皮肤」定位（非讽刺）。

### 设定（设计判断）
- 与星海版同一位少女「汐」，**平行宇宙设定**：星海版是乘纸船的少女 → 星轨版是星轨列车的旅人，手里仍攥着那艘纸船（跨版本彩蛋）
- 页面命名「星轨版」，文件名 `mihoyo-style.html`，图标 💫
- 差异化：第 4 页有 B站弹幕；**这一页没有弹幕**，改用米哈游式 HUD 语言（六边形网格、四角括号、星轨彗星轨道线、光带扫过）

### 1. 生图（sn-image-base，sensenova-u1-fast，共 5 张）
- `images/mhy-hero.png`（16:9，2k）—— 汐穿星轨旅人服、戴耳机、手攥纸船，站在发光星轨上漂在深空，金/粉蓝星云，角色居右、左侧留深空给文字
- `images/cover-mhy-1~4.png`（1:1，2k）—— 星轨站台 / 银河电台 / 金雨流星 / 冰晶夜 四张深色金蓝系封面
- 脚本 `_gen_mhy.sh`（保留 prompt 便于再生成）

### 2. 新建 `mihoyo-style.html`（单文件零依赖，~1000 行，沿用四页惯例）
**设计令牌（全部来自 HoYoverse 主题包抓取的真实色值）**：
- 背景 `#04071A→#050C1E→#081E2F` 深空渐变；面板 `rgba(255,255,255,.045)` 玻璃拟态 + blur
- 金 `--gold:#C9A063`/亮金 `#D3BC8E`（标题强调、CTA、星级）；冰蓝 `--ice:#7BB1FF`/`#A8E0FF`（HUD 线、链接）；薰衣草 `#B0A9FF`、青 `#00A5E2` 点缀
- 文字 `#F1EDE3` 标题 / `#D6DCE4` 正文 / `#8A93A0` 次要；字距惯例：英文副标 letter-spacing .3em，标题 800 字重

**页面结构**：
1. 顶栏：深色玻璃，金色 logo 标 +「星轨版」徽标，导航 + 金色胶囊「免费下载」
2. hero 深空压轴：星尘粒子 canvas（≤80）+ 六边形网格底纹（SVG pattern）+ 四角括号 HUD + 左下坐标字 + **星轨线**（底部发光轨道 + 彗星光点循环掠过）→ eyebrow「DRIFT × GALAXY」+ 大标题「乘上星轨，漂向银河尽头。」（「银河尽头」金色渐变字）+ 副文案（提到纸船彩蛋）+ 双 CTA（金渐变实心 + 冰蓝描边）+ 下滑指示；exit-scrub（wrapper 单动画 + JS rAF 降级）
3. 跑马灯：深色底金 ✦ 分隔（星轨航线）
4. `section#char` 角色登场：深色玻璃角色卡——稀有度 **★★★★★**（金色）、「汐 SIO · 星轨旅人」、命途/属性标签（属性·风 / 命途·巡猎 / 配音·未知 / 登场·星轨版，HSR 式信息卡）、设定文案（纸船彩蛋）、数据 count-up（播放/收藏/弹幕）
5. `section#playlist` 歌单：深色玻璃卡片 ×4（金→冰蓝渐变绶带角标「推荐/新/热/限定」+ 四角括号装饰 + hover 上浮/封面缩放/播放角标）
6. `section#player` 星轨电台播放器：全息渐变描边卡（金↔冰蓝）+ 光带扫过动画 + 唱片封面随曲目切换（cover-mhy-*）+ 32 条金→冰蓝渐变等化器 + 金渐变进度条 + ⏮▶⏭ + 金色红心 + 4 首 TRACKS（本地 audio 优先 + SoundHelix 多源降级，Audio 单例模式）
7. `section.download`：金渐变大按钮 + 冰蓝描边副按钮 + 深色商店徽标
8. footer：深色，© 2026 + CC credit（Kevin MacLeod CC-BY-4.0 · SoundHelix）
9. `.view-switch` **五页互跳**（本页标 on，图标 💫「漂流 · 星轨版」，深色菜单 + 金色 on 态）
10. 内联脚本 4 个 IIFE：播放器 / 星尘粒子 / count-up + 光标微光 / hero scrub JS 降级

**动画纪律**（沿用 animation-spec.md 全部已踩坑规则）：`@supports (animation-timeline: scroll())` + wrapper 单动画（hero exit-scrub）；首屏 exit range、非首屏 entry range；只动 transform/opacity；prefers-reduced-motion 双重保险。

### 3. 四页 view-switch 同步（各加 1 行）
`index.html` / `qqmusic-style.html` / `wangyiyun-style.html` / `anime-style.html` 的 `.vs-menu` 内追加：
`<a class="vs-item" href="mihoyo-style.html"><span class="vs-ico">💫</span>漂流 · 星轨版</a>`，注释「四页互跳」→「五页互跳」。

### 4. 验证
- node --check 内联 JS；生图尺寸检查（hero 16:9 / covers 1:1，压缩到 1600 宽 / 512²）
- 浏览器 locator/computedStyle 断言：hero-scrub timeline/range、频谱 32 条、view-switch 5 项、on 态唯一（本环境 IAB 点击层对动画页不可用，播放联动以上一轮同样的方式验证，若仍失败则如实说明并请用户实测）