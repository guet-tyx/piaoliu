-- ============================================================
-- 漂流 DRIFT · V1.1 数据库初始化（纸船漂流 + 汐的陪伴）
-- 依据 ARCHITECTURE.md §5 契约：建表 + RLS + RPC + 种子
-- 执行方式：Supabase SQL Editor 或 supabase db push（需配置项目后执行）
-- ============================================================

-- ---------- 扩展 ----------
create extension if not exists pgcrypto;

-- ---------- 枚举 ----------
create type bottle_status as enum ('drifting', 'picked', 'replied', 'sunk');

-- ---------- 星尘船员证 ----------
create table if not exists public.sailors (
  id          uuid primary key,
  anon_mark   text not null,              -- 匿名代号（「纸船·A7F3」风格，零注册自动生成）
  nickname    text,                       -- V1.2 启用（1-12 字，敏感词校验）
  bottle_style text not null default 'paper', -- V1.2 皮肤系统启用
  bond_value  int not null default 0,     -- V1.2 羁绊系统启用（预留）
  level       int not null default 1,     -- V1.2 星尘等级（预留）
  shio_state  jsonb not null default '{}'::jsonb, -- 汐陪伴状态（recent_lines / last_greeting_date）
  created_at  timestamptz not null default now()
);

alter table public.sailors enable row level security;
-- 仅本人可读；写一律走 SECURITY DEFINER RPC（update_nickname / earn_bond），
-- 不开放 PostgREST 直接 UPDATE（否则可绕过校验篡改 bond_value/level/nickname）
create policy "sailors_select_own" on public.sailors
  for select using (id = auth.uid());

-- ---------- 漂流瓶 ----------
create table if not exists public.bottles (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null,
  text          text not null check (char_length(text) between 10 and 200),
  track_snapshot jsonb not null,          -- {t,tag,s,cover} 曲目快照，防曲库变更后展示失真
  bottle_style  text not null default 'paper',
  anon_mark     text not null,            -- 投瓶人匿名代号（展示用，不暴露身份）
  status        bottle_status not null default 'drifting',
  picked_by     uuid,                     -- 拾取人（原子 claim 写入，防重复拾取）
  is_system     boolean not null default false, -- 冷启动预热瓶
  replied_at    timestamptz,              -- 回信时间（星海来讯判定/展示）
  read_at       timestamptz,              -- 星海来讯已读
  expires_at    timestamptz not null default now() + interval '72 hours', -- 沉没时间
  created_at    timestamptz not null default now()
);
create index if not exists bottles_drift_idx
  on public.bottles (status, expires_at) where status = 'drifting';

alter table public.bottles enable row level security;
-- 可见性：本人发起 或 本人拾取（回信靠岸可见）
create policy "bottles_select_visible" on public.bottles
  for select using (author_id = auth.uid() or picked_by = auth.uid());
-- insert/update 仅经 RPC（SECURITY DEFINER），无直接策略

-- ---------- 回信 ----------
create table if not exists public.replies (
  id          uuid primary key default gen_random_uuid(),
  bottle_id   uuid not null references public.bottles (id) on delete cascade,
  author_id   uuid not null,
  anon_mark   text not null,
  text        text not null check (char_length(text) between 10 and 200),
  created_at  timestamptz not null default now()
);
create index if not exists replies_bottle_idx on public.replies (bottle_id);

alter table public.replies enable row level security;
-- 回信仅原投瓶人可见（FR-7.4 硬性要求，RLS 层强制）
create policy "replies_select_author" on public.replies
  for select using (
    exists (
      select 1 from public.bottles b
      where b.id = replies.bottle_id and b.author_id = auth.uid()
    )
  );

-- ---------- 行为流水（限额 + 羁绊 + 周报素材） ----------
create table if not exists public.action_logs (
  id         bigint generated always as identity primary key,
  sailor_id  uuid not null,
  action     text not null,               -- launch / pick / reply（V1.2 增 listen_3 等）
  day        date not null,               -- 航海日边界：Asia/Shanghai
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists action_logs_limits_idx
  on public.action_logs (sailor_id, action, day);

alter table public.action_logs enable row level security;
-- 无任何策略：仅 RPC 可写（SECURITY DEFINER）

-- ---------- 敏感词（NFR-1 服务端权威校验） ----------
create table if not exists public.bad_words (
  word       text primary key,
  created_at timestamptz not null default now()
);

alter table public.bad_words enable row level security;
-- 全量可读（客户端即时拦截缓存）；写仅管理员（无写策略，仅 postgres/service_role）
create policy "bad_words_select_all" on public.bad_words
  for select using (true);

-- ---------- 举报（NFR-1 治理入口） ----------
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  target_type text not null,              -- bottle / reply / sailor
  target_id   uuid not null,
  reason      text not null,
  reporter_id uuid not null,
  status      text not null default 'open', -- open / reviewed / closed
  created_at  timestamptz not null default now()
);

alter table public.reports enable row level security;
create policy "reports_insert_own" on public.reports
  for insert with check (reporter_id = auth.uid());
create policy "reports_select_own" on public.reports
  for select using (reporter_id = auth.uid());

-- ============================================================
-- RPC（全部 SECURITY DEFINER：限额/原子 claim 不可绕过）
-- ============================================================

-- ---------- 敏感词命中（内部） ----------
create or replace function public.has_bad_word(p_text text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bad_words where p_text like '%' || word || '%'
  );
$$;

-- ---------- 匿名代号生成（内部） ----------
create or replace function public.gen_anon_mark()
returns text
language sql
volatile
security definer
set search_path = public
as $$
  select '星尘船客·' || upper(substr(md5(random()::text), 1, 8));
$$;

