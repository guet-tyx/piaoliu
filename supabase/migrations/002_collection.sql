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

-- ---------- 羁绊累积（FR-8.3：+1 → 等级重算，公式与 data/collection.ts 一致） ----------
create or replace function public.earn_bond(p_kind text)
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
  update public.sailors s
  set bond_value = s.bond_value + 1,
      level = least(
        10,
        (select count(*) from generate_series(1, 10) g
         where s.bond_value + 1 >= g * (g + 1) / 2)
      )
  where s.id = v_uid
  returning * into v_sailor;
  if v_sailor is null then raise exception 'sailor not found'; end if;
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
