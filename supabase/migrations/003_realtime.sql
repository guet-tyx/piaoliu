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
-- 写：仅本人心跳 upsert。读不直接开放——RLS 是行级而非列级，
-- 开放全量 SELECT 会连同 user_id（真实 auth uid）一起泄漏；
-- 脱敏读取走下方 online_listeners 视图（只暴露匿名展示字段）。
create policy "listeners_upsert_own" on public.listeners
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 在线脱敏视图：仅暴露 anon_key/track_id/updated_at 三列，user_id 不出视图；
-- 视图按 owner 权限执行，表 RLS 不影响，但列面已脱敏
create or replace view public.online_listeners as
  select anon_key, track_id, updated_at
  from public.listeners
  where updated_at > now() - interval '60 seconds';
grant select on public.online_listeners to anon, authenticated;

create index if not exists listeners_updated_at_idx
  on public.listeners (updated_at);

-- 联调说明（待 Supabase 项目接入后执行）：
-- 1) Realtime 启用：Supabase Dashboard → Database → Replication 中订阅 public.listeners
--    （或直接使用 Realtime broadcast 频道，无需落库）
-- 2) 同船弹幕：Realtime broadcast 频道 danmaku:<track_id>（客户端 publish/subscribe），
--    与 001 迁移的 RPC 无关，属 ephemeral 消息，不落库
-- 3) 心跳替代方案：客户端每 15s upsert listeners（track_id/anon_key/updated_at），
--    查询侧以 updated_at > now() - interval '60 seconds' 过滤在线
-- 本地模拟（无 env 时）：BroadcastChannel + localStorage("drift-presence")，
-- 实现于 src/lib/realtime/*，行为契约与上表一致。
