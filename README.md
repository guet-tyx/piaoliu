# 漂流 DRIFT · 星海版

> 二次元音乐电台网站——不只是听歌，更是一场星海漂流。

**DRIFT** 是一个融合了**音乐电台**、**AI 角色聊天**、**语音合成**、**漂流瓶社交**和**船员成长系统**的全功能 Web 应用。四位星海守望者（汐·流明·朔空·悠）陪你听歌、聊天、共同漂流。

在线体验：[https://www.tyx66612.xin](https://www.tyx66612.xin)

---

## 功能亮点

### 🎵 多频道电台

- 五大频道切换：深夜 / 日系 / 学习 / 雨天 / 私人 FM
- 曲库 52 首（CC BY 4.0 授权音乐），AI 生图封面
- 播放模式：单曲循环 / 列表循环 / 随机播放
- 收藏曲目 & 歌单、UGC 自建歌单
- 定时关闭（15/30/60 分 / 曲目结束 / 自定义）
- 弹幕系统（频道隔离、同船在线计数）

### 🤖 AI 角色聊天

- 四位角色各具人格（System Prompt + 角色传记），回复风格完全不同
- 多 Provider 大池子（魔搭 / 智谱 / 硅基流动 / 阿里百炼 / Kimi / OpenRouter / Gemini / Groq / Cerebras），自动 fallback + 失败冷却
- SSE 流式打字机，时刻感知
- 对话自动摘要（长对话不失忆）、情感状态机（角色情绪随对话变化）
- 主动反问（AI 不再被动回答）、动态温度（情绪影响回复风格）
- 无 key 时自动降级本地回复池，页面照常可用

### 🎤 角色语音合成（TTS）

- 每位角色拥有**自定义音色**（音色复刻 pipeline：voicedesign 设计 → voiceclone 稳定克隆）
- 聊天消息一键「🔊 朗读」，浏览器缓存 24h 加速
- 无 MiMo key 时降级浏览器 Web Speech API（pitch/rate 微调）

### 🧭 星海漂流瓶

- 匿名投瓶（绑定当前歌曲）、随机拾瓶（卡牌开箱）
- 回信靠岸、星海来讯
- 瓶面卡分享图、每日投瓶限额

### 🌊 船员成长系统

- 独立船员证页 `/sailor`（代号 / 等级 / 羁绊进度 / 徽章）
- 每日航行统计、周报 `/report`（本周航行小结 + 热门航线 + 收听星图）
- 跨设备找回码

### 🎨 沉浸式 UI

- 深海暗色主题 + 半透明玻璃卡片 + 星海粒子背景
- 米哈游风格滚动动画（`Reveal` 组件 + 视差 + 文字扫金）
- 4 角色专属配色体系（汐紫粉 / 流明蓝白 / 朔空金蓝 / 悠紫暗）
- 全屏 `/chat/[roleId]` 沉浸聊天页
- 响应式断点（960 / 560 / 420px），移动端适配

---

## 技术栈

| 层 | 技术 |
|--|------|
| 框架 | **Next.js 16**（App Router）+ **TypeScript** |
| 样式 | **CSS Modules** + 全局变量（`globals.css`） |
| 状态 | **Zustand** |
| BaaS | **Supabase**（已接入真实云后端，未配置 env 时自动降级本地模拟） |
| AI 聊天 | 多 Provider 池（9 家 LLM API，OpenAI 兼容），服务端代理 |
| TTS | **小米 MiMo**（mimo-v2.5-tts-voiceclone 音色复刻） |
| 部署 | **Vercel**（Hobby，maxDuration=60） |
| 音乐 CDN | **腾讯云 COS**（S3 兼容，备选 OSS / R2 / B2） |
| 测试 | **Vitest**（336+ 项单元测试，纯逻辑 node 环境） |

---

## 快速开始

```bash
git clone https://github.com/guet-tyx/piaoliu.git
cd piaoliu
npm install
cp .env.example .env.local   # 填入所需 key
npm run dev                   # http://localhost:3000
```

### 最小配置（无任何 key 也能跑）

未配置任何 key 时，项目自动降级：
- AI 聊天 → 本地回复池（`localReply`）
- TTS → 浏览器 Web Speech API
- 漂流瓶 / 周报 / 船员证 → 本地 localStorage 模拟

### 要获得完整体验，需配置

| 功能 | 环境变量 | 获取方式 |
|------|---------|---------|
| AI 聊天 | `MODELSCOPE_API_KEY` 等 9 家任选其一 | 各平台免费注册 |
| TTS | `MIMO_API_KEY` | 小米 MiMo 开放平台（限时免费） |
| 音乐 CDN | `MUSIC_S3_*` | 腾讯云 COS / 阿里云 OSS / Cloudflare R2 |
| 真实后端 | `NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY` | Supabase 新建项目 |

详细配置说明见：
- [AI 聊天接入](./AI_CHAT_SETUP.md)
- [Supabase 后端](./SUPABASE_SETUP.md)
- [音乐 CDN 部署](./MUSIC_DEPLOY.md)

---

## 目录结构

```
src/
├── app/                    # App Router 页面
│   ├── layout.tsx          # 根布局（星海背景 + 粒子 + Topbar/Footer）
│   ├── page.tsx            # 首页
│   ├── chat/[roleId]/      # 聊天页（动态路由）
│   ├── sailor/             # 船员证
│   ├── report/             # 周报
│   └── playlist/           # 歌单广场 + 详情
├── components/             # UI 组件（"use client" 交互组件）
├── data/                   # 静态数据（曲目/歌单/角色/Persona）
├── hooks/                  # 浏览器 API 封装
├── lib/                    # 纯逻辑（LLM 调度 / TTS / 持久化 / 工具）
├── stores/                 # Zustand 状态管理
└── types/                  # 共享类型
public/
├── images/                 # 封面/立绘/贴纸资源
├── music/                  # 本地音乐（兜底）
└── voices/                 # 角色音色复刻参考文件
scripts/                    # 工具脚本
├── clone-voices.mjs        # 音色克隆（自定义声线接入）
├── gen-voice-refs.mjs      # 参考声线生成（voicedesign → 冻结）
├── gen-tracks.mjs          # 曲目数据生成
├── upload-music.mjs        # 音乐上传 CDN
└── verify-providers.mjs    # 多 Provider 流式实测
```

---

## 音色复刻（自定义角色声线）

项目使用小米 MiMo 两段式音色复刻 pipeline：

1. **设计声线**（一次性）：`scripts/gen-voice-refs.mjs` 用 voicedesign 从文本描述生成参考声线
2. **稳定克隆**（运行时）：TTS 路由读参考文件 → `mimo-v2.5-tts-voiceclone` 复刻

如需更换角色声线，清洗干净片段后：
```bash
cp my-clip.wav public/voices/sio.wav   # 替换汐的声线参考
git add public/voices/sio.wav && git commit -m "chore: 更新汐声线"
```

> 当前四个角色的声线参考文件在 `public/voices/` 下，均为自定义克隆音色。

---

## 开发命令

```bash
npm run dev          # 开发服务器 :3000
npm run build        # 生产构建
npm run start        # 运行生产构建
npm test             # 全量单元测试（336+ 项）
npm run typecheck    # TypeScript 类型检查
npm run lint         # ESLint
```

---

## 部署到 Vercel

1. 关联 GitHub 仓库 → Vercel 自动部署
2. 在 Vercel 控制台添加所有环境变量（`.env.local` 中的 key）
3. 注意 `maxDuration=60`（Hobby 上限 60s，防止长 TTS 超时）
4. `NEXT_PUBLIC_*` 变量在构建时固定，修改后需重新部署

---

## 音乐版权

- 曲库 52 首：Kevin MacLeod（incompetech.com）CC BY 4.0 · SoundHelix
- 封面图：AI 生成（SenseNova）
- 角色「汐」「流明」「朔空」「悠」为虚构形象

---

## 版本信息

| 阶段 | 内容 |
|------|------|
| V1.0 | 播放器、弹幕、收藏、歌单（基础体验） |
| V1.1 | 漂流瓶、汐每日一句（社交雏形） |
| V1.2 | 船员证、羁绊、徽章、找回码（身份系统） |
| V1.3 | 同船在线、弹幕频道隔离（实时协同） |
| V2.0 | 周报、节日活动（数据沉淀） |
| V2.1 | 真实 Supabase 后端接通（33 项冒烟全绿） |
| V2.2 | 角色区精简、4 角色每日一句（角色差异化） |
| V2.3 | AI 角色聊天（单模型） |
| V2.4 | 全屏聊天页重构 |
| V2.5 | 多 Provider LLM 大池子（9 家） |
| V2.6 | API 层重构 + 单元测试 |
| V2.7 | 曲库 52 首、多频道电台、歌单广场 |
| V2.8 | 收藏闭环、UGC 歌单、私人 FM、定时关闭 |
| V2.9 | 虚拟主持人、AI 推歌、弹幕隔离、歌单分享 |
| V3.0 | 角色传记 Prompt、情感状态机、主动话题、动态温度（人机感改造） |
| V3.1 | TTS 音色复刻 pipeline（voicedesign + voiceclone + 自定义声线） |