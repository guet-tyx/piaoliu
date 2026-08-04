/**
 * 曲库上传到对象存储（S3 兼容：阿里云 OSS / 腾讯云 COS / Cloudflare R2 / Backblaze B2 / AWS S3）
 *
 * 背景：public/music/ 的 50 首 Kevin MacLeod（CC BY 4.0）音频共 323MB，被 .gitignore 排除
 * （不入库、不随 Vercel 部署）。部署到线上前，先上传到公开读的对象存储，再把 CDN 前缀
 * 交给 gen-tracks.mjs（MUSIC_BASE_URL）生成远程 src。
 *
 * 环境变量（写入 .env.local 或直接在终端 export）：
 *   MUSIC_S3_ENDPOINT         必填，S3 兼容端点
 *                             阿里云：https://oss-cn-hangzhou.aliyuncs.com
 *                             腾讯云：https://cos.ap-guangzhou.myqcloud.com
 *                             R2：   https://<ACCOUNT_ID>.r2.cloudflarestorage.com
 *                             B2：   https://s3.us-west-004.backblazeb2.com
 *   MUSIC_S3_REGION           区域（阿里云=oss-cn-hangzhou；R2/B2=auto；其余按需）
 *   MUSIC_S3_ACCESS_KEY_ID    访问密钥 AK
 *   MUSIC_S3_SECRET_ACCESS_KEY 访问密钥 SK
 *   MUSIC_S3_BUCKET           桶名（需允许公开读，或绑自定义域名）
 *   MUSIC_S3_PREFIX           上传前缀，默认 music
 *   MUSIC_S3_PUBLIC_BASE      （可选）公开访问前缀，如 https://cdn.example.com/music
 *                             或 https://<bucket>.oss-cn-hangzhou.aliyuncs.com/music
 *   MUSIC_S3_FORCE_PATH_STYLE （可选）true=路径风格端点（部分兼容服务需要）
 *
 * 用法：node scripts/upload-music.mjs
 * 输出：public/music/*.mp3 + CREDITS.md 全部上传，打印可用的 MUSIC_BASE_URL。
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MUSIC_DIR = join(ROOT, "public", "music");

const env = (k) => process.env[k] ?? "";
const endpoint = env("MUSIC_S3_ENDPOINT");
const region = env("MUSIC_S3_REGION") || "auto";
const accessKeyId = env("MUSIC_S3_ACCESS_KEY_ID");
const secretAccessKey = env("MUSIC_S3_SECRET_ACCESS_KEY");
const bucket = env("MUSIC_S3_BUCKET");
const prefix = (env("MUSIC_S3_PREFIX") || "music").replace(/^\/+|\/+$/g, "");
const publicBase = env("MUSIC_S3_PUBLIC_BASE").replace(/\/+$/, "");
const forcePathStyle = env("MUSIC_S3_FORCE_PATH_STYLE") === "true";

const missing = [];
if (!endpoint) missing.push("MUSIC_S3_ENDPOINT");
if (!accessKeyId) missing.push("MUSIC_S3_ACCESS_KEY_ID");
if (!secretAccessKey) missing.push("MUSIC_S3_SECRET_ACCESS_KEY");
if (!bucket) missing.push("MUSIC_S3_BUCKET");
if (missing.length > 0) {
  console.error(`❌ 缺少环境变量：${missing.join(", ")}\n用法见文件头注释。`);
  process.exit(1);
}

const files = readdirSync(MUSIC_DIR)
  .filter((f) => f.endsWith(".mp3") || f === "CREDITS.md")
  .sort();

if (files.length === 0) {
  console.error(`❌ ${MUSIC_DIR} 下没有音频文件（曲库被 gitignore，需先从本地恢复）。`);
  process.exit(1);
}

console.log(`↗ 开始上传 ${files.length} 个文件 → ${endpoint}/${bucket}/${prefix}`);
const client = new S3Client({
  endpoint,
  region,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle,
});

let ok = 0;
let failed = 0;
for (const f of files) {
  const key = `${prefix}/${f}`;
  try {
    const body = readFileSync(join(MUSIC_DIR, f));
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: f.endsWith(".mp3") ? "audio/mpeg" : "text/markdown; charset=utf-8",
        // 曲库内容不变，长缓存；换源时改 MUSIC_S3_PREFIX（版本化）强制拉新
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    console.log(`  ↑ ${key} (${(body.length / 1024 / 1024).toFixed(1)}MB)`);
    ok += 1;
  } catch (e) {
    console.error(`  ✗ ${key}: ${String(e)}`);
    failed += 1;
  }
}

console.log(`\n${failed > 0 ? `⚠ 完成：${ok} 成功 / ${failed} 失败` : `✅ 全部 ${ok} 个文件上传成功`}`);

if (failed > 0) process.exit(1);

// 输出 MUSIC_BASE_URL 建议值：优先 MUSIC_S3_PUBLIC_BASE，否则给出桶公共地址的常见形态
const base = publicBase || `https://${bucket}.${endpoint.replace(/^https?:\/\//, "")}/${prefix}`;
console.log(`
下一步：
1. 确认桶已公开读（或已绑自定义域名，可访问 ${base}/ 下的文件）
2. 设置 MUSIC_BASE_URL 并重新生成曲目表：
   MUSIC_BASE_URL=${base} node scripts/gen-tracks.mjs
3. 提交重新生成的 src/data/tracks.ts，Vercel 部署即播放 CDN 音频
   （CC BY 4.0 署名已随 CREDITS.md 上传，也可在页面底部保留署名入口）`);
