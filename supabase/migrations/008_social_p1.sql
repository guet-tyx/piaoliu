-- ============================================================
-- 漂流 DRIFT · 008 增量迁移：P1 社交增强
--   F-02 留言墙 / F-03 足迹 / F-05 任务 / F-06 排行榜 / F-07 话题
-- 与 src/lib/api/{comments,quests,leaderboard,footprint}.ts 双分支一一对应
-- ⚠️ create or replace 涉及旧参数版本时先 drop 旧签名（避免重载歧义）
-- ============================================================

-- ---------- F-07：bottles.topic 列 ----------
alter table public.bottles add column if not exists topic text;

-- ---------- 投瓶 RPC 更新：p_topic 参数 ----------
drop function if exists public.launch_bottle(text, jsonb, text, boolean);
drop function if exists public.launch_bottle(text, jsonb, text, boolean, text);
create or replace function public.launch_bottle(
  p_text text, p_track jsonb, p_style text default 'paper',
  p_is_public boolean default false, p_topic text default null)
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
    (author_id, text, track_snapshot, bottle_style, anon_mark, status, picked_by, is_system, is_public, topic, expires_at)
  values
    (v_uid, p_text, p_track, p_style,
     (select anon_mark from public.sailors where id = v_uid),
     'drifting', null, false, p_is_public, nullif(btrim(p_topic), ''), now() + interval '72 hours')
  returning * into v_bottle;

  insert into public.action_logs (sailor_id, action, day, meta)
  values (v_uid, 'launch', v_day,
          jsonb_build_object('bottle_id', v_bottle.id, 'track', p_track));

  return v_bottle;
end;
$$;

