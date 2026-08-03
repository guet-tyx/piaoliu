-- ============================================================
-- 漂流 DRIFT · 全量安装（合并版，供 SQL Editor 一次粘贴）
-- 内容 = migrations/001~004 + seed.sql（按序）
-- 说明：本文件供手动安装用；若用 supabase CLI 请改用 migrations/ 目录（勿重复执行本文件）
-- ============================================================

-- >>>>>>>>>> 来自 supabase/migrations/001_init.sql <<<<<<<<<<

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


-- >>>>>>>>>> 来自 supabase/migrations/002_collection.sql <<<<<<<<<<

-- ============================================================
-- 漂流 DRIFT · V1.2 增量迁移：星尘身份 + 收集系统
-- 依据 ARCHITECTURE.md §6 预留点：激活 sailors.nickname/bond_value/level/bottle_style
-- 新增 badges（徽章）与 recovery_hash（跨设备找回码）
-- ============================================================

-- ---------- 船员证扩展列 ----------
alter table public.sailors
  add column if not exists badges jsonb not null default '[]'::jsonb,   -- 已解锁徽章 id 集合
  add column if not exists recovery_hash text;                          -- 找回码哈希（跨设备恢复）

-- ---------- 昵称修改（FR-9.1：1-12 字 + 敏感词校验） ----------
create or replace function public.update_nickname(p_nickname text)
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
  if char_length(p_nickname) < 1 or char_length(p_nickname) > 12 then
    raise exception 'nickname length out of range';
  end if;
  if public.has_bad_word(p_nickname) then raise exception 'bad word'; end if;
  update public.sailors set nickname = p_nickname where id = v_uid
  returning * into v_sailor;
  if v_sailor is null then raise exception 'sailor not found'; end if;
  return v_sailor;
end;
$$;

-- ---------- 羁绊累积（FR-8.3：+1 → 等级重算，公式与 data/collection.ts 的 levelOfBond 一致） ----------
-- p_once_per_day=true 的行为（daily 航行 1 天 / listen 听歌 3 首）每日每种限一次，
-- 以 action_logs(action='bond', day, meta.kind) 去重——服务端权威，防客户端无限刷羁绊。
create or replace function public.earn_bond(p_kind text, p_once_per_day boolean default false)
returns public.sailors
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_day    date := (now() at time zone 'Asia/Shanghai')::date;
  v_sailor public.sailors;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  -- 行为白名单（与前端 BondKind 一致）
  if p_kind not in ('daily', 'launch', 'pick', 'reply', 'listen') then
    raise exception 'invalid bond kind';
  end if;

  -- 每日一次行为：当天同 kind 已累计则直接返回（不重复 +1）
  if p_once_per_day then
    if exists (
      select 1 from public.action_logs
      where sailor_id = v_uid and action = 'bond'
        and day = v_day and meta ->> 'kind' = p_kind
    ) then
      select * into v_sailor from public.sailors where id = v_uid;
      return v_sailor;
    end if;
  end if;

  -- 等级 = 1 + 满足「新羁绊 ≥ T_g」的阈值个数（T_g = g(g+1)/2，g∈[1,9]），封顶 10
  update public.sailors s
  set bond_value = s.bond_value + 1,
      level = least(
        10,
        1 + (select count(*) from generate_series(1, 9) g
             where s.bond_value + 1 >= g * (g + 1) / 2)
      )
  where s.id = v_uid
  returning * into v_sailor;
  if v_sailor is null then raise exception 'sailor not found'; end if;

  insert into public.action_logs (sailor_id, action, day, meta)
  values (v_uid, 'bond', v_day, jsonb_build_object('kind', p_kind));

  return v_sailor;
end;
$$;

-- ---------- 跨设备找回（FR-9.3 渐进实现） ----------
-- 联调方案（待 Supabase 项目接入后启用）：
-- 1) 生成码：客户端生成 6 位码 → 传 RPC 存 sha256 哈希到 sailors.recovery_hash
-- 2) 恢复：新设备匿名用户输入码 → RPC 校验哈希 → 将目标 sailor 行转移到当前 uid
--    （转移需处理 bottles.author_id / picked_by 外键，建议在事务内一并更新）
-- 本地模拟阶段：码 ↔ 船员证快照映射存 localStorage（src/lib/api/sailor.ts 已实现）
-- 此处暂不创建 claim_recovery 函数，待联调时按上述方案落地。


