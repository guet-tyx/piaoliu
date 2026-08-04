/**
 * 多 Provider 大池子流式可用性验证（V2.6 单一数据源）：
 * 从 src/lib/llm/providers.json 读取注册表（与线上调度同一份数据，不再手写副本），
 * 对每个「已配置 key」的 provider 流式探测：显式配置 + 内置优选 + 动态池抽样。
 * 判定标准：能否真正流式吐出内容（与聊天一致）。
 * 用法：node scripts/verify-providers.mjs [--pool N]   # --pool 控制动态池抽样数
 */
import fs from "node:fs";
import path from "node:path";

// 单一数据源：与 src/lib/llm/providers.ts 共用 providers.json
const { providers: PROVIDERS } = JSON.parse(
  fs.readFileSync(path.resolve("src/lib/llm/providers.json"), "utf-8"),
);

const envPath = path.resolve(".env.local");
const env = {};
for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const NON_CHAT = /image|embedding|audio|voice|tts|asr|rerank|gui|ocr|video|\bvl\b|vision|think/i;
const poolLimit = Number((process.argv.find((a) => a.startsWith("--pool=")) ?? "--pool=8").split("=")[1]);

const active = PROVIDERS.filter((p) => (env[p.keyEnv] ?? "").length > 0);
if (active.length === 0) {
  console.error("未检测到任何已配置的 API key（.env.local），无法验证。");
  process.exit(1);
}

async function fetchPool(p) {
  try {
    const r = await fetch(`${(env[p.baseUrlEnv] || p.defaultBaseUrl).replace(/\/$/, "")}/models`, {
      headers: { Authorization: `Bearer ${env[p.keyEnv]}` },
      signal: AbortSignal.timeout(20000),
    });
    if (r.ok) {
      const d = await r.json();
      return (d.data ?? []).map((m) => m.id).filter(Boolean);
    }
  } catch {}
  return [];
}

async function probe(p, model) {
  const base = (env[p.baseUrlEnv] || p.defaultBaseUrl).replace(/\/$/, "");
  const t0 = Date.now();
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env[p.keyEnv]}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: "说一个字" }], max_tokens: 20, stream: true, temperature: 0.3 }),
      signal: AbortSignal.timeout(40000),
    });
    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      return { ok: false, status: res.status, ms: Date.now() - t0, err: body.replace(/\s+/g, " ").slice(0, 110) };
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", got = false, ttft = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() ?? "";
      for (const part of parts) for (const line of part.split("\n")) {
        const m = line.match(/^data:\s*(.*)$/);
        if (!m || m[1] === "[DONE]") continue;
        try {
          const j = JSON.parse(m[1]);
          const d = j?.choices?.[0]?.delta?.content ?? "";
          if (d) { if (!got) ttft = Date.now() - t0; got = true; await reader.cancel().catch(() => {}); return { ok: true, ttft, ms: Date.now() - t0 }; }
        } catch {}
      }
    }
    return { ok: false, status: 200, ms: Date.now() - t0, err: "200 但流无内容" };
  } catch (e) {
    return { ok: false, status: 0, ms: Date.now() - t0, err: String(e).slice(0, 90) };
  }
}

for (const p of active) {
  const key = env[p.keyEnv];
  const explicit = (env[p.modelsEnv] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const pool = p.supportsPool ? await fetchPool(p) : [];
  const poolSub = pool.filter((id) => !NON_CHAT.test(id)).slice(0, poolLimit);
  // 内置优选直接来自 providers.json（与线上调度第二优先一致，不再跳过）
  const preferred = p.preferredModels ?? [];
  const testModels = [...new Set([...explicit, ...preferred, ...poolSub])];
  if (testModels.length === 0) {
    console.log(`\n【${p.name}】 已配置 key 但无候选模型，跳过`);
    continue;
  }
  console.log(`\n【${p.name}】 key=${key.slice(0, 6)}… 候选 ${testModels.length} 个（显式 ${explicit.length} + 优选 ${preferred.length} + 池 ${poolSub.length}）`);
  const results = [];
  const concurrency = 3;
  let cursor = 0;
  async function worker() {
    while (cursor < testModels.length) {
      const id = testModels[cursor++];
      results.push({ id, ...(await probe(p, id)) });
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const ok = results.filter((r) => r.ok);
  const bad = results.filter((r) => !r.ok);
  for (const r of ok.sort((a, b) => a.ttft - b.ttft)) {
    console.log(`  ✓ ${String(r.ttft).padStart(5)}ms  ${r.id}`);
  }
  for (const r of bad) {
    console.log(`  ✗ ${r.status || "ERR"} ${String(r.ms).padStart(5)}ms  ${r.id}  ${r.err}`);
  }
  console.log(`  → ${ok.length}/${results.length} 可用`);
}
