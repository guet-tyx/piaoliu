-- ============================================================
-- 006_danmaku_presence.sql · P3-04 弹幕频道隔离 + 同船按频道统计
-- 幂等：可重复执行（IF NOT EXISTS / CREATE OR REPLACE）
-- 说明：
--  1. listeners 表加 channel_id 列（同船在线按频道统计）
--  2. upsert_listener 增 p_channel_id 参数，写入 channel 维度
--  3. online_listeners 视图带出 channel_id 列（前端按频道过滤）
-- 执行：psql 或 Supabase SQL Editor 手动执行一次即可
-- ============================================================

-- ---------- 1. listeners 表加 channel_id ----------
alter table public.listeners
  add column if not exists channel_id text not null default '';

-- ---------- 2. upsert_listener 支持频道维度 ----------
create or replace function public.upsert_listener(p_anon_key text, p_track_id text, p_channel_id text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  insert into public.listeners (user_id, anon_key, track_id, channel_id, updated_at)
  values (v_uid, p_anon_key, p_track_id, p_channel_id, now())
  on conflict (user_id) do update
    set anon_key = excluded.anon_key,
        track_id = excluded.track_id,
        channel_id = excluded.channel_id,
        updated_at = now();
  delete from public.listeners
  where updated_at < now() - interval '90 seconds'
    and user_id <> v_uid;
end;
$$;

-- ---------- 3. online_listeners 视图带出 channel_id ----------
create or replace view public.online_listeners as
  select anon_key, track_id, channel_id, updated_at
  from public.listeners
  where updated_at > now() - interval '60 seconds';
