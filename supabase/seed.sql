-- ============================================================
-- 漂流 DRIFT · V1.1 种子数据
-- 1) 系统预热瓶（冷启动：保证早期必有瓶可拾，署名「星海信使」）
-- 2) 敏感词初值（⚠️ 需按 NFR-1 人工评审后定稿）
-- 幂等：on conflict do nothing，可重复执行
-- ============================================================

-- ---------- 系统预热瓶（与 src/lib/api/bottles.ts 本地池文案一致） ----------
-- 系统投放者固定 id（无对应 sailors 行，anon_mark 直接写在瓶上）
insert into public.bottles
  (author_id, text, track_snapshot, bottle_style, anon_mark, status, is_system, expires_at)
values
  ('00000000-0000-4000-8000-000000000001',
   '今晚的风很适合漂流。耳机里放一首没听过的歌，把心事交给星海。',
   '{"t":"信风","tag":"后摇","s":"一支你没听过的乐队 · 后摇","cover":"/images/cover-anime-1.png"}',
   'paper', '星海信使·SEED', 'drifting', true, now() + interval '72 hours'),
  ('00000000-0000-4000-8000-000000000001',
   '第 1001 个失眠的夜晚。歌单翻到底，还是回到了第一首。有人和我一样吗。',
   '{"t":"凌晨三点半的港","tag":"爵士嘻哈","s":"爵士嘻哈 · 失眠人士精选","cover":"/images/cover-anime-2.png"}',
   'paper', '星海信使·SEED', 'drifting', true, now() + interval '72 hours'),
  ('00000000-0000-4000-8000-000000000001',
   '刚下夜班。这座城市睡了一半，醒着一半。我把耳机调大声了一点。',
   '{"t":"晚风告别式","tag":"环境电子","s":"环境电子 · 深夜电台","cover":"/images/cover-anime-4.png"}',
   'paper', '星海信使·SEED', 'drifting', true, now() + interval '72 hours'),
  ('00000000-0000-4000-8000-000000000001',
   '和朋友走散了。约好在这里放一艘纸船，她说看到就会明白。',
   '{"t":"雨季漂流记","tag":"氛围","s":"氛围 · 下雨天限定","cover":"/images/cover-anime-3.png"}',
   'paper', '星海信使·SEED', 'drifting', true, now() + interval '72 hours'),
  ('00000000-0000-4000-8000-000000000001',
   '把暗恋藏进一首歌里。如果三年后还记得，我就回来捡这艘船。',
   '{"t":"信风","tag":"后摇","s":"一支你没听过的乐队 · 后摇","cover":"/images/cover-anime-1.png"}',
   'paper', '星海信使·SEED', 'drifting', true, now() + interval '72 hours'),
  ('00000000-0000-4000-8000-000000000001',
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
