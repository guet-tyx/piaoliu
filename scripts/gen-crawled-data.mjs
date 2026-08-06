/**
 * 生成爬取数据清洗产物（真实弹幕/评论填充）
 *
 * 输入（public/data/ 原始爬取 JSON + src/data/crawled-mapping.ts 映射表）：
 *   - all_danmaku.json           日系弹幕（source=歌曲拼音）
 *   - all_danmaku_starsea.json   starsea 中文圈弹幕（source=歌名）
 *   - all_comments.json          日系热评（source=歌曲名，liked 为真实点赞数）
 *   - all_comments_starsea.json  starsea 热评（source=「歌名 - 艺术家」）
 *
 * 清洗规则：
 *   - source 归一化：剥「 - 艺术家」后缀、簡→繁（賽→赛），查映射表挂到曲库 trackId
 *   - 弹幕：去空白、按 text 去重、超长截断至 40 字、固定种子洗牌后每曲取 ≤120 条
 *   - 评论：去空白、按 liked 降序每曲取 top 20（保留真实点赞数）
 *
 * 输出（幂等：固定随机种子，重跑输出一致）：
 *   - public/data/crawled-danmaku.json   { trackId: string[] }
 *   - public/data/crawled-comments.json  { trackId: [{text, liked}] }
 *   - --seed-sql 附加生成 supabase/migrations/011_crawled_seed.sql（Supabase 模式种子）
 *
 * 用法：
 *   node scripts/gen-crawled-data.mjs
 *   node scripts/gen-crawled-data.mjs --seed-sql   # 同时生成迁移 SQL
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "public", "data");
const SEED = 42; // 固定随机种子：幂等输出

/** 曲库合法 id 集合（t01-t52） */
const TRACK_IDS = new Set(
  Array.from({ length: 52 }, (_, i) => `t${String(i + 1).padStart(2, "0")}`),
);

/** 从 crawled-mapping.ts 提取映射表（单一数据源：避免脚本内重复维护） */
function loadMapping() {
  const src = readFileSync(join(ROOT, "src", "data", "crawled-mapping.ts"), "utf8");
  // 跳过 TS 类型注解：CRAWLED_SOURCE_TO_TRACK : Record<string, string> = { ... };
  const m = src.match(/CRAWLED_SOURCE_TO_TRACK[\s\S]*?=\s*(\{[\s\S]*?\});/);
  if (!m) throw new Error("crawled-mapping.ts 中未找到映射表对象");
  // 对象字面量为纯字符串键值，Function 构造求值即可（无 TS 语法）
  const map = new Function(`return (${m[1]})`)();
  if (typeof map !== "object" || map === null) throw new Error("映射表解析失败");
  return map;
}

/** mulberry32：固定种子伪随机（保证重跑输出一致） */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 固定种子洗牌（不修改原数组） */
function seededShuffle(arr, seed) {
  const rand = mulberry32(seed);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 按 code point 截断（避免切断 emoji/代理对） */
function clip(text, max) {
  const chars = [...text];
  return chars.length <= max ? text : `${chars.slice(0, max).join("")}…`;
}

/** 弹幕超长截断阈值（弹幕显示区宽度有限） */
const DM_MAX_LEN = 40;
/** 每曲弹幕池上限 */
const DM_POOL_MAX = 120;
/** 每曲热评条数 */
const CM_TOP = 20;
/** 留言墙文本约束（song_comments 表 CHECK：char_length between 10 and 100） */
const CM_TEXT_MIN = 10;
/** 种子评论文本上限：取 80 留安全余量，避免边界值触发 100 上限约束 */
const CM_TEXT_MAX = 80;

/**
 * 评论文本规范化到留言墙约束范围：
 * - 去空白后不足 10 字 → 返回 null（丢弃，避免违反表 CHECK）
 * - 超过 80 字 → 按 code point 截断到 80 字（远低于 100 约束上限）
 */
function clipComment(text) {
  const chars = [...text.trim()];
  if (chars.length < CM_TEXT_MIN) return null;
  return chars.length <= CM_TEXT_MAX ? chars.join("") : chars.slice(0, CM_TEXT_MAX).join("");
}

/** 评论热评作者名池（留言墙展示用；Supabase 种子亦使用） */
const ANON_POOL = [
  "星海旅人", "拾星者", "晚风收藏家", "深夜电台客", "纸船水手",
  "流星观测员", "潮汐听客", "灯塔守夜人", "云间漫步者", "拂晓诗人",
];
const ANON_MARK_PREFIX = "星海旅人";

function readJson(file) {
  const p = join(DATA_DIR, file);
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, "utf8"));
}