-- >>>>>>>>>> 来自 supabase/migrations/003_realtime.sql <<<<<<<<<<

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


-- >>>>>>>>>> 来自 supabase/migrations/004_report_events.sql <<<<<<<<<<

-- ============================================================
-- 漂流 DRIFT · V2.0 增量迁移：星海周报（FR-13）+ 节日活动（FR-14）
-- ============================================================

-- ---------- 活动皮肤落库通道 ----------
-- launch_bottle 增加 p_style 参数（活动期间投瓶写入限定瓶面样式；
-- 默认取调用方船员证皮肤或 'paper'）
create or replace function public.launch_bottle(p_text text, p_track jsonb, p_style text default 'paper')
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
    (v_uid, p_text, p_track, p_style,
     (select anon_mark from public.sailors where id = v_uid),
     'drifting', null, false, now() + interval '72 hours')
  returning * into v_bottle;

  -- 周报素材：流水 meta 补 track 快照（热门航线聚合源）
  insert into public.action_logs (sailor_id, action, day, meta)
  values (v_uid, 'launch', v_day,
          jsonb_build_object('bottle_id', v_bottle.id, 'track', p_track));

  return v_bottle;
end;
$$;

-- ---------- 收听流水（周报热门航线/星图素材） ----------
-- 客户端每次切歌记录：action='listen'，meta.track_id
-- 写入方式：RPC record_listen(p_track_id text)（联调阶段启用）
create or replace function public.record_listen(p_track_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  insert into public.action_logs (sailor_id, action, day, meta)
  values (v_uid, 'listen', (now() at time zone 'Asia/Shanghai')::date,
          jsonb_build_object('track_id', p_track_id));
end;
$$;

-- ---------- 周报聚合（FR-13 真实模式） ----------
-- 从 action_logs 按周聚合：本周行为数 / 热门航线 top3 / 按天收听分布
create or replace function public.get_weekly_report()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'week_start', (now() at time zone 'Asia/Shanghai')::date - 6,
    'summary', (
      select jsonb_build_object(
        'launched', count(*) filter (where action = 'launch'),
        'picked',   count(*) filter (where action = 'pick'),
        'replied',  count(*) filter (where action = 'reply'),
        'listens',  count(*) filter (where action = 'listen')
      )
      from public.action_logs
      where sailor_id = auth.uid()
        and day >= (now() at time zone 'Asia/Shanghai')::date - 6
    ),
    'top_tracks', (
      select coalesce(jsonb_agg(row_to_json(t) order by t.cnt desc), '[]'::jsonb)
      from (
        select meta->>'track_id' as track_id, count(*) as cnt
        from public.action_logs
        where sailor_id = auth.uid() and action = 'listen'
          and day >= (now() at time zone 'Asia/Shanghai')::date - 6
        group by meta->>'track_id'
        order by cnt desc
        limit 3
      ) t
    ),
    'listen_days', (
      select coalesce(jsonb_agg(row_to_json(d) order by d.day), '[]'::jsonb)
      from (
        select day, count(*) as cnt
        from public.action_logs
        where sailor_id = auth.uid() and action = 'listen'
          and day >= (now() at time zone 'Asia/Shanghai')::date - 6
        group by day
      ) d
    )
  );
$$;

-- 说明：
-- 1) 周报定时推送（真实模式）建议用 pg_cron 每周一 00:30 生成快照表 report_weekly，
--    或按需调用 get_weekly_report()（轻量图文页当前按需聚合即可）
-- 2) 活动配置在客户端 src/data/events.ts（无管理后台；日期判断真实模式可改为
--    服务端 now() 校验，客户端仅做展示提示）
-- 3) 本地模拟（无 env 时）实现于 src/lib/api/report.ts，行为契约与本文件一致


-- >>>>>>>>>> 来自 supabase/seed.sql <<<<<<<<<<

-- ============================================================
-- 漂流 DRIFT · V1.1 种子数据
-- 1) 系统预热瓶（冷启动：保证早期必有瓶可拾，署名「星海信使」）
-- 2) 敏感词初值（⚠️ 需按 NFR-1 人工评审后定稿）
-- 幂等：on conflict do nothing，可重复执行
-- ============================================================

