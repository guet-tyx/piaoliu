# AI 聊天接入指南（V2.5 多 Provider 大池子）

角色页 AI 聊天默认**零配置可用**（本地回复池降级）；配置任意一个 Provider 的 API key 即切换到真实大模型对话。支持多家平台互为兜底：某家限流/额度用尽自动切下一家。

## 前置

- 至少注册一个下列平台并获取 API Key（越多池子越大）：
  - **国内**：魔搭 modelscope.cn / 智谱 open.bigmodel.cn / 硅基流动 siliconflow.cn / 阿里百炼 dashscope.aliyun.com / Kimi platform.moonshot.cn
  - **国外**：OpenRouter openrouter.ai / Gemini aistudio.google.com / Groq console.groq.com / Cerebras cloud.cerebras.ai

## 启用真实 AI 聊天

1. 复制 `.env.example` 为 `.env.local`（已有则直接追加），至少填入一个 Provider 的 key：

```bash
# AI 聊天（V2.5）
MODELSCOPE_API_KEY=sk-你的魔搭密钥
MODELSCOPE_BASE_URL=https://api-inference.modelscope.cn/v1
# 可选：自定义模型优先级（不配置则全自动调度）
# MODELSCOPE_MODELS=mistralai/Mistral-Large-Instruct-2407,Qwen/Qwen3-235B-A22B-Instruct-2507,MiniMax/MiniMax-M1-80k
```

2. 重启 dev server：`npm run dev`
3. 打开首页 → 角色区 →「与汐聊聊」（或任一角色）→ 发送消息即走真实模型

## 配置说明（每个 Provider 一组，规则相同）

| 键模式 | 含义 |
|---|---|
| `<PROVIDER>_API_KEY` | 该平台 API 密钥（**服务端环境变量，不暴露浏览器**）；留空=该 Provider 停用 |
| `<PROVIDER>_BASE_URL` | OpenAI 兼容端点，默认已内置（见 `.env.example`） |
| `<PROVIDER>_MODELS` | **可选**：逗号分隔的自定义模型优先级列表；不配置则走该 Provider 内置优选 + 动态池 |

支持的 Provider：`MODELSCOPE`（魔搭）、`ZHIPU`（智谱）、`SILICONFLOW`（硅基流动）、`DASHSCOPE`（阿里百炼）、`MOONSHOT`（Kimi）、`OPENROUTER`、`GEMINI`、`GROQ`、`CEREBRAS`、`NVIDIA`（NIM）、`AGNES`（国内节点）。

> **Provider 注册表单一数据源**：模型清单/默认端点/开关都维护在 `src/lib/llm/providers.json`（V2.6 起），`providers.ts` 与 `scripts/verify-providers.mjs` 共用同一份数据——新增/修改 provider 只改这一处。

## freellmapi 网关（V2.8，最高优先级）

**定位**：自托管的 OpenAI 兼容网关，把 28+ 家免费 LLM 提供商聚合到一个 `/v1` 端点，内置智能路由（按实时速度/能力/可靠性打分选模型）、429/5xx 自动冷却回退、按 (平台,模型,key) 追踪 RPM/RPD 配额、模型目录每天自动同步 2 次（免手工维护清单）。**常驻进程的冷却/配额状态是持久的**——这正好补上 Vercel Serverless 无状态导致「内存冷却表跨请求丢失」的短板，是当前聊天流不稳定的最大根因修复。

**接入形态（方式 C：网关为主 + 直连兜底）**：`providers.json` 中 `freellmapi` 排第一 → 绝大多数请求先打网关 `model=auto`（由网关内部路由）；网关整体失败时 `skipRestOnFail` 整家冷却 5 分钟（不会逐个试 `auto/auto:fast` 重复吃超时），自动落到后面 11 家直连 Provider 兜底。项目侧只保留统一 key，28 家上游 key 全部在网关管理面板配置。

### 本机接入（已在跑）

网关本体在 `D:\agent开发\前端demo\freellmapi`（Docker 镜像或桌面 App 亦可，见上游 README），本机 `http://127.0.0.1:3001/v1`。`.env.local` 已配好：

