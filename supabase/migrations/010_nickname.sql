-- ============================================================
-- 漂流 DRIFT · 010 增量迁移：投瓶昵称（广场展示昵称需求）
-- bottles 加 nickname 列，launch_bottle 落库昵称（未设置时 null）
-- ============================================================

alter table public.bottles add column if not exists nickname text;

-- 投瓶 RPC 更新：p_nickname（drop 旧 5 参版本，避免重载歧义）
drop function if exists public.launch_bottle(text, jsonb, text, boolean, text);
create or replace function public.launch_bottle(
  p_text text, p_track jsonb, p_style text default 'paper',
  p_is_public boolean default false, p_topic text default null,
  p_nickname text default null)
returns public.bottles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_day    date := (now() at time zone 'Asia/Shanghai')::date;
  v_count  int;
  v_bottle public.bottles;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if char_length(p_text) < 10 or char_length(p_text) > 200 then
    raise exception 'text length out of range';
  end if;
  if public.has_bad_word(p_text) then raise exception 'bad word'; end if;

  select count(*) into v_count
  from public.action_logs
  where sailor_id = v_uid and action = 'launch' and day = v_day;
  if v_count >= 1 then raise exception 'daily launch limit reached'; end if;

  insert into public.bottles
    (author_id, text, track_snapshot, bottle_style, anon_mark, nickname, status, picked_by, is_system, is_public, topic, expires_at)
  values
    (v_uid, p_text, p_track, p_style,
     (select anon_mark from public.sailors where id = v_uid),
     nullif(btrim(p_nickname), ''),
     'drifting', null, false, p_is_public, nullif(btrim(p_topic), ''), now() + interval '72 hours')
  returning * into v_bottle;

  insert into public.action_logs (sailor_id, action, day, meta)
  values (v_uid, 'launch', v_day,
          jsonb_build_object('bottle_id', v_bottle.id, 'track', p_track));

  return v_bottle;
end;
$$;