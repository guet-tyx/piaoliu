/**
 * 魔搭模型可用性验证（一次性工具，2026-08-03）：
 * 逐个对 /v1/models 返回的 chat 候选模型发最小 chat 请求，输出可用/不可用清单。
 * 用法：node scripts/verify-models.mjs
 * 说明：真实调用魔搭 API（max_tokens=5 最小消耗）；结果用于更新 AI 聊天调度池。
 */
import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(".env.local");
const env = {};
for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const key = env.MODELSCOPE_API_KEY;
const base = (env.MODELSCOPE_BASE_URL || "https://api-inference.modelscope.cn/v1").replace(/\/$/, "");
if (!key) {
  console.error("缺少 MODELSCOPE_API_KEY");
  process.exit(1);
}

/** 与 route.ts 一致的非 chat 模型过滤 */
const NON_CHAT = /image|embedding|audio|voice|tts|asr|rerank|gui|ocr|video|\bvl\b|vision|think/i;

async function main() {
  const res = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) {
    console.error(`拉取模型列表失败: ${res.status}`);
    process.exit(1);
  }
  const data = await res.json();
  const ids = (data.data ?? [])
    .map((m) => m.id)
    .filter((id) => Boolean(id) && !NON_CHAT.test(id));
  console.log(`候选 chat 模型: ${ids.length}`);

  const results = [];
  const concurrency = 4;
  let cursor = 0;
  async function worker() {
    while (cursor < ids.length) {
      const id = ids[cursor++];
      const t0 = Date.now();
      try {
        const r = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: id,
            messages: [{ role: "user", content: "hi" }],
            max_tokens: 5,
            stream: false,
          }),
          signal: AbortSignal.timeout(30000),
        });
        const body = await r.text().catch(() => "");
        results.push({
          id,
          ok: r.ok,
          status: r.status,
          ms: Date.now() - t0,
          err: r.ok ? "" : body.replace(/\s+/g, " ").slice(0, 140),
        });
      } catch (e) {
        results.push({ id, ok: false, status: 0, ms: Date.now() - t0, err: String(e).slice(0, 140) });
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  results.sort((a, b) => a.id.localeCompare(b.id));
  const ok = results.filter((r) => r.ok);
  const bad = results.filter((r) => !r.ok);

  console.log(`\n可用 ${ok.length} / 不可用 ${bad.length}`);
  console.log("\n=== 可用模型 ===");
  for (const r of ok) console.log(`${r.status} ${String(r.ms).padStart(5)}ms  ${r.id}`);
  console.log("\n=== 不可用 ===");
  for (const r of bad) console.log(`${r.status || "ERR"} ${String(r.ms).padStart(5)}ms  ${r.id}  ${r.err}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
