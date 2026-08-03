# Supabase 接入指南（云项目 · 浏览器手动流程）

> 本仓库的 `supabase/migrations/001~004 + seed.sql` 已就绪（含修复版：`replied_at` 列、RLS 收紧、`earn_bond` 频控、幂等种子等）。本指南带你走完「建项目 → 迁移 → 冒烟」全流程，之后即可真实运行核心玩法。
>
> 本地模拟池（无 `.env.local`）功能完整，随时可玩；配好本指南即切换到真实后端。

---

## 0. 你需要准备的

- 一个邮箱（注册 supabase.com，免费计划即可）
- 约 10 分钟

---

## 1. 注册并创建项目

1. 打开 <https://supabase.com> 注册/登录
2. 点击 **New project**：
   - 名称随意（如 `drift-web`）
   - 设置数据库密码（**保存好，勿写进仓库**——数据库密码是特权凭证，只放 `.env.local` / 密码管理器）
   - Region 就近选择
   - 免费计划（Free tier）
3. 记下两样东西（项目首页 / **Settings → API**）：
   - **Project URL**：`https://<project-ref>.supabase.co`
   - **anon public key** / **publishable key**：`eyJ...` 或 `sb_publishable_...` 开头
     > ⚠️ anon/publishable key 是客户端公开密钥，可以放心放 `.env.local`；但**数据库密码、service_role key 是特权凭证，一律不得写入仓库文件**。

## 2. 启用匿名登录（必需，FR-9 身份底座）

`signInAnonymously()` 需要项目开启匿名登录：

**Dashboard → Authentication → Sign In / Providers → Anonymous Sign-Ins → Enable**

> 不开启的话，冒烟测试第 1 步（A 匿名登录）就会失败。

## 3. 配置本地环境

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入第 1 步拿到的两样东西：

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 4. 执行迁移（SQL Editor）

1. 打开项目 Dashboard → **SQL Editor** → New query
2. 按顺序**逐个粘贴执行**本仓库的：
   ```
   supabase/migrations/001_init.sql
   supabase/migrations/002_collection.sql
   supabase/migrations/003_realtime.sql
   supabase/migrations/004_report_events.sql
   supabase/seed.sql
   ```
3. 每个都显示 **Success** 即可

> 💡 建议先跑完冒烟测试（第 5 步）再执行 `seed.sql`：空瓶池时冒烟能完整覆盖「拾瓶→回信→收件箱」黄金链路；`seed.sql` 只是投放 6 艘预热系统瓶（冷启动内容），随时可执行（已幂等）。

## 5. 冒烟验证

```bash
npm run verify:real
```

预期全部 ✅。脚本用**两个匿名用户**跑通：登录 → 船员证 → 投瓶 → 限额 → 拾瓶（原子 claim）→ 回信（验证 `replied_at` 列）→ 收件箱（snake→camel 映射 + RLS）→ 已读 → 昵称 → 羁绊公式与每日去重 → 举报。

- 若出现 `⚠️`（拾到系统瓶，随机所致）：重跑 `seed.sql`（会把预热瓶重置为漂流中）后重试，或直接在空池时重跑
- 失败项会打印具体错误（如 42703 = 列缺失、P0001 = RPC 业务异常）

## 6. 本地开发验证（可选）

```bash
npm run dev   # 打开 http://localhost:3000
```

配置了 `.env.local` 后全站即走真实后端。可双开标签页验证同船弹幕（Realtime broadcast 默认可用）。

## 7.（可选）CLI 自动化（后续再配）

```bash
npm i -D @supabase/cli
npx supabase login                       # 浏览器授权
npx supabase link --project-ref <ref>    # 绑定项目
npx supabase db push                     # 推送迁移
npx supabase db seed                     # 执行种子
npx supabase gen types typescript --project-id <ref> > src/types/database.ts
```

`supabase/config.toml` 已备好基础配置（含匿名登录开关）。

---

## 常见问题

| 现象 | 排查 |
|---|---|
| 冒烟第 1 步「A 匿名登录」失败 | 匿名登录未启用 → 见第 2 步 |
| 投瓶/拾瓶报错 | 迁移未执行或顺序不对 → 重跑第 4 步 |
| 回信报 42703 | 迁移是旧版（缺 `replied_at` 列）→ 用本仓库当前迁移重跑 |
| 弹幕/同船人数不更新 | Realtime broadcast 默认可用；跨标签页需两标签都在播放中 |
| 冒烟重跑出现风控提示 | 匿名登录有速率限制，稍后再试；每次运行会创建 2 个新匿名用户 |

## 数据说明

- 冒烟测试会在开发库产生真实数据（船员证/瓶子/回信/流水），正常现象
- 每个匿名用户「投 1 / 拾 3」按日独立限额（服务端 Asia/Shanghai 时区）
- 预热瓶 72h 过期；重跑 `seed.sql` 会重置为漂流中

## 尚未接入（预留，不影响当前玩法）

周报真实接线（`record_listen`/`get_weekly_report` 前端调用）、跨设备找回 `claim_recovery`、同船在线 presence 真实模式 —— 见 `archive/docs/ARCHITECTURE.md` 预留点。
