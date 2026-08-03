#!/usr/bin/env node
/**
 * Supabase 真实模式端到端冒烟测试
 *
 * 前置条件（见 SUPABASE_SETUP.md）：
 * - .env.local 已配置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - 项目已启用匿名登录（Anonymous Sign-Ins）
 * - 001~004 迁移已按序执行
 *
 * 运行：npm run verify:real
 *
 * 用两个匿名用户跑通核心链路，逐项断言后端修复点：
 * - replied_at 列存在（回信/收件箱不再 42703）
 * - 投/拾/回信/收件箱 + RLS 可见性（回信仅作者可见）
 * - get_daily_limits 真实限额统计
 * - earn_bond 等级公式与前端 levelOfBond 一致 + 每日去重
 * - replies snake→camel 字段映射
 *
 * 说明：拾瓶是「池中随机」。若 B 未拾到 A 的测试瓶（拾到预热系统瓶），
 * 回信→收件箱的完整映射断言会跳过并以 ⚠️ 提示——重跑 seed 或清空瓶池后可覆盖。
 * 建议在空池（未执行 seed）时首次跑，可完整覆盖黄金链路。
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

/* ---------- 读取 .env.local ---------- */
const envFile = resolve(process.cwd(), ".env.local");
let env = {};
try {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(
      /^\s*(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY)\s*=\s*(.+?)\s*$/,
    );
    if (m) env[m[1]] = m[2].trim();
  }
} catch {
  // 统一在下方报错
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error("❌ 未找到 .env.local 或缺少 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  console.error("   请按 SUPABASE_SETUP.md：建项目 → cp .env.example .env.local → 填入真实值");
  process.exit(1);
}

/* ---------- 两个独立匿名用户 ---------- */
const A = createClient(url, anon);
const B = createClient(url, anon);

let passed = 0;
let failed = 0;
let skipped = 0;

function ok(name, cond, extra = "") {
  const suffix = extra ? ` — ${extra}` : "";
  if (cond) {
    passed += 1;
    console.log(`✅ ${name}${suffix}`);
  } else {
    failed += 1;
    console.log(`❌ ${name}${suffix}`);
  }
}

function skip(name, extra = "") {
  skipped += 1;
  console.log(`⚠️  ${name}${extra ? ` — ${extra}` : ""}`);
}

/** 前端 levelOfBond（src/data/collection.ts）—— 与 SQL earn_bond 公式对照 */
function levelOfBond(bond) {
  let level = 1;
  while (level < 10 && bond >= (level * (level + 1)) / 2) level++;
  return level;
}

const TRACK = { t: "信风", tag: "后摇", s: "冒烟测试曲目", cover: "/images/cover-anime-1.png" };
const LAUNCH_TEXT = "冒烟测试纸船：验证真实后端链路是否畅通无阻。";
const REPLY_TEXT = "冒烟测试回信：沿原航线靠岸，验证回信链路。";

async function main() {
  console.log("=== Supabase 真实模式冒烟测试 ===\n");

  /* 1. 用户 A 匿名登录 + 船员证 */
  const { error: aSignErr } = await A.auth.signInAnonymously();
  ok("A 匿名登录（匿名 Sign-In 已启用）", !aSignErr, aSignErr?.message);
  if (aSignErr) return;

  const { data: ua } = await A.auth.getUser();
  const uidA = ua?.user?.id;

  const { data: sailorA, error: saErr } = await A.rpc("get_or_create_sailor");
  ok("A 获取/创建船员证（代号非空）", !saErr && !!sailorA?.anon_mark, sailorA?.anon_mark);
  if (saErr || !sailorA?.anon_mark) return;

  /* 2. 初始限额 */
  const { data: lim0, error: l0Err } = await A.rpc("get_daily_limits");
  ok("A 初始限额 {0,0}", !l0Err && lim0?.launched === 0 && lim0?.picked === 0, JSON.stringify(lim0));

  /* 3. A 投瓶 */
  const { data: bottle, error: lbErr } = await A.rpc("launch_bottle", {
    p_text: LAUNCH_TEXT,
    p_track: TRACK,
    p_style: "paper",
  });
  ok("A 投瓶成功（status=drifting）", !lbErr && !!bottle?.id && bottle?.status === "drifting", lbErr?.message);
  if (lbErr || !bottle?.id) return;
  const bottleId = bottle.id;

  /* 4. 投后限额 */
  const { data: lim1 } = await A.rpc("get_daily_limits");
  ok("A 投后限额 launched=1", lim1?.launched === 1, JSON.stringify(lim1));

  /* 5. 用户 B 匿名登录 + 拾瓶（原子 claim） */
  const { error: bSignErr } = await B.auth.signInAnonymously();
  ok("B 匿名登录", !bSignErr, bSignErr?.message);
  if (bSignErr) return;

  const { data: ub } = await B.auth.getUser();
  const uidB = ub?.user?.id;

  const { data: picked, error: pbErr } = await B.rpc("pick_bottle");
  ok("B 拾瓶成功", !pbErr && !!picked?.id, pbErr?.message);
  if (pbErr || !picked?.id) return;
  ok("拾瓶原子 claim（picked_by=B）", picked?.picked_by === uidB, picked?.picked_by);

  /* 6. B 回信（无论拾到谁，直接验证 replied_at 列存在——列缺失时此 RPC 报 42703） */
  const { data: reply, error: rbErr } = await B.rpc("reply_bottle", {
    p_bottle_id: picked.id,
    p_text: REPLY_TEXT,
  });
  ok("B 回信成功（replied_at 列存在，不再 42703）", !rbErr && reply?.text === REPLY_TEXT, rbErr?.message);
  if (rbErr) return;

  /* 7. A 收件箱：是否拾到测试瓶决定断言深度（池中随机，两条都是正确行为） */
  const { data: inbox, error: ibErr } = await A.rpc("fetch_inbox");
  ok("A 收件箱可查询（fetch_inbox 正常）", !ibErr && Array.isArray(inbox), ibErr?.message);
  const myItem = inbox?.find((i) => i.bottle?.id === bottleId);
  const expectingReply = picked.author_id === uidA;

  if (expectingReply) {
    // 黄金链路：B 拾到 A 的瓶 → A 应看到回信
    ok("A 收件箱含该瓶", !!myItem, `瓶=${bottleId}`);
    ok("回信 snake→camel 映射（replies[0].text）", myItem?.replies?.[0]?.text === REPLY_TEXT, myItem?.replies?.[0]?.text);
    ok("瓶 replied_at 已回写（inbox 含 replied_at）", !!myItem?.bottle?.replied_at, myItem?.bottle?.replied_at);
  } else {
    // 拾到系统瓶：A 无回信 → 收件箱应为空（行为正确），映射断言本轮跳过
    ok("A 收件箱为空（拾到系统瓶，符合行为）", !myItem, `拾到=${picked.id}`);
    skip(
      "回信→收件箱完整映射本轮未覆盖",
      "B 拾到的是预热系统瓶（池中随机）。建议空池时重跑：重执行 seed.sql（会重置预热瓶为漂流中）后再试，或新建项目验证。",
    );
  }

  /* 8. B 收件箱应为空（RLS：回信仅作者可见；B 从未投瓶） */
  const { data: inboxB } = await B.rpc("fetch_inbox");
  ok("B 收件箱为空（RLS 仅作者可见）", Array.isArray(inboxB) && inboxB.length === 0, `len=${inboxB?.length}`);

  /* 9. A 标记已读 */
  const { error: mkErr } = await A.rpc("mark_inbox_read", { p_bottle_id: bottleId });
  ok("A 标记已读（mark_inbox_read）", !mkErr, mkErr?.message);

  /* 10. A 修改昵称 */
  const { data: renamed, error: rnErr } = await A.rpc("update_nickname", { p_nickname: "冒烟船员" });
  ok("A 修改昵称（1-12 字校验）", !rnErr && renamed?.nickname === "冒烟船员", rnErr?.message);

  /* 11. A 羁绊：earn_bond('launch') → bond=1，等级与前端 levelOfBond(1)=2 一致 */
  const { data: bonded, error: bdErr } = await A.rpc("earn_bond", { p_kind: "launch", p_once_per_day: false });
  ok("A 羁绊+1（bond=1）", !bdErr && bonded?.bond_value === 1, `bond=${bonded?.bond_value}`);
  ok("等级公式与前端一致（levelOfBond）", bonded?.level === levelOfBond(bonded?.bond_value ?? 0), `level=${bonded?.level} 期望=${levelOfBond(bonded?.bond_value ?? 0)}`);

  /* 12. A 每日羁绊去重：earn_bond('daily', once=true) 两次 → 第二次 bond 不变 */
  const { data: d1 } = await A.rpc("earn_bond", { p_kind: "daily", p_once_per_day: true });
  const { data: d2 } = await A.rpc("earn_bond", { p_kind: "daily", p_once_per_day: true });
  ok("A 每日羁绊首次 +1（bond=2）", d1?.bond_value === 2, `bond=${d1?.bond_value}`);
  ok("A 每日羁绊服务端去重（第二次不变）", d2?.bond_value === 2, `bond=${d2?.bond_value}`);

  /* 13. A 举报（鉴权通过） */
  const { error: rpErr } = await A.rpc("report_content", {
    p_target_type: "bottle",
    p_target_id: bottleId,
    p_reason: "冒烟测试举报",
  });
  ok("A 举报记录（report_content）", !rpErr, rpErr?.message);

  /* 14. B 拾后限额 */
  const { data: limB } = await B.rpc("get_daily_limits");
  ok("B 拾后限额 picked=1", limB?.picked === 1, JSON.stringify(limB));

  finish();
}

function finish() {
  console.log(`\n=== 结果：${passed} ✅ / ${failed} ❌${skipped > 0 ? ` / ${skipped} ⚠️ 跳过` : ""} ===`);
  if (failed === 0) console.log("冒烟通过：真实后端核心链路可用。");
}

main()
  .catch((e) => {
    console.error("❌ 冒烟脚本异常：", e.message);
    process.exitCode = 1;
  })
  .finally(() => {
    // 清理：登出清除 supabase-js 的 auth 刷新定时器/连接句柄，
    // 避免 Windows 下 process.exit 撞 libuv 断言崩溃（UV_HANDLE_CLOSING）。
    try {
      A.auth.signOut().catch(() => {});
      B.auth.signOut().catch(() => {});
    } catch {
      // 忽略清理失败
    }
    process.exitCode = process.exitCode || (failed > 0 ? 1 : 0);
  });