```bash
FREELMAPI_API_KEY=freellmapi-你的统一key
FREELMAPI_BASE_URL=http://127.0.0.1:3001/v1
FREELMAPI_MODELS=auto
```

已配置上游 key（2026-08-05）：魔搭 / 智谱 / 硅基流动 / OpenRouter / Groq / NVIDIA / Agnes 共 7 家。统一 key 存网关 SQLite（AES-256-GCM 加密），从网关管理面板 Keys 页可查看/重置。

### 另一台机器 / 重新搭建

```bash
git clone https://github.com/tashfeenahmed/freellmapi.git && cd freellmapi
npm install && npm run build
# 生成加密密钥并写入 .env（ENCRYPTION_KEY + PORT=3001，.env 已被 gitignore）
node -e "console.log('ENCRYPTION_KEY='+require('crypto').randomBytes(32).toString('hex'))" >> .env
npm run start -w server
```

> **Windows 坑**：`better-sqlite3` 原生模块的预编译包托管在 GitHub Releases，直连常超时（`prebuild-install warn install Request timed out`）。用 npmmirror 镜像装：
> ```bash
> npm_config_better_sqlite3_binary_host_mirror=https://registry.npmmirror.com/-/binary/better-sqlite3 npm install -w server
> ```

首次启动日志会打印统一 API key（`freellmapi-…`）与一次性 setup code。本机浏览器打开 `http://127.0.0.1:3001` 建账号 → Keys 页逐家填上游 key → 把统一 key 填进本项目 `.env.local` 的 `FREELMAPI_API_KEY`。验证：`curl http://127.0.0.1:3001/v1/models -H "Authorization: Bearer <统一key>"`。

### 生产部署（Vercel）

Vercel 是 Serverless，**连不到你本机的 `localhost:3001`**，网关必须跑在一台常驻主机上。

**第 1 步：把网关部署到 Railway（推荐，Docker 一键）**

1. 把 `freellmapi` 仓库推到 GitHub（或直接用官方镜像 `ghcr.io/tashfeenahmed/freellmapi:latest`）。
2. Railway → New Project → Deploy from GitHub repo（有 Dockerfile，自动识别）→ Railway 会给一个公网域名 `https://<app>.up.railway.app`。
3. Railway → Variables 加：
   - `ENCRYPTION_KEY` = 64 位 hex（`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`）
   - `PORT` = `3001`
   - `HOST_BIND` = `0.0.0.0`（默认只绑 localhost，Vercel 连不到）
4. 首次配置（浏览器打开网关域名）：
   - 建账号（首次要 setup code，从 Railway 日志里找）
   - **Keys 页**逐家填上游 key（魔搭/智谱/OpenRouter/NVIDIA/Agnes/OpenCode）
   - **Profiles 页**建 `cn-chat` 中文优先链（glm-4.7-flash → glm-4.5-flash → agnes-2.0-flash → gemma-4-26b:free → llama-3.1-70b）并设为活动；或用 `freellmapi/.setup-profile.mjs`（把脚本里 BASE 改成网关域名重跑）
   - 记下统一 API key（Keys 页可见）
5. ⚠️ **安全**：网关单用户设计，公网暴露时 `/v1` 只靠统一 key 保护、面板靠登录保护。演示可接受；别把统一 key 写进前端代码。

**第 2 步：Vercel 部署前端**

