-- ============================================================
-- 漂流 DRIFT · V2.1 后端功能增量：周报真实化 + 跨设备找回 + 同船在线
-- 全部 create or replace / create unique index if not exists，**幂等**，
-- 可直接粘贴到已部署项目（SQL Editor），重复执行安全。
-- ============================================================

-- ---------- 1. 周报：get_weekly_report 增加 bottles 键（本周启航的纸船） ----------
-- 前端 WeeklyReport.bottles 需要 {id, text, trackName, picked, replied}；
-- 来源 = action_logs(action='launch') 的 meta.bottle_id 关联 bottles 表。
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
    ),
    'bottles', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', b.id,
        'text', b.text,
        'track_name', b.track_snapshot ->> 't',
        'picked', b.picked_by is not null,
        'replied', b.replied_at is not null
      ) order by b.created_at desc), '[]'::jsonb)
      from public.action_logs al
      join public.bottles b on b.id = (al.meta ->> 'bottle_id')::uuid
      where al.sailor_id = auth.uid() and al.action = 'launch'
        and al.day >= (now() at time zone 'Asia/Shanghai')::date - 6
    )
  );
$$;

-- ---------- 2. 跨设备找回：生成/重置找回码（bcrypt 哈希，单一生效码） ----------
-- 前端 genCode 生成 XXX-XXX 格式码 → 此处只存哈希（不落明文），覆盖旧码。
create or replace function public.set_recovery_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_code !~ '^[A-Z2-9]{3}-[A-Z2-9]{3}$' then
    raise exception 'invalid code format';
  end if;
  update public.sailors
  set recovery_hash = public.crypt(p_code, public.gen_salt('bf'))
  where id = auth.uid();
end;
$$;

-- ---------- 3. 跨设备找回：输入码恢复（单事务行转移，单次有效） ----------
-- 校验：recovery_hash 为 bcrypt 串，crypt(p_code, recovery_hash) 同盐重算比对。
-- 恢复：属性覆盖当前行（id 保持 = 当前匿名 uid）→ 内容行重指当前 uid →
--       删除目标行 → hash 置空（码作废）。同设备重放仅清 hash。
create or replace function public.claim_recovery(p_code text)
returns public.sailors
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_target public.sailors;
  v_mine   public.sailors;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_code !~ '^[A-Z2-9]{3}-[A-Z2-9]{3}$' then
    raise exception 'invalid code format';
  end if;

  select * into v_target
  from public.sailors
  where recovery_hash is not null
    and recovery_hash = public.crypt(p_code, recovery_hash)
  limit 1;
  if v_target is null then raise exception 'recovery code invalid'; end if;

  if v_target.id = v_uid then
    -- 本设备重放：码作废，返回当前行
    update public.sailors set recovery_hash = null where id = v_uid;
    select * into v_mine from public.sailors where id = v_uid;
    return v_mine;
  end if;

  -- 目标行属性覆盖当前行
  update public.sailors s
  set anon_mark     = t.anon_mark,
      nickname      = t.nickname,
      bottle_style  = t.bottle_style,
      bond_value    = t.bond_value,
      level         = t.level,
      badges        = t.badges,
      recovery_hash = null
  from public.sailors t
  where s.id = v_uid and t.id = v_target.id;
  if not found then raise exception 'sailor not found'; end if;

  -- 内容行重指当前 uid（各表未声明外键，直接改归属；listeners 为瞬时心跳不转移）
  update public.bottles set author_id = v_uid where author_id = v_target.id;
  update public.bottles set picked_by = v_uid where picked_by = v_target.id;
  update public.replies set author_id = v_uid where author_id = v_target.id;
  update public.action_logs set sailor_id = v_uid where sailor_id = v_target.id;
  update public.reports set reporter_id = v_uid where reporter_id = v_target.id;

  delete from public.sailors where id = v_target.id;

  select * into v_mine from public.sailors where id = v_uid;
  return v_mine;
end;
$$;

-- 找回码哈希唯一索引（防碰撞歧义）
create unique index if not exists sailors_recovery_hash_uidx
  on public.sailors (recovery_hash)
  where recovery_hash is not null;

-- ---------- 4. 同船在线：心跳 upsert（按 user_id 一人一行，PK 不变） ----------
-- 在线判定由视图 online_listeners（updated_at > now()-60s）过滤；
-- 这里顺带机会性清理他人 90s 前过期心跳行（物理兜底）。
create or replace function public.upsert_listener(p_anon_key text, p_track_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  insert into public.listeners (user_id, anon_key, track_id, updated_at)
  values (v_uid, p_anon_key, p_track_id, now())
  on conflict (user_id) do update
    set anon_key = excluded.anon_key,
        track_id = excluded.track_id,
        updated_at = now();
  delete from public.listeners
  where updated_at < now() - interval '90 seconds'
    and user_id <> v_uid;
end;
$$;
