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
language sql
security definer
set search_path = public
as $$
  insert into public.action_logs (sailor_id, action, day, meta)
  values (auth.uid(), 'listen', (now() at time zone 'Asia/Shanghai')::date,
          jsonb_build_object('track_id', p_track_id));
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