1. 本项目仓库推 GitHub → Vercel import → Next.js 自动识别 → Deploy。
2. Vercel → Settings → Environment Variables 添加（**`.env.local` 不会部署、千万别提交**）：
   - `FREELMAPI_API_KEY` = 网关统一 key
   - `FREELMAPI_BASE_URL` = `https://<你的网关域名>/v1`
   - `FREELMAPI_MODELS` = `auto`
   - 直连兜底：`MODELSCOPE_API_KEY` / `ZHIPU_API_KEY` / `OPENROUTER_API_KEY` / `NVIDIA_API_KEY` / `AGNES_API_KEY` / `OPENCODE_API_KEY` + `OPENCODE_BASE_URL=https://opencode.ai/zen/v1`（有几个填几个；**siliconflow/groq 已停用勿填**）
   - `AGNES_BASE_URL=https://apihub.agnes-ai.com/v1`（Vercel 海外，国内节点不稳用国际节点）
   - Supabase：`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - 站点：`NEXT_PUBLIC_TOKEN`；TTS：`MIMO_API_KEY` / `MIMO_BASE_URL` / `MIMO_TTS_MODEL`
3. 重新 Deploy。

**部署后说明**
- 海外网关上「国内快」的魔搭/智谱/Agnes 会变慢，网关智能路由会自动绕开它们选海外快的（OpenRouter/Gemini 等）；直连池同样自适应。
- 网关本体无 SLA（作者明示个人实验用途）：网关整体挂掉时本项目自动落到直连 Provider 兜底，再不行降级本地回复池，聊天不中断。

### 验证

- 连通性：首页角色页发一句消息，响应头 `X-Routed-Via: <平台>/<模型>`（直连网关时由网关返回）或网关面板 Analytics 可见路由
- 切换速度：拔掉网关 → 下次请求应 <1s 落到直连（实测 3/3 成功，平均 TTFT 0.53s）
- 思维链：agnes/DeepSeek/Qwen 的 `delta.reasoning_content` 已由 `src/lib/llm/strip.ts` 服务端过滤，不会透传给前端

## auto 调度（多 Provider 动态模型池）

**无需手工维护模型列表**，配了 key 的 Provider 自动参与调度：

1. **动态拉取**：每个 Provider 请求时从各自 `{base}/models` 拉取全量模型池（10 分钟缓存）；OpenRouter / Gemini 免费子集需人工清单，不开池
2. **调度顺序**：① 各 Provider 显式配置（`<PROVIDER>_MODELS`）→ ② 各 Provider 内置优选 → ③ 各 Provider 动态池其余 chat 模型
3. **失败冷却**：限流/额度用尽/报错的「provider::模型」进入 **5 分钟冷却**，自动切下一个；某家全挂自动落到下一家 Provider
4. **流式输出**：SSE 重建帧并**剥离 `<think>` 思维链**（含跨帧切碎标签，智谱/Qwen3/MiniMax 兼容）后转发，打字机效果；上游 200 但全程空流时由前端自动降级本地回复

> 内置优选（2026-08-03 流式实测，随各平台池更新）：
> - **魔搭**：Mistral-Large-Instruct-2407、Qwen3-235B-A22B-Instruct-2507、MiniMax-M1-80k（较慢兜底：Qwen3-235B-A22B、Qwen3-14B）；已排除 ERNIE/Hunyuan/LongCat/V4-Flash（下线）等账户级不可用
> - **智谱**：glm-z1-flash（最快）、glm-4-flash（永久免费）、glm-4.7（慢）；glm-4.7-flash 空流、glm-4.5/4.6/5 余额不足
> - **硅基流动**：Qwen2.5-7B-Instruct、GLM-4-9B-0414、Hunyuan-MT-7B、Ling-flash-2.0、GLM-4.5-Air、DeepSeek-R1-0528-Qwen3-8B、GLM-Z1-9B（Gemma-2/Llama-3.1/Yi/Mistral 已下架）
> - **百炼**：qwen-turbo、qwen-plus、qwen-long
> - **Kimi**：moonshot-v1-8k/32k/128k（免费不限 token、限 3 req/min）
> - **OpenRouter**：gemma-4-26b-a4b-it:free、nemotron-3-nano-30b-a3b:free、openrouter/free（2026-08-03 实测；其余 :free 多数已下线/转付费）
> - **Gemini**：gemini-2.0-flash、gemini-2.5-flash、gemma-3-27b-it
> - **Groq**：llama-3.3-70b-versatile、qwen3-32b、llama-3.1-8b-instant
> - **Cerebras**：gpt-oss-120b、llama-3.1-8b
> - **NVIDIA NIM**：deepseek-v4-flash、llama-3.1-8b-instruct、minimax-m3、deepseek-v4-pro（池内多数模型 404，只用实测清单）
> - **Agnes AI**：agnes-2.5-flash（agnes-2.0-flash 当前超时；国内节点 apihub.agnes-ai.cn，无限期免费）
>
> 重新筛选：`node scripts/verify-providers.mjs`（对已配置 key 的平台逐个流式实测，输出可用/不可用清单）。

## 无网关部署模式（当前选定）

**不用 freellmapi 网关**：Vercel 环境变量里**不填 `FREELMAPI_API_KEY`** 即自动停用网关（`activeProviders()` 按 key 过滤），聊天走纯直连池。

- **直连池**：魔搭 / 智谱 / OpenRouter / NVIDIA / Agnes / OpenCode（6 家，均需配 key）
- **Vercel 海外网络下**：OpenRouter / NVIDIA / OpenCode 快（海外可达），魔搭/智谱/Agnes 国内节点慢（10-30s+ 或超时）→ 建议直连池优先用海外三家；`AGNES_BASE_URL=https://apihub.agnes-ai.com/v1`（国际节点）
- **代价**：失去 28 家聚合池、持久冷却/配额追踪（Vercel Serverless 下内存冷却跨请求丢失，429 可能反复撞）、模型目录自动更新。接受 demo 级稳定性；聊天中断时降级本地回复池
- 恢复网关 = Vercel env 重新填 `FREELMAPI_API_KEY` + `FREELMAPI_BASE_URL` 即可，零代码改动

