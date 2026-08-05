-- ============================================================
-- 漂流 DRIFT · 009 增量迁移：星海共听（P2）
-- 房间元数据落 DB（列表/自动解散判定）；播放同步/弹幕/投票/
-- 在线成员走 Realtime broadcast 与 presence（客户端协调，无需本轮落库）
-- ============================================================

create table if not exists public.colisten_rooms (
  id             text primary key,
  title          text not null,
  start_track    jsonb not null,
  playlist       jsonb not null default '[]'::jsonb,
  created_by     text not null,
  host_id        text not null,
  created_at     timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

alter table public.colisten_rooms enable row level security;
-- 房间列表对所有船客公开；写入仅经 RPC
create policy "colisten_rooms_select_all" on public.colisten_rooms
  for select using (true);

-- ---------- 创建房间（房主写入） ----------
create or replace function public.create_colisten_room(
  p_id text, p_track jsonb, p_playlist jsonb default '[]'::jsonb, p_title text default '')
returns public.colisten_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_mark   text;
  v_room   public.colisten_rooms;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_id is null or btrim(p_id) = '' then raise exception 'invalid room id'; end if;
  select anon_mark into v_mark from public.sailors where id = v_uid;

  insert into public.colisten_rooms (id, title, start_track, playlist, created_by, host_id)
  values (p_id,
          case when p_title is null or btrim(p_title) = '' then '星海共听' else p_title end,
          p_track, coalesce(p_playlist, '[]'::jsonb),
          coalesce(v_mark, '匿名船客'), p_id || '-host')
  returning * into v_room;

  return v_room;
end;
$$;

-- ---------- 活跃房间列表（30 分钟无人自动解散过滤） ----------
create or replace function public.fetch_colisten_rooms()
returns setof public.colisten_rooms
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select r.* from public.colisten_rooms r
    where r.last_active_at >= now() - interval '30 minutes'
    order by r.last_active_at desc;
end;
$$;

-- ---------- 房间心跳（房主/成员页定时上报，自动解散依据） ----------
create or replace function public.touch_colisten_room(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_id is null or btrim(p_id) = '' then return; end if;
  update public.colisten_rooms
  set last_active_at = now()
  where id = p_id;
end;
$$;