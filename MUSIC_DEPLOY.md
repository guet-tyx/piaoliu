# 曲库部署指南（对象存储 CDN 方案 A）

`public/music/` 的 50 首 Kevin MacLeod（CC BY 4.0）音频共 **323MB**，被 `.gitignore` 排除
（GitHub 单文件上限 100MB，也不适合把 300MB 二进制塞进仓库）。因此这些曲目**不会随 Vercel 部署**——
上线前必须先把音频上传到公开读的对象存储，让前端走 CDN 播放。

本方案对任意 **S3 兼容**存储通用：阿里云 OSS / 腾讯云 COS / Cloudflare R2 / Backblaze B2 / AWS S3。

## 原理

- `src/data/tracks.ts` 由 `scripts/gen-tracks.mjs` 生成，曲目 `src` 是一个**多源数组**（播放失败自动切下一个）。
- 设 `MUSIC_BASE_URL` 重新生成后：`src[0]` = CDN 地址（线上播放），`src[1]` = `/music/xxx.mp3`（本地开发兜底）。
- 生成的 URL 已烘焙进 `tracks.ts` 并提交，**Vercel 无需配置任何曲库环境变量**。

## 三步走

### 1. 开通对象存储 + 建桶

任选一家（都有免费额度）：
- **阿里云 OSS**：控制台建 bucket → 权限设为「公共读」；Endpoint 如 `https://oss-cn-hangzhou.aliyuncs.com`；Region `oss-cn-hangzhou`
- **腾讯云 COS**：建桶 → 权限「公有读私有写」；Endpoint 如 `https://cos.ap-guangzhou.myqcloud.com`；Region `ap-guangzhou`
- **Cloudflare R2**：建桶 → 绑自定义域名（R2 默认域名不可公开读）；Endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`；Region `auto`
- **Backblaze B2**：建桶 → 公开读；Endpoint `https://s3.us-west-004.backblazeb2.com`；Region `auto`
- **AWS S3**：建桶 → Block Public Access 关闭；Endpoint 留空用默认；Region 如 `ap-northeast-1`

创建 Access Key（AK/SK）。

### 2. 上传曲库

在 `.env.local`（或终端）配置后运行：

```bash
MUSIC_S3_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com \
MUSIC_S3_REGION=oss-cn-hangzhou \
MUSIC_S3_ACCESS_KEY_ID=你的AK \
MUSIC_S3_SECRET_ACCESS_KEY=你的SK \
MUSIC_S3_BUCKET=你的桶名 \
node scripts/upload-music.mjs
```

脚本会上传 `public/music/*.mp3` + `CREDITS.md`（署名信息，满足 CC BY 4.0），
并在结尾打印应填的 `MUSIC_BASE_URL` 建议值。

可选变量：`MUSIC_S3_PREFIX`（默认 `music`，换源时改前缀可强制浏览器拉新）、
`MUSIC_S3_PUBLIC_BASE`（公开访问前缀，如 `https://cdn.example.com/music`）、
`MUSIC_S3_FORCE_PATH_STYLE`（部分兼容服务需要 `true`）。

> 上传前先在浏览器访问一个对象的 URL 确认可公开读取。

### 3. 重新生成曲目表并部署

```bash
MUSIC_BASE_URL=https://<你的公开前缀> node scripts/gen-tracks.mjs
git add src/data/tracks.ts && git commit -m "chore: 曲库切换 CDN"
git push origin main
```

Vercel 自动重新部署后，50 首曲目即可从 CDN 播放。

## Vercel 环境变量补充

与曲库无关，但部署时别忘了（见 `AI_CHAT_SETUP.md` / `SUPABASE_SETUP.md`）：
- Supabase：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`
- AI 聊天：至少一个 `<PROVIDER>_API_KEY`（`MODELSCOPE`/`ZHIPU`/`SILICONFLOW`/…）
- TTS：`MIMO_API_KEY`
- `NEXT_PUBLIC_*` 需在**首次构建前**配置并重新部署

## 为什么不用 Git LFS

GitHub LFS 免费额度（1GB 存储 + 1GB 带宽/月）装得下 323MB，但 **Vercel 不支持 LFS 检出**——
构建时拿到的是指针文件而非内容，除非在构建环境手动 `git lfs pull`（吃 LFS 带宽）。对 Vercel 部署不友好，故不采用。