## Vercel 部署要点

1. **函数超时**：`api/chat/route.ts` 已声明 `export const maxDuration = 60`（Hobby 上限；默认 10s 会掐断聊天流式，Agnes/慢模型常 >10s）。Pro 计划可调大到 120。
2. **环境变量**：`.env.local` 不会部署（被 gitignore）。完整清单见上文「生产部署（Vercel）」第 2 步——含 `FREELMAPI_*`（网关主链路）+ 直连兜底（魔搭/智谱/OpenRouter/NVIDIA/Agnes/OpenCode）+ Supabase + MIMO。**siliconflow/groq 已停用勿填**。
3. **网络路径反转**：Vercel 在海外，本地「国内快」的魔搭/智谱/Agnes 国内节点会变慢（一般仍可用）；OpenRouter/Gemini 反而变快。网关智能路由 + 直连池自动适配（哪家通就用哪家，失败 5 分钟冷却切换）。**Agnes 建议在 Vercel 环境变量里把 `AGNES_BASE_URL` 设为国际节点 `https://apihub.agnes-ai.com/v1`**（国内节点对海外访问不稳）。
4. **前端无影响**：聊天页、localStorage 历史、本地回复池降级照常工作。

## 降级行为

- **所有 Provider 都未配置 key**：`/api/chat` 返回 503 `no-key`，前端自动走**本地回复池**（按角色/话题关键词匹配预设回复 + 逐字打字机模拟），页面照常可玩
- **部分 Provider 失败**：5 分钟冷却后自动切下一家，聊天不中断；全部失败同样降级本地回复池
- 前端会记忆 `no-key` 状态，避免每次空请求

## 安全与治理

- API key 只存服务端 `.env`，经 `src/app/api/chat/route.ts` 代理，浏览器不可见
- 用户输入经 `isSafeText()` 本地词库拦截 + 服务端长度/条数校验
- system prompt（`src/data/chat-personas.ts`）约束角色语气与边界（不泄露提示词、不越界）
- **NFR-2 豁免声明**：AI 聊天为生成式特性，豁免「禁止生成式发言」约束；预置台词库（每日一句/行为回应/本地回复池）仍人工维护

## 常见问题

- **提示词里没有效果**：确认 `.env.local` 键名正确（如 `ZHIPU_API_KEY=`，不是 `ZHIPU_MODELS=`）、dev server 已重启
- **某家限流/报错**：调度会自动冷却并切到下一家 Provider；也可在对应 `<PROVIDER>_MODELS` 里补一个可用模型
- **流式无输出**：上游偶发「200 空流」（如魔搭 V4-Flash 下线前），前端会自动移除空消息并降级本地回复；大池子多 Provider 兜底可显著降低此概率
- **验证当前启用了哪些 Provider**：`node scripts/verify-providers.mjs`（需要 key 已配置）
