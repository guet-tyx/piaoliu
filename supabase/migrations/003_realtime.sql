-- ============================================================
-- 漂流 DRIFT · V1.3 增量迁移：同船共听（FR-10）+ 真实弹幕（FR-11）
-- 依据 ARCHITECTURE.md §6 预留点：listeners 心跳表 + Realtime broadcast
-- ============================================================

-- ---------- 同船在线心跳表 ----------
-- anon_key 为客户端生成的匿名标识（展示层只暴露 anon_key/track_id，不暴露 uid，PRD 匿名原则）
create table if not exists public.listeners (
  user_id    uuid primary key,                        -- 关联 auth.uid（写操作校验）
  anon_key   text not null,                           -- 会话匿名标识（每次会话随机）
  track_id   text not null,                           -- 正在收听的曲目 id
  updated_at timestamptz not null default now()
);

alter table public.listeners enable row level security;
-- 读：全量可读但仅脱敏字段（RLS 按列暴露——查询侧只 select anon_key/track_id/updated_at）
create policy "listeners_read" on public.listeners
  for select using (true);
-- 写：仅本人心跳 upsert
create policy "listeners_upsert_own" on public.listeners
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 联调说明（待 Supabase 项目接入后执行）：
-- 1) Realtime 启用：Supabase Dashboard → Database → Replication 中订阅 public.listeners
--    （或直接使用 Realtime broadcast 频道，无需落库）
-- 2) 同船弹幕：Realtime broadcast 频道 danmaku:<track_id>（客户端 publish/subscribe），
--    与 001 迁移的 RPC 无关，属 ephemeral 消息，不落库
-- 3) 心跳替代方案：客户端每 15s upsert listeners（track_id/anon_key/updated_at），
--    查询侧以 updated_at > now() - interval '60 seconds' 过滤在线
-- 本地模拟（无 env 时）：BroadcastChannel + localStorage("drift-presence")，
-- 实现于 src/lib/realtime/*，行为契约与上表一致。