-- ---------- 系统预热瓶（与 src/lib/api/bottles.ts 本地池文案一致） ----------
-- 系统投放者固定 id（无对应 sailors 行，anon_mark 直接写在瓶上）
-- 瓶子 id 显式固定（B1~B6）：on conflict (id) do nothing 真正幂等，可重复执行不翻倍
insert into public.bottles
  (id, author_id, text, track_snapshot, bottle_style, anon_mark, status, is_system, expires_at)
values
  ('00000000-0000-4000-8000-0000000000B1',
   '00000000-0000-4000-8000-000000000001',
   '今晚的风很适合漂流。耳机里放一首没听过的歌，把心事交给星海。',
   '{"t":"信风","tag":"后摇","s":"一支你没听过的乐队 · 后摇","cover":"/images/cover-anime-1.png"}',
   'paper', '星海信使·SEED', 'drifting', true, now() + interval '72 hours'),
  ('00000000-0000-4000-8000-0000000000B2',
   '00000000-0000-4000-8000-000000000001',
   '第 1001 个失眠的夜晚。歌单翻到底，还是回到了第一首。有人和我一样吗。',
   '{"t":"凌晨三点半的港","tag":"爵士嘻哈","s":"爵士嘻哈 · 失眠人士精选","cover":"/images/cover-anime-2.png"}',
   'paper', '星海信使·SEED', 'drifting', true, now() + interval '72 hours'),
  ('00000000-0000-4000-8000-0000000000B3',
   '00000000-0000-4000-8000-000000000001',
   '刚下夜班。这座城市睡了一半，醒着一半。我把耳机调大声了一点。',
   '{"t":"晚风告别式","tag":"环境电子","s":"环境电子 · 深夜电台","cover":"/images/cover-anime-4.png"}',
   'paper', '星海信使·SEED', 'drifting', true, now() + interval '72 hours'),
  ('00000000-0000-4000-8000-0000000000B4',
   '00000000-0000-4000-8000-000000000001',
   '和朋友走散了。约好在这里放一艘纸船，她说看到就会明白。',
   '{"t":"雨季漂流记","tag":"氛围","s":"氛围 · 下雨天限定","cover":"/images/cover-anime-3.png"}',
   'paper', '星海信使·SEED', 'drifting', true, now() + interval '72 hours'),
  ('00000000-0000-4000-8000-0000000000B5',
   '00000000-0000-4000-8000-000000000001',
   '把暗恋藏进一首歌里。如果三年后还记得，我就回来捡这艘船。',
   '{"t":"信风","tag":"后摇","s":"一支你没听过的乐队 · 后摇","cover":"/images/cover-anime-1.png"}',
   'paper', '星海信使·SEED', 'drifting', true, now() + interval '72 hours'),
  ('00000000-0000-4000-8000-0000000000B6',
   '00000000-0000-4000-8000-000000000001',
   '考试周第四天。凌晨三点，窗外有鸟在叫。今晚的歌很轻，刚好盖过焦虑。',
   '{"t":"凌晨三点半的港","tag":"爵士嘻哈","s":"爵士嘻哈 · 失眠人士精选","cover":"/images/cover-anime-2.png"}',
   'paper', '星海信使·SEED', 'drifting', true, now() + interval '72 hours')
on conflict (id) do nothing;

-- ---------- 敏感词初值（⚠️ 人工评审后增补，与 src/data/bad-words.ts 对应） ----------
insert into public.bad_words (word) values
  ('傻逼'), ('白痴'), ('贱人'), ('废物'), ('去死'), ('滚蛋'), ('脑残'), ('垃圾人'),
  ('约炮'), ('裸聊'), ('嫖娼'), ('卖淫'),
  ('砍死你'), ('弄死你'), ('杀了你'), ('炸了'),
  ('赌博网站'), ('博彩'), ('代开房'),
  ('加微信'), ('加QQ'), ('私聊我'), ('点击链接'), ('扫码领取'),
  ('轮子'), ('法轮功'), ('台独'), ('藏独')
on conflict (word) do nothing;