-- ---------- 获取/创建船员证 ----------
create or replace function public.get_or_create_sailor()
returns public.sailors
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_sailor public.sailors;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  insert into public.sailors (id, anon_mark)
  values (v_uid, public.gen_anon_mark())
  on conflict (id) do nothing;
  select * into v_sailor from public.sailors where id = v_uid;
  return v_sailor;
end;
$$;

-- ---------- 投瓶：限每日 1 个，10-200 字 + 敏感词校验 ----------
create or replace function public.launch_bottle(p_text text, p_track jsonb)
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
    (author_id, text, track_snapshot, bottle_style, anon_mark, status, picked_by, is_system, expires_at)
  values
    (v_uid, p_text, p_track, 'paper',
     (select anon_mark from public.sailors where id = v_uid),
     'drifting', null, false, now() + interval '72 hours')
  returning * into v_bottle;

  insert into public.action_logs (sailor_id, action, day, meta)
  values (v_uid, 'launch', v_day, jsonb_build_object('bottle_id', v_bottle.id));

  return v_bottle;
end;
$$;

-- ---------- 拾瓶：限每日 3 个；随机未拾/未过期/非本人，原子 claim ----------
create or replace function public.pick_bottle()
returns public.bottles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_day       date := (now() at time zone 'Asia/Shanghai')::date;
  v_count     int;
  v_bottle_id uuid;
  v_bottle    public.bottles;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select count(*) into v_count
  from public.action_logs
  where sailor_id = v_uid and action = 'pick' and day = v_day;
  if v_count >= 3 then raise exception 'daily pick limit reached'; end if;

  -- 原子 claim：先锁定一个随机候选行（FOR UPDATE SKIP LOCKED），
  -- 并发拾瓶人跳过已锁行改选其他瓶，而非误报空池
  select id into v_bottle_id
  from public.bottles
  where status = 'drifting' and author_id <> v_uid and expires_at > now()
  order by random()
  limit 1
  for update skip locked;

  if v_bottle_id is null then
    return null; -- 星海此刻很安静（前端空态）
  end if;

  update public.bottles b
  set status = 'picked', picked_by = v_uid
  where b.id = v_bottle_id
  returning * into v_bottle;

  insert into public.action_logs (sailor_id, action, day, meta)
  values (v_uid, 'pick', v_day, jsonb_build_object('bottle_id', v_bottle.id));

  return v_bottle;
end;
$$;

-- ---------- 今日限额（前端「今日可投 1 / 可拾 3」展示的权威来源） ----------
create or replace function public.get_daily_limits()
returns table (launched int, picked int)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where action = 'launch')::int as launched,
    count(*) filter (where action = 'pick')::int as picked
  from public.action_logs
  where sailor_id = auth.uid()
    and day = (now() at time zone 'Asia/Shanghai')::date;
$$;

-- ---------- 回信：仅拾瓶人可回，仅原投瓶人可见（RLS 保证） ----------
create or replace function public.reply_bottle(p_bottle_id uuid, p_text text)
returns public.replies
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_bottle public.bottles;
  v_reply  public.replies;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if char_length(p_text) < 10 or char_length(p_text) > 200 then
    raise exception 'text length out of range';
  end if;
  if public.has_bad_word(p_text) then raise exception 'bad word'; end if;

  -- 行锁：并发双回信串行化（后者在锁后重查状态 → 'already replied'）
  select * into v_bottle from public.bottles where id = p_bottle_id for update;
  if v_bottle is null or v_bottle.picked_by <> v_uid then
    raise exception 'forbidden';
  end if;
  if v_bottle.status <> 'picked' then
    raise exception 'already replied';
  end if;

  insert into public.replies (bottle_id, author_id, anon_mark, text)
  values (p_bottle_id, v_uid,
          (select anon_mark from public.sailors where id = v_uid),
          p_text)
  returning * into v_reply;

  update public.bottles
  set status = 'replied', replied_at = now()
  where id = p_bottle_id;

  insert into public.action_logs (sailor_id, action, day, meta)
  values (v_uid, 'reply', (now() at time zone 'Asia/Shanghai')::date,
          jsonb_build_object('bottle_id', p_bottle_id));

  return v_reply;
end;
$$;

-- ---------- 收件箱（星海来讯）：本人发起的瓶 + 回信 ----------
create or replace function public.fetch_inbox()
returns table (bottle jsonb, replies jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select
    jsonb_build_object(
      'id', b.id,
      'author_id', b.author_id,
      'text', b.text,
      'track_snapshot', b.track_snapshot,
      'bottle_style', b.bottle_style,
      'anon_mark', b.anon_mark,
      'status', b.status,
      'picked_by', b.picked_by,
      'is_system', b.is_system,
      'created_at', b.created_at,
      'replied_at', b.replied_at,
      'read_at', b.read_at
    ) as bottle,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'bottle_id', r.bottle_id,
          'anon_mark', r.anon_mark,
          'text', r.text,
          'created_at', r.created_at
        )
        order by r.created_at
      ) filter (where r.id is not null),
      '[]'::jsonb
    ) as replies
  from public.bottles b
  left join public.replies r on r.bottle_id = b.id
  where b.author_id = auth.uid()
    and b.replied_at is not null
  group by b.id
  order by b.replied_at desc;
$$;

-- ---------- 星海来讯已读 ----------
create or replace function public.mark_inbox_read(p_bottle_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.bottles
  set read_at = now()
  where id = p_bottle_id and author_id = auth.uid();
$$;

-- ---------- 举报（NFR-1 治理入口；V1.2 支持瓶子与回信两类目标） ----------
create or replace function public.report_content(
  p_target_type text,
  p_target_id   uuid,
  p_reason      text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  insert into public.reports (target_type, target_id, reason, reporter_id)
  values (p_target_type, p_target_id, p_reason, v_uid);
end;
$$;