-- ---------- F-02：歌曲留言墙 ----------
create table if not exists public.song_comments (
  id          uuid primary key default gen_random_uuid(),
  track_id    text not null,
  anon_mark   text not null,
  text        text not null check (char_length(text) between 10 and 100),
  source      text not null default 'direct' check (source in ('bottle', 'direct')),
  bottle_id   uuid,
  likes       text[] not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists song_comments_track_idx
  on public.song_comments (track_id, created_at desc);
create index if not exists song_comments_author_idx
  on public.song_comments (anon_mark, created_at desc);

alter table public.song_comments enable row level security;
-- 留言墙对所有人可读；写入仅经 RPC（SECURITY DEFINER）
create policy "song_comments_select_all" on public.song_comments
  for select using (true);

-- 发布感想（10-100 字 + 敏感词 + 同曲 5 分钟限频）
create or replace function public.post_comment(
  p_track_id text, p_text text, p_source text default 'direct', p_bottle_id uuid default null)
returns public.song_comments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_mark  text;
  v_last  timestamptz;
  v_comment public.song_comments;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if char_length(p_text) < 10 or char_length(p_text) > 100 then
    raise exception 'text length out of range';
  end if;
  if public.has_bad_word(p_text) then raise exception 'bad word'; end if;
  select anon_mark into v_mark from public.sailors where id = v_uid;
  if v_mark is null then raise exception 'no sailor'; end if;

  select created_at into v_last
  from public.song_comments
  where anon_mark = v_mark and track_id = p_track_id
  order by created_at desc limit 1;
  if v_last is not null and now() - v_last < interval '5 minutes' then
    raise exception 'comment cooldown';
  end if;

  insert into public.song_comments (track_id, anon_mark, text, source, bottle_id)
  values (p_track_id, v_mark, p_text, case when p_source = 'bottle' then 'bottle' else 'direct' end, p_bottle_id)
  returning * into v_comment;

  return v_comment;
end;
$$;

create or replace function public.fetch_comments(p_track_id text)
returns setof public.song_comments
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select * from public.song_comments
    where track_id = p_track_id
    order by created_at desc;
end;
$$;

create or replace function public.fetch_comments_by_author(p_mark text)
returns setof public.song_comments
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select * from public.song_comments
    where anon_mark = p_mark
    order by created_at desc;
end;
$$;

create or replace function public.toggle_comment_like(p_comment_id uuid)
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

  select likes into v_likes from public.song_comments where id = p_comment_id;
  if v_likes is null then raise exception 'comment not found'; end if;

  v_had := v_mark = any(v_likes);
  if v_had then
    v_likes := array_remove(v_likes, v_mark);
  else
    v_likes := array_append(v_likes, v_mark);
  end if;

  update public.song_comments set likes = v_likes where id = p_comment_id;
  return jsonb_build_object('liked', not v_had);
end;
$$;

-- ---------- F-05：任务羁绊发放（点数由前端任务系统判定，服务端受每日上限保护） ----------
create or replace function public.reward_quest(p_amount int)
returns public.sailors
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_day  date := (now() at time zone 'Asia/Shanghai')::date;
  v_today int;
  v_sailor public.sailors;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 5 then
    raise exception 'invalid amount';
  end if;

  -- 每日发放上限保护（4 任务 + 全勤 + 14 天奖励合计最多 8 次/天）
  select count(*) into v_today
  from public.action_logs
  where sailor_id = v_uid and action = 'quest_reward' and day = v_day;
  if v_today >= 10 then raise exception 'quest reward limit reached'; end if;

  update public.sailors s
  set bond_value = s.bond_value + p_amount,
      level = least(
        10,
        1 + (select count(*) from generate_series(1, 9) g
             where s.bond_value + p_amount >= g * (g + 1) / 2)
      )
  where id = v_uid
  returning * into v_sailor;

  insert into public.action_logs (sailor_id, action, day, meta)
  values (v_uid, 'quest_reward', v_day, jsonb_build_object('amount', p_amount));

  return v_sailor;
end;
$$;

-- ---------- F-06：排行榜聚合 ----------
create or replace function public.fetch_leaderboard(p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week_start timestamptz := (date_trunc('week', (now() at time zone 'Asia/Shanghai'))) at time zone 'Asia/Shanghai';
  v_result jsonb;
begin
  if p_kind = 'hot_today' then
    select coalesce(jsonb_agg(
      jsonb_build_object('id', b.id, 'text', b.text, 'track', b.track_snapshot,
        'anon_mark', b.anon_mark, 'created_at', b.created_at, 'likes', b.likes)
      order by cardinality(b.likes) desc, b.created_at asc), '[]'::jsonb) into v_result
    from public.bottles b
    where b.is_public and b.created_at >= now() - interval '24 hours';
    return v_result;
  end if;

  if p_kind = 'golden_quotes' then
    select coalesce(jsonb_agg(
      jsonb_build_object('id', b.id, 'text', b.text, 'track', b.track_snapshot,
        'anon_mark', b.anon_mark, 'created_at', b.created_at, 'likes', b.likes)
      order by cardinality(b.likes) desc, b.created_at asc), '[]'::jsonb) into v_result
    from public.bottles b
    where b.is_public
    limit 10;
    return v_result;
  end if;

  -- weekly_sailors：公开投瓶×3 + 回信×2 + 感想×1 + 感想获赞×1（本周一 00:00 起，Asia/Shanghai）
  select coalesce(jsonb_agg(row), '[]'::jsonb) into v_result
  from (
    select t.anon_mark,
           coalesce(b.pts, 0) + coalesce(r.pts, 0) + coalesce(c.pts, 0) as score
    from (
      select anon_mark from public.bottles where is_public and created_at >= v_week_start
      union
      select anon_mark from public.replies where created_at >= v_week_start
      union
      select anon_mark from public.song_comments where created_at >= v_week_start
    ) t
    left join (
      select anon_mark, 3 * count(*) as pts from public.bottles
      where is_public and created_at >= v_week_start group by anon_mark
    ) b on b.anon_mark = t.anon_mark
    left join (
      select anon_mark, 2 * count(*) as pts from public.replies
      where created_at >= v_week_start group by anon_mark
    ) r on r.anon_mark = t.anon_mark
    left join (
      select anon_mark, count(*) + coalesce(sum(cardinality(likes)), 0) as pts
      from public.song_comments
      where created_at >= v_week_start group by anon_mark
    ) c on c.anon_mark = t.anon_mark
    order by score desc
    limit 10
  ) row;
  return v_result;
end;
$$;

-- ---------- F-03：举报船客（代号为文本，reports.target_id 是 uuid 必填 → 增 target_mark 列承载） ----------
alter table public.reports add column if not exists target_mark text;

create or replace function public.report_sailor(p_mark text, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_mark is null or btrim(p_mark) = '' then raise exception 'invalid mark'; end if;
  insert into public.reports (target_type, target_id, reason, reporter_id, target_mark)
  values ('sailor', gen_random_uuid(), p_reason, v_uid, p_mark);
end;
$$;

-- ---------- F-03：船客足迹聚合 ----------
create or replace function public.fetch_sailor_footprint(p_mark text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sailor public.sailors;
  v_bottles jsonb;
  v_comments jsonb;
  v_total_likes int;
  v_followers int;
  v_first_at timestamptz;
begin
  select * into v_sailor
  from public.sailors where anon_mark = p_mark
  order by created_at limit 1;

  select coalesce(jsonb_agg(b order by b.created_at desc), '[]'::jsonb) into v_bottles
  from public.bottles b where b.is_public and b.anon_mark = p_mark;

  select coalesce(jsonb_agg(c order by c.created_at desc), '[]'::jsonb) into v_comments
  from public.song_comments c where c.anon_mark = p_mark;

  select coalesce(sum(cardinality(likes)), 0) into v_total_likes
  from public.bottles where is_public and anon_mark = p_mark;

  select count(*) into v_followers
  from public.follows where followed_mark = p_mark;

  select min(f.t) into v_first_at from (
    select created_at as t from public.bottles where anon_mark = p_mark
    union all
    select created_at from public.song_comments where anon_mark = p_mark
  ) f;

  return jsonb_build_object(
    'exists', v_bottles <> '[]'::jsonb or v_comments <> '[]'::jsonb or v_sailor is not null,
    'sailor', case when v_sailor is null then null else
      jsonb_build_object('anon_mark', v_sailor.anon_mark, 'level', v_sailor.level,
        'badges', to_jsonb(v_sailor.badges),
        'created_at', to_char(v_sailor.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) end,
    'bottle_count', jsonb_array_length(v_bottles),
    'comment_count', jsonb_array_length(v_comments),
    'total_likes', coalesce(v_total_likes, 0),
    'follower_count', coalesce(v_followers, 0),
    'first_seen_at', to_char(v_first_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'bottles', v_bottles,
    'comments', v_comments
  );
end;
$$;