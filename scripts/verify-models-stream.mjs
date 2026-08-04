/**
 * 魔搭模型【流式】可用性验证（2026-08-03 对话稳定性复查）：
 * 对候选 chat 模型逐个发 stream:true 最小请求，判定能否真正流式吐出内容（与聊天一致）。
 * 分类：ok（收到 content delta）/ empty（200 但无内容）/ 429（限流或额度）/ 400（no provider）/ 其他。
 * 用法：node scripts/verify-models-stream.mjs
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

/** 读 SSE 流直到收到首个 content delta，返回 { gotContent, ttftMs } */
async function streamProbe(id) {
  const t0 = Date.now();
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: id,
      messages: [{ role: "user", content: "说一个字" }],
      max_tokens: 20,
      stream: true,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(40000),
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, ms: Date.now() - t0, err: body.replace(/\s+/g, " ").slice(0, 160) };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let gotContent = false;
  let firstDeltaAt = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        for (const line of part.split("\n")) {
          const m = line.match(/^data:\s*(.*)$/);
          if (!m) continue;
          const payload = m[1].trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              if (!gotContent) firstDeltaAt = Date.now() - t0;
              gotContent = true;
              // 拿到内容即达标，关闭流（少量消耗）
              await reader.cancel().catch(() => {});
              return { ok: true, gotContent, ttftMs: firstDeltaAt, ms: Date.now() - t0 };
            }
          } catch {
            // 忽略不完整片段
          }
        }
      }
    }
  } catch (e) {
    return { ok: gotContent, status: 0, ms: Date.now() - t0, err: gotContent ? "" : String(e).slice(0, 120) };
  }
  return { ok: gotContent, gotContent, ttftMs: gotContent ? firstDeltaAt : 0, ms: Date.now() - t0, err: gotContent ? "" : "200 但流无内容" };
}

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
  console.log(`候选 chat 模型: ${ids.length}（流式实测，首个 content delta 判定）\n`);

  const results = [];
  const concurrency = 3;
  let cursor = 0;
  async function worker() {
    while (cursor < ids.length) {
      const id = ids[cursor++];
      results.push({ id, ...(await streamProbe(id)) });
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  results.sort((a, b) => a.id.localeCompare(b.id));
  const ok = results.filter((r) => r.ok);
  const bad = results.filter((r) => !r.ok);
  const empty = bad.filter((r) => r.status === 200);
  const r429 = bad.filter((r) => r.status === 429);
  const r400 = bad.filter((r) => r.status === 400);
  const other = bad.filter((r) => r.status !== 200 && r.status !== 429 && r.status !== 400);

  console.log(`流式可用 ${ok.length} / 空响应 ${empty.length} / 429限流 ${r429.length} / 400 ${r400.length} / 其他 ${other.length}\n`);

  console.log("=== 流式可用（按 TTFT 排序）===");
  for (const r of ok.sort((a, b) => a.ttftMs - b.ttftMs)) {
    console.log(`${String(r.ttftMs).padStart(5)}ms  ${r.id}`);
  }
  console.log("\n=== 空响应（200 但流无内容）===");
  for (const r of empty) console.log(`  ${r.id}  ${r.err}`);
  console.log("\n=== 429 限流/额度 ===");
  for (const r of r429) console.log(`  ${r.id}  ${r.err.slice(0, 90)}`);
  console.log("\n=== 400 ===");
  for (const r of r400) console.log(`  ${r.id}  ${r.err.slice(0, 90)}`);
  console.log("\n=== 其他错误 ===");
  for (const r of other) console.log(`  ${r.id}  ${r.status}  ${r.err.slice(0, 90)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
