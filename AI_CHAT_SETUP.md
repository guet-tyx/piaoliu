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

## Vercel 部署要点

1. **函数超时**：`api/chat/route.ts` 已声明 `export const maxDuration = 60`（Hobby 上限；默认 10s 会掐断聊天流式，Agnes/硅基慢模型常 >10s）。Pro 计划可调大到 120。
2. **环境变量**：`.env.local` 不会部署（被 gitignore）。需在 Vercel → Settings → Environment Variables 逐个添加 `MODELSCOPE_API_KEY` / `ZHIPU_API_KEY` / `SILICONFLOW_API_KEY` / `OPENROUTER_API_KEY` / `NVIDIA_API_KEY` / `AGNES_API_KEY` / `GROQ_API_KEY` 等（有几个填几个）。
3. **网络路径反转**：Vercel 在海外，本地「国内快」的魔搭/智谱/硅基/Agnes 国内节点会变慢（一般仍可用）；OpenRouter/Groq/Gemini 反而变快。大池子自动适配（哪家通就用哪家，失败 5 分钟冷却切换）。**Agnes 建议在 Vercel 环境变量里把 `AGNES_BASE_URL` 设为国际节点 `https://apihub.agnes-ai.com/v1`**（国内节点对海外访问不稳）。
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
