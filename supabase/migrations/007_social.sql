-- ============================================================
-- 漂流 DRIFT · P0 增量迁移：漂流广场（F-01）+ 星海关注（F-04）
-- 本地与真实双轨：真实模式 RPC 与 src/lib/api 双分支一一对应
-- ============================================================

-- ---------- 漂流瓶扩展：公开漂流 + 点赞 ----------
alter table public.bottles
  add column if not exists is_public boolean not null default false,
  add column if not exists likes text[] not null default '{}';

-- 可见性：公开瓶子所有人可浏览（原策略仅「本人发起或本人拾取」）
drop policy if exists "bottles_select_visible" on public.bottles;
create policy "bottles_select_visible" on public.bottles
  for select using (author_id = auth.uid() or picked_by = auth.uid() or is_public = true);

create index if not exists bottles_public_idx
  on public.bottles (is_public, created_at) where is_public = true;

-- ---------- 关注表（F-04：单向、匿名保护、不公开粉丝列表） ----------
create table if not exists public.follows (
  id            uuid primary key default gen_random_uuid(),
  follower_id   uuid not null default auth.uid(),
  followed_mark text not null,
  created_at    timestamptz not null default now(),
  unique (follower_id, followed_mark)
);

alter table public.follows enable row level security;
drop policy if exists "follows_manage_own" on public.follows;
create policy "follows_manage_own" on public.follows
  for all using (follower_id = auth.uid()) with check (follower_id = auth.uid());

-- insert 仅经 RPC（toggle_follow，SECURITY DEFINER），此处无直接插入策略

-- ---------- 投瓶 RPC 更新：p_is_public 参数 ----------
-- 注意：必须 drop 旧 3 参版本（004 建立），否则与带默认值的 4 参版本
-- 并存导致「Could not choose the best candidate function」重载歧义
drop function if exists public.launch_bottle(text, jsonb, text);
drop function if exists public.launch_bottle(text, jsonb, text, boolean);
create or replace function public.launch_bottle(
  p_text text, p_track jsonb, p_style text default 'paper', p_is_public boolean default false)
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
    (author_id, text, track_snapshot, bottle_style, anon_mark, status, picked_by, is_system, is_public, expires_at)
  values
    (v_uid, p_text, p_track, p_style,
     (select anon_mark from public.sailors where id = v_uid),
     'drifting', null, false, p_is_public, now() + interval '72 hours')
  returning * into v_bottle;

  insert into public.action_logs (sailor_id, action, day, meta)
  values (v_uid, 'launch', v_day,
          jsonb_build_object('bottle_id', v_bottle.id, 'track', p_track));

  return v_bottle;
end;
$$;

-- ---------- 漂流广场公开流（F-01） ----------
create or replace function public.fetch_drift_feed(p_sort text default 'latest')
returns setof public.bottles
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_sort = 'hot' then
    return query
      select b.* from public.bottles b
      where b.is_public = true
      order by cardinality(b.likes) desc, b.created_at desc;
  end if;
  return query
    select b.* from public.bottles b
    where b.is_public = true
    order by b.created_at desc;
end;
$$;

-- ---------- 点赞切换（F-01：按 anonMark 去重，同一人一票） ----------
create or replace function public.toggle_like(p_bottle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_mark  text;
  v_likes text[];
  v_had   boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select anon_mark into v_mark from public.sailors where id = v_uid;
  if v_mark is null then raise exception 'no sailor'; end if;

  select likes into v_likes from public.bottles where id = p_bottle_id;
  if v_likes is null then raise exception 'bottle not found'; end if;

  v_had := v_mark = any(v_likes);
  if v_had then
    v_likes := array_remove(v_likes, v_mark);
  else
    v_likes := array_append(v_likes, v_mark);
  end if;

  update public.bottles set likes = v_likes where id = p_bottle_id;
  return jsonb_build_object('liked', not v_had);
end;
$$;

-- ---------- 关注切换 / 列表 / 关注 Tab（F-04） ----------
create or replace function public.toggle_follow(p_mark text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_self_mark text;
  v_existing  boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_mark is null or btrim(p_mark) = '' then raise exception 'self'; end if;
  select anon_mark into v_self_mark from public.sailors where id = v_uid;
  if v_self_mark = p_mark then raise exception 'self'; end if;

  select exists(
    select 1 from public.follows where follower_id = v_uid and followed_mark = p_mark
  ) into v_existing;

  if v_existing then
    delete from public.follows where follower_id = v_uid and followed_mark = p_mark;
  else
    if (select count(*) from public.follows where follower_id = v_uid) >= 100 then
      raise exception 'follow limit reached';
    end if;
    insert into public.follows (follower_id, followed_mark) values (v_uid, p_mark);
  end if;

  return jsonb_build_object('followed', not v_existing);
end;
$$;

create or replace function public.get_follows()
returns table (followed_mark text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select f.followed_mark, f.created_at
    from public.follows f
    where f.follower_id = auth.uid()
    order by f.created_at desc;
end;
$$;

create or replace function public.fetch_public_by_marks(p_marks text[])
returns setof public.bottles
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select b.* from public.bottles b
    where b.is_public = true and b.anon_mark = any(p_marks)
    order by b.created_at desc;
end;
$$;

-- ---------- 我的瓶子（船员证「我的漂流」，P0 F-01） ----------
create or replace function public.get_my_bottles()
returns setof public.bottles
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select b.* from public.bottles b
    where b.author_id = auth.uid()
    order by b.created_at desc;
end;
$$;