function main() {
  const mapping = loadMapping();
  const danmakuFiles = ["all_danmaku.json", "all_danmaku_starsea.json"];
  const commentFiles = ["all_comments.json", "all_comments_starsea.json"];

  const orphan = new Set();
  /** 归一化 source：剥「 - 艺术家」后缀 + 簡→繁（賽→赛），返回映射后的 trackId（无映射返回 null） */
  const mapSource = (raw) => {
    let s = String(raw ?? "").trim();
    const sep = s.indexOf(" - ");
    if (sep > 0) s = s.slice(0, sep).trim();
    s = s.replace(/賽/g, "赛");
    const id = mapping[s];
    if (!id) orphan.add(String(raw ?? ""));
    return id ?? null;
  };

  // ── 弹幕：source → 文本池 ──
  const dmByTrack = new Map();
  const dmSourceStats = new Map();
  for (const file of danmakuFiles) {
    for (const item of readJson(file)) {
      const trackId = mapSource(item.source);
      if (!trackId || typeof item.text !== "string") continue;
      const text = item.text.trim();
      if (!text) continue;
      let pool = dmByTrack.get(trackId);
      if (!pool) {
        pool = new Set();
        dmByTrack.set(trackId, pool);
      }
      // 全量收集后统一截断/洗牌/限量（先用 Set 去重）
      pool.add(clip(text, DM_MAX_LEN));
      dmSourceStats.set(trackId, (dmSourceStats.get(trackId) ?? 0) + 1);
    }
  }
  const dmOut = {};
  for (const [trackId, pool] of [...dmByTrack.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const list = seededShuffle([...pool], SEED + trackId.length).slice(0, DM_POOL_MAX);
    dmOut[trackId] = list;
  }

  // ── 评论：trackId → [{text, liked}]，按 liked 降序取 top ──
  const cmByTrack = new Map();
  const cmSourceStats = new Map();
  const skippedShort = { count: 0 };
  for (const file of commentFiles) {
    for (const item of readJson(file)) {
      const trackId = mapSource(item.source);
      if (!trackId || typeof item.text !== "string") continue;
      const text = clipComment(item.text);
      if (text == null) {
        skippedShort.count += 1;
        continue;
      }
      let list = cmByTrack.get(trackId);
      if (!list) {
        list = [];
        cmByTrack.set(trackId, list);
      }
      list.push({ text, liked: Number.isFinite(item.liked) ? item.liked : 0 });
      cmSourceStats.set(trackId, (cmSourceStats.get(trackId) ?? 0) + 1);
    }
  }
  const cmOut = {};
  for (const [trackId, list] of [...cmByTrack.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const top = [...list]
      .sort((a, b) => b.liked - a.liked)
      .slice(0, CM_TOP)
      .map((c) => ({ text: c.text, liked: c.liked }));
    cmOut[trackId] = top;
  }

  // ── 校验：映射值必须是合法曲库 id；孤儿 source 告警 ──
  for (const [src, id] of Object.entries(mapping)) {
    if (!TRACK_IDS.has(id)) {
      throw new Error(`映射 ${src} → ${id} 不是合法曲库 id`);
    }
  }

  writeFileSync(
    join(DATA_DIR, "crawled-danmaku.json"),
    JSON.stringify(dmOut, null, 2) + "\n",
  );
  writeFileSync(
    join(DATA_DIR, "crawled-comments.json"),
    JSON.stringify(cmOut, null, 2) + "\n",
  );

  // ── 统计输出 ──
  console.log("=== 弹幕池（trackId → 条数，来源原始条数）===");
  let dmTotal = 0;
  for (const [trackId, list] of Object.entries(dmOut)) {
    console.log(`  ${trackId}  ${String(list.length).padStart(3)} 条（原始 ${dmSourceStats.get(trackId)}）`);
    dmTotal += list.length;
  }
  console.log(`  合计 ${dmTotal} 条 / ${Object.keys(dmOut).length} 曲`);
  console.log("=== 热评池（trackId → 条数）===");
  let cmTotal = 0;
  for (const [trackId, list] of Object.entries(cmOut)) {
    console.log(`  ${trackId}  ${String(list.length).padStart(3)} 条`);
    cmTotal += list.length;
  }
  console.log(`  合计 ${cmTotal} 条 / ${Object.keys(cmOut).length} 曲`);
  if (orphan.size > 0) {
    console.warn(`⚠️ 未映射 source（已丢弃）${orphan.size} 个：`);
    for (const s of [...orphan].sort()) console.warn(`  - ${s}`);
  } else {
    console.log("✓ 所有 source 均映射到曲库");
  }

  // ── 可选：生成 Supabase 种子迁移 SQL ──
  if (process.argv.includes("--seed-sql")) {
    writeSeedSql(cmOut);
    console.log("✓ 已生成 supabase/migrations/011_crawled_seed.sql");
  }
}

/** 生成 011_crawled_seed.sql（幂等：hot_likes 列 IF NOT EXISTS + on conflict do nothing） */
function writeSeedSql(cmOut) {
  const lines = [];
  lines.push("-- ============================================================");
  lines.push("-- 011_crawled_seed.sql · 爬取热评种子（真实弹幕/评论填充）");
  lines.push("-- 由 scripts/gen-crawled-data.mjs --seed-sql 生成，勿手改数据段");
  lines.push("-- 幂等：hot_likes 列 IF NOT EXISTS；种子 on conflict (id) do nothing");
  lines.push("-- 执行：psql 或 Supabase SQL Editor 手动执行一次即可");
  lines.push("-- ============================================================");
  lines.push("");
  lines.push("alter table public.song_comments");
  lines.push("  add column if not exists hot_likes int not null default 0;");
  lines.push("");

  const rows = [];
  for (const [trackId, list] of Object.entries(cmOut)) {
    list.forEach((c, i) => {
      const text = c.text.replace(/'/g, "''");
      const mark = `${ANON_MARK_PREFIX}·${String(i + 1).padStart(2, "0")}`;
      // id 固定 = md5('seed-<trackId>-<i>') 转 uuid → on conflict 幂等
      rows.push(
        `  (md5('seed-${trackId}-${i}')::uuid, '${trackId}', '${mark}', '${text}', 'direct', ${c.liked}, now() - (interval '${24 + (i % 7)} days' + interval '${i * 13} minutes'))`,
      );
    });
  }
  lines.push("insert into public.song_comments");
  lines.push("  (id, track_id, anon_mark, text, source, hot_likes, created_at)");
  lines.push("values");
  lines.push(rows.join(",\n"));
  lines.push("on conflict (id) do nothing;");
  lines.push("");

  writeFileSync(join(ROOT, "supabase", "migrations", "011_crawled_seed.sql"), lines.join("\n"));
}

main();
