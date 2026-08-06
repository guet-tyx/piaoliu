-- ============================================================
-- 011_crawled_seed.sql · 爬取热评种子（真实弹幕/评论填充）
-- 由 scripts/gen-crawled-data.mjs --seed-sql 生成，勿手改数据段
-- 幂等：hot_likes 列 IF NOT EXISTS；种子 on conflict (id) do nothing
-- 执行：psql 或 Supabase SQL Editor 手动执行一次即可
-- ============================================================

alter table public.song_comments
  add column if not exists hot_likes int not null default 0;

insert into public.song_comments
  (id, track_id, anon_mark, text, source, hot_likes, created_at)
values
  (md5('seed-t02-0')::uuid, 't02', '星海旅人·01', '夜に駆ける机翻：晚上跑笑死哈哈哈哈哈哈哈哈哈', 'direct', 33428, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t02-1')::uuid, 't02', '星海旅人·02', '平成末年三大新人美波/ずっと真夜中でいいのに。/ヨルシカ 令和初代YOASOBI', 'direct', 24603, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t02-2')::uuid, 't02', '星海旅人·03', '恶龙又凑到公主耳边说:把假发带好哦，骑士', 'direct', 17105, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t02-3')::uuid, 't02', '星海旅人·04', '人家的嗓子就适合唱歌，我的嗓子就适合做核酸😔', 'direct', 12803, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t02-4')::uuid, 't02', '星海旅人·05', '「Yoasobi」「ヨルシカ」「ずとまよ」
⬇️
「夜遊び」　「夜シカ」　「ずとま夜」
⬇️
三大宝藏之夜系列', 'direct', 10135, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t02-5')::uuid, 't02', '星海旅人·06', '这首歌改编自星野舞夜的小说《塔纳托斯的诱惑，故事讲的是一个男孩对想轻生的女孩一见钟情的故事。结局是两个人一起跳了楼，其实女孩只是男孩幻想出来的，象征着他对死亡的', 'direct', 9913, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t02-6')::uuid, 't02', '星海旅人·07', '夜 跑 进 行 曲（大雾）', 'direct', 9107, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t02-7')::uuid, 't02', '星海旅人·08', '即使把耳机里最喜欢听的yoasobi的歌调到最大，还是盖不住客厅里父母的争吵声，眼泪还是会无法控制地留下。但也正因为yoasobi的存在，我才能从眼泪中走出来，', 'direct', 8807, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t02-8')::uuid, 't02', '星海旅人·09', '又发现宝藏了，另外三厨的可以油管搜【秒針を噛む×だから僕は音楽を辞めた×夜に駆ける×メーベル】享受三倍快乐(还真有人做出来了[大哭]', 'direct', 8759, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t02-9')::uuid, 't02', '星海旅人·10', '日推推到的人那就是混到了网易云巅峰！！！', 'direct', 4761, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t02-10')::uuid, 't02', '星海旅人·11', '给新粉科普一下：YOASOBl是一个组合，ikura是组合里的主唱，是一个有着天使吻过的嗓音的小姐姐；ayase是这个组合里负责歌曲制作的小哥哥，同时也是一位p', 'direct', 4316, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t02-11')::uuid, 't02', '星海旅人·12', '夜に駆ける的含金量到底有多高呢？

这就要龙哥打开记事本了

①红白初登场：黄金时间+全曲+特别介绍+最佳舞台

②2020年B榜日本综合榜第一位（最重要），B', 'direct', 4300, now() - (interval '28 days' + interval '143 minutes')),
  (md5('seed-t02-12')::uuid, 't02', '星海旅人·13', '这首歌为什么这么火啊。我看油管各种霸屏。虽然是好歌就是了。4000万播放总归有什么契机吧。', 'direct', 3724, now() - (interval '29 days' + interval '156 minutes')),
  (md5('seed-t02-13')::uuid, 't02', '星海旅人·14', '昨天哼着这个去食堂被一个ylg听到，两个人互相确认后直接重开，真的是好好听啊啊啊啊啊啊', 'direct', 3310, now() - (interval '30 days' + interval '169 minutes')),
  (md5('seed-t02-14')::uuid, 't02', '星海旅人·15', '更准确的翻译是奔向夜晚', 'direct', 2884, now() - (interval '24 days' + interval '182 minutes')),
  (md5('seed-t02-15')::uuid, 't02', '星海旅人·16', '找到原典
之前听的全是二创[笑哭了]', 'direct', 1, now() - (interval '25 days' + interval '195 minutes')),
  (md5('seed-t02-16')::uuid, 't02', '星海旅人·17', 'nmixx去年东京演唱会居然唱过这个 真的太好听了', 'direct', 1, now() - (interval '26 days' + interval '208 minutes')),
  (md5('seed-t02-17')::uuid, 't02', '星海旅人·18', '再存档……我前天去报送面试 今天出结果', 'direct', 1, now() - (interval '27 days' + interval '221 minutes')),
  (md5('seed-t02-18')::uuid, 't02', '星海旅人·19', '其实我有点没看懂这个MV（但是很美），那个一直在动的喷射浆糊是什么？是代指眼泪吗？', 'direct', 1, now() - (interval '28 days' + interval '234 minutes')),
  (md5('seed-t02-19')::uuid, 't02', '星海旅人·20', '于三上，这把是不是你打的有问题', 'direct', 0, now() - (interval '29 days' + interval '247 minutes')),
  (md5('seed-t04-0')::uuid, 't04', '星海旅人·01', '“他们呢，是儒艮养大的。”', 'direct', 67617, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t04-1')::uuid, 't04', '星海旅人·02', '米津：我从十几岁开始就非常喜欢《海兽之子》，当我知道它要被拍成电影时，我就主动去说“无论如何都想为它做音乐”。并且，10年来我一直在想，这部漫画要是影视化的话应', 'direct', 61945, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t04-2')::uuid, 't04', '星海旅人·03', '我可以扮成你喜欢的样子 不要怕我好吗
   
                                    <本気です^', 'direct', 49537, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t04-3')::uuid, 't04', '星海旅人·04', '蜃阙半模糊    踏浪惊呼
沐日光华还浴月    我欲乘桴', 'direct', 15788, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t04-4')::uuid, 't04', '星海旅人·05', '想沉沦于大海，感受大海的温柔。
想仰望这星空，做个温柔的少年。', 'direct', 15724, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t04-5')::uuid, 't04', '星海旅人·06', '五十岚大介为了画这部作品，跑去海边居住了一段时间，并且观看了大量的海上照片与资料。[钟情]
正是他这样的勤恳敬业，才能把海中各种生物画的栩栩如生。[钟情]
蓝天', 'direct', 15516, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t04-6')::uuid, 't04', '星海旅人·07', '大门敞开着的房间里却空无一人，
只有着一把染着潮湿海风的椅子。', 'direct', 11769, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t04-7')::uuid, 't04', '星海旅人·08', '™谁告诉我歌手叫老八的', 'direct', 11270, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t04-8')::uuid, 't04', '星海旅人·09', '性格开朗又天真无邪的“海”、
以及像是能够看穿一切的“空”。
这是琉花所接触到，一段“生命”的故事。', 'direct', 9134, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t04-9')::uuid, 't04', '星海旅人·10', '儒艮（ru gen）又称美人鱼，是哺乳动物，喜欢用前掌抱着孩子，给孩子喂奶。', 'direct', 6376, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t04-10')::uuid, 't04', '星海旅人·11', '八爷的声音一如既往的开口跪，带着些微海洋般苍凉的感觉，仿佛来自海洋深处的呼声~喜欢这样甜美又青涩的画风~', 'direct', 6006, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t04-11')::uuid, 't04', '星海旅人·12', '“一个最需要海的国家，做出了对海最不可原谅的事”', 'direct', 5457, now() - (interval '28 days' + interval '143 minutes')),
  (md5('seed-t04-12')::uuid, 't04', '星海旅人·13', '我发现了一件有意思的事情
米津给花火写歌，同期有个你的名字，把花火摁在地上
米津给海兽之子写歌，同期又有个天气之子。。。。。。
新海诚都快成米津死对头了。。。。', 'direct', 5171, now() - (interval '29 days' + interval '156 minutes')),
  (md5('seed-t04-13')::uuid, 't04', '星海旅人·14', '風薫る砂浜でまた会いましょう。

在风香的沙滩上再见吧。', 'direct', 5030, now() - (interval '30 days' + interval '169 minutes')),
  (md5('seed-t04-14')::uuid, 't04', '星海旅人·15', '溺死在这片蔚蓝海洋中了', 'direct', 4861, now() - (interval '24 days' + interval '182 minutes')),
  (md5('seed-t04-15')::uuid, 't04', '星海旅人·16', '疫情前的那个盛夏，一切都那样的生机盎然，像极了生命中的盛夏，燥动而又充满了活力和期盼。咸咸的海风，一望无尽的海洋，黄的发亮的沙滩，蓝的发黑的天空，和远端青空高耸', 'direct', 2, now() - (interval '25 days' + interval '195 minutes')),
  (md5('seed-t04-16')::uuid, 't04', '星海旅人·17', '米津：我从十几岁开始就非常喜欢《海兽之子》，当我知道它要被拍成电影时，我就主动去说“无论如何都想为它做音乐”。并且，10年来我一直在想，这部漫画要是影视化的话应', 'direct', 2, now() - (interval '26 days' + interval '208 minutes')),
  (md5('seed-t04-17')::uuid, 't04', '星海旅人·18', '命运石之门（悬疑）   进击的巨人      我心里危险的东西（纯爱）', 'direct', 1, now() - (interval '27 days' + interval '221 minutes')),
  (md5('seed-t04-18')::uuid, 't04', '星海旅人·19', '刚刚问了ai，米津哪一首是在是在我生日发布的，问ai的时候刚好在听这一首，ai跳出来是这首歌我人都懵了很喜欢这首歌。', 'direct', 1, now() - (interval '28 days' + interval '234 minutes')),
  (md5('seed-t04-19')::uuid, 't04', '星海旅人·20', '就一个多小时的电影问来问去不如直接看', 'direct', 1, now() - (interval '29 days' + interval '247 minutes')),
  (md5('seed-t05-0')::uuid, 't05', '星海旅人·01', '绝大多数人都不知道豆瓣9.7分是什么概念
国产剧榜在章北海传前面的是【大明王朝】
动漫榜在章北海传前面的是【虹猫蓝兔七侠传】

把我两条科普顶上去，用数据说话
', 'direct', 42195, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t05-1')::uuid, 't05', '星海旅人·02', '章北海父亲：北海，要多想。
章北海：两千响够吗？
章北海父亲：？？？', 'direct', 32916, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t05-2')::uuid, 't05', '星海旅人·03', '人们在基座旁发现了一块小小的石碑，它几乎被野草完全埋没，上书：
　  红岸基地原址
　（1968-1987）
　　中国科学院
　　1989.03.21
　  碑', 'direct', 31305, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t05-3')::uuid, 't05', '星海旅人·04', '当流浪地球遇到三体舰队：
三体人：“你们去哪儿？”
地球人：“你们去哪儿？”
三体人：“半人马座三星环境太恶劣过不下去，我们要去太阳系。”
地球人：“太阳完了，', 'direct', 20829, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t05-4')::uuid, 't05', '星海旅人·05', '在小说的最后，归零者用157万种文明的语言向宇宙发送回归运动声明，说明到宇宙的最后，已经有157万文明达到可以制造小宇宙的水平，而其中竟然有地球文明的语言，说明', 'direct', 19060, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t05-5')::uuid, 't05', '星海旅人·06', '章北海：“成吉思汗的骑兵，攻击速度与20世纪的装甲部队相当；北宋的床弩，射程达一千五百米，与20世纪的狙击步枪差不多；但这些仍不过是古代的骑兵与弓弩而已，不可能', 'direct', 18554, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t05-6')::uuid, 't05', '星海旅人·07', '神游八方的《我的三体》就像脆弱的水滴一样，在艺画开天的《三体》动画组成的庞大的人类舰队面前不堪一击', 'direct', 15775, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t05-7')::uuid, 't05', '星海旅人·08', '地球人:我日
三体人:我晶', 'direct', 15514, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t05-8')::uuid, 't05', '星海旅人·09', '我们学校今天放了夜航星，我当时激动得跑到走廊上正准备喊一声前进四，结果下一秒就听到有人在楼下大喊：消灭人类暴政🤣🤣🤣', 'direct', 13906, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t05-9')::uuid, 't05', '星海旅人·10', '三体里最为残忍的一句话：我一个两百年前的古人，现在还在大学里教物理，还是最前沿的理论物理。', 'direct', 13873, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t05-10')::uuid, 't05', '星海旅人·11', '大家不要只看动漫！多看看小说吧，上次我的一个同学告诉我他才看完三体，我激动地给他说了句“冰冻罗非鱼”，他一脸懵逼的看着我，我顿时尴尬了', 'direct', 12785, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t05-11')::uuid, 't05', '星海旅人·12', '说一件只有老二次元才懂的事……
《章北海传》的硬币增速远高于《某科学的超电磁炮》', 'direct', 11901, now() - (interval '28 days' + interval '143 minutes')),
  (md5('seed-t05-12')::uuid, 't05', '星海旅人·13', '我觉得正确的拍摄姿势应该是这样的

不应该拍三体

应该先拍（以下片名不分拍摄顺序，先拍哪个都行）

电影《红岸往事》

电影《古筝行动》

短篇悬疑剧集《飞星', 'direct', 9867, now() - (interval '29 days' + interval '156 minutes')),
  (md5('seed-t05-13')::uuid, 't05', '星海旅人·14', '高中学校推荐看三体，很巧的是班里有个女生也叫程心，她每次写三体的读书笔记的时候都要骂一遍自己[大哭]', 'direct', 8785, now() - (interval '30 days' + interval '169 minutes')),
  (md5('seed-t05-14')::uuid, 't05', '星海旅人·15', '"孩子们啊，我这两个世纪前的人了，现在居然还能在大学里教物理。"他说完，转身离去', 'direct', 8191, now() - (interval '24 days' + interval '182 minutes')),
  (md5('seed-t05-15')::uuid, 't05', '星海旅人·16', '叶哲泰：在中国，任何超脱飞扬的思想都会砰然坠地，现实的引力太沉重了，章北海：我会藏着超脱飞扬的思想，忍辱负重的前进，直到按下前进四的按钮！', 'direct', 5, now() - (interval '25 days' + interval '195 minutes')),
  (md5('seed-t05-16')::uuid, 't05', '星海旅人·17', '章北海﹣人类眼中的叛逃者
维德﹣人类眼中的恶魔
罗辑﹣人类眼中的废物
叶文洁﹣人类眼中的叛徒
程心﹣人类眼中的天使
讽刺的是：
叛逃者留下来人类文明的火种
恶魔', 'direct', 4, now() - (interval '26 days' + interval '208 minutes')),
  (md5('seed-t05-17')::uuid, 't05', '星海旅人·18', '好喜欢这首曲子，本来还以为只是用来配视频剪辑的歌，原来是特意为北海作的，太贴了🥺', 'direct', 4, now() - (interval '27 days' + interval '221 minutes')),
  (md5('seed-t05-18')::uuid, 't05', '星海旅人·19', '三体完结原因：某人枪法太差', 'direct', 3, now() - (interval '28 days' + interval '234 minutes')),
  (md5('seed-t05-19')::uuid, 't05', '星海旅人·20', '——“亚洲舰队，蓝色空间号！”
——“北美舰队，企业号！”
——“亚洲舰队，深空号！”
——“欧洲舰队，终极规律号！”
——“亚洲舰队，自然选择号！前辈，您为人', 'direct', 2, now() - (interval '29 days' + interval '247 minutes')),
  (md5('seed-t06-0')::uuid, 't06', '星海旅人·01', '我们的生活是无聊的电影 没有感情 也没有表情 一想到生命迅速流逝 而我却没有真正生活过 我就无法忍受。', 'direct', 109, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t06-1')::uuid, 't06', '星海旅人·02', '画家乐队祝大家新年快乐[爱心]', 'direct', 52, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t06-2')::uuid, 't06', '星海旅人·03', '一直认为后摇是一种器乐的狂欢，它让人沉浸，让人迷醉，如歌名一般，宛如一颗星辰，沉淀、坠落，在不起眼的地方遨游，十分精巧的编曲，仿佛将人带入电影世界，将人的情绪一', 'direct', 45, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t06-3')::uuid, 't06', '星海旅人·04', '但是别人就喜欢这个电影该怎么办呢？做音乐不取悦任何人。', 'direct', 20, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t06-4')::uuid, 't06', '星海旅人·05', '新歌月底发布 敬请期待⭐', 'direct', 20, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t06-5')::uuid, 't06', '星海旅人·06', '为了等待一专二专实体专辑的制作，为了让这次巡演变得更加完整，原定于五月中旬的全国巡演延至九月初进行，一个完美的时间[认可]现场见。', 'direct', 4, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t06-6')::uuid, 't06', '星海旅人·07', '名为宏大的悲伤，像蓝宝石一样的月亮
在每个夏天萦绕，在每个秋天回响
七月一日星期二，晚上的太阳死了
鸟儿啊，请你不要再死了
噬咬那轮月亮，终曲时洒下残缺的月光', 'direct', 4, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t06-7')::uuid, 't06', '星海旅人·08', '这么嚎听的瘾乐出现在我的日！推！里！', 'direct', 4, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t06-8')::uuid, 't06', '星海旅人·09', '2025.12.16/20：00 画家乐队第二张全长专辑正式发布！', 'direct', 3, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t06-9')::uuid, 't06', '星海旅人·10', '画家近期活动：
6/20北京 疆进酒
6/27天漠音乐节
7/12 北京 福浪（均已秀动开票🎫）[爱心]', 'direct', 3, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t06-10')::uuid, 't06', '星海旅人·11', '中间那段间奏真好听啊', 'direct', 2, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t06-11')::uuid, 't06', '星海旅人·12', '刚听到了这首歌的现场版，意境太震撼了，期待巡演见！', 'direct', 1, now() - (interval '28 days' + interval '143 minutes')),
  (md5('seed-t06-12')::uuid, 't06', '星海旅人·13', '这个月就要听到专辑试听会啦[认可]', 'direct', 1, now() - (interval '29 days' + interval '156 minutes')),
  (md5('seed-t06-13')::uuid, 't06', '星海旅人·14', '中间的那段旋律太好听了', 'direct', 1, now() - (interval '30 days' + interval '169 minutes')),
  (md5('seed-t06-14')::uuid, 't06', '星海旅人·15', '希望今年再看一次画家', 'direct', 1, now() - (interval '24 days' + interval '182 minutes')),
  (md5('seed-t06-15')::uuid, 't06', '星海旅人·16', 'happiness[叉]Sadness⭕️', 'direct', 1, now() - (interval '25 days' + interval '195 minutes')),
  (md5('seed-t06-16')::uuid, 't06', '星海旅人·17', '“Mon chéri, petite étoile. ”', 'direct', 0, now() - (interval '26 days' + interval '208 minutes')),
  (md5('seed-t06-17')::uuid, 't06', '星海旅人·18', '真好 真希望能在更大的舞台上见到你们', 'direct', 0, now() - (interval '27 days' + interval '221 minutes')),
  (md5('seed-t06-18')::uuid, 't06', '星海旅人·19', '2026年6.7打卡', 'direct', 0, now() - (interval '28 days' + interval '234 minutes')),
  (md5('seed-t06-19')::uuid, 't06', '星海旅人·20', '开学了可以在大学的城市见[认可]', 'direct', 0, now() - (interval '29 days' + interval '247 minutes')),
  (md5('seed-t07-0')::uuid, 't07', '星海旅人·01', '星空总是这样明洁，像极了最初的你。', 'direct', 179398, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t07-1')::uuid, 't07', '星海旅人·02', '每次听音乐看评论，都像是在批奏折', 'direct', 164402, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t07-2')::uuid, 't07', '星海旅人·03', '我对星星说：“你真好看w”
然后它闪了闪

这是什么意思啊qwq
我听不懂星星说话啊qvq
闪一闪是在说什么嘛q△q
我听不懂啦q︿q
谁来翻译一下了啦quq', 'direct', 90267, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t07-3')::uuid, 't07', '星海旅人·04', '它在说，你也很可爱啊', 'direct', 45249, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t07-4')::uuid, 't07', '星海旅人·05', '你能听到我内心的声音吗。
没有微弱的呐喊，甚至连出声的机会都没有。
你知道星空下的海和一望无际的你一样吗？
像是人心的无底洞，像是被风拂过的绿草。
也不想接受一', 'direct', 29644, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t07-5')::uuid, 't07', '星海旅人·06', '小时候，我以为裙子只能夏天穿，冬天就必须把自己裹的像个粽子，我也以为只要自己善良，对待一个人的时候全心全意去对待，就会被对方同样对待。可是后来长大了才明白，原来', 'direct', 24866, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t07-6')::uuid, 't07', '星海旅人·07', '汝内心之音者，发自心间，顺于血脉，流淌至身。若无垠之萍，无晨曦明月之星空，或尝受欺者，亦无其过耳。若前沿坦途，饮马碎花，何故曰其人生。耐凡人所不耐，期常人之未所', 'direct', 23053, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t07-7')::uuid, 't07', '星海旅人·08', '星空之所以美丽，就是因为在无限的宇宙中，不管黑暗如何蔓延，都有星星的光芒去把它照亮。 世界也是这样，有绝望的地方，就会有希望产生', 'direct', 22801, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t07-8')::uuid, 't07', '星海旅人·09', '发现只要把赞点两下，就会给你一个抱抱', 'direct', 17857, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t07-9')::uuid, 't07', '星海旅人·10', '因为无法取得原封面画师的授权，更换了专辑封面。希望大家尽量少一些比较，可能原来的封面会有一些个人和时间滤镜，但每张图都是很好的，最重要的是每个人心中的画面。', 'direct', 17274, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t07-10')::uuid, 't07', '星海旅人·11', '它在说：“你也很好看”
但是你不知道呀
于是它再抖了一下
可是你还是歪着头不懂
它着急的跳动着
闪闪的星光在夜空温柔的眼波里跳跃着
算啦
你听不懂也没事
反正你', 'direct', 15985, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t07-11')::uuid, 't07', '星海旅人·12', '“看见天上的星星了吗？我打排位掉的”', 'direct', 12175, now() - (interval '28 days' + interval '143 minutes')),
  (md5('seed-t07-12')::uuid, 't07', '星海旅人·13', '朕，已阅[多多耍酷]', 'direct', 11478, now() - (interval '29 days' + interval '156 minutes')),
  (md5('seed-t07-13')::uuid, 't07', '星海旅人·14', '一个男孩子喜欢听星茶会 意味着什么？🤔', 'direct', 10411, now() - (interval '30 days' + interval '169 minutes')),
  (md5('seed-t07-14')::uuid, 't07', '星海旅人·15', '小时候经常在电视上放星茶会，然后在趴在桌子上写作业，可以说这首歌是我童年的一部分，但是上了初中后就没有时间听了，慢慢忘了歌名，但是有时会想起它，想起那大概的旋律', 'direct', 5, now() - (interval '24 days' + interval '182 minutes')),
  (md5('seed-t07-15')::uuid, 't07', '星海旅人·16', '你笑起来好可爱 我想让你一直这么天真', 'direct', 5, now() - (interval '25 days' + interval '195 minutes')),
  (md5('seed-t07-16')::uuid, 't07', '星海旅人·17', '好听，到底是谁的小众歌单', 'direct', 4, now() - (interval '26 days' + interval '208 minutes')),
  (md5('seed-t07-17')::uuid, 't07', '星海旅人·18', '有幸在烂梗前早早认识了你
所以……纯音乐出圈
到底是幸运，还是无妄之灾呢……', 'direct', 3, now() - (interval '27 days' + interval '221 minutes')),
  (md5('seed-t07-18')::uuid, 't07', '星海旅人·19', '它的热梗是:灌伤害，骗骗花', 'direct', 2, now() - (interval '28 days' + interval '234 minutes')),
  (md5('seed-t07-19')::uuid, 't07', '星海旅人·20', '其实我更多是在b站上面看动漫解说，然后认识了这首歌。', 'direct', 2, now() - (interval '29 days' + interval '247 minutes')),
  (md5('seed-t10-0')::uuid, 't10', '星海旅人·01', '在学日语的时候有个女生和我说，你是乔舒亚的话我就是艾斯蒂尔，我说我可不记得圣经里有这个名字，她说没关系啊，我可以你的艾斯蒂尔，慢慢你就认识了。一年后，我接触了空', 'direct', 24188, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t10-1')::uuid, 't10', '星海旅人·02', '我咋就不明白为啥你们故事就这么多呢[撇嘴]', 'direct', 21566, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t10-2')::uuid, 't10', '星海旅人·03', '空轨让我第一次见识了日式rpg的魅力：没有特别震撼的剧情，没有刻意的生离死别，如同细水长流，玩的时候还略嫌拖沓，可是当片尾曲响起的时候，却感动的说不出话', 'direct', 7071, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t10-3')::uuid, 't10', '星海旅人·04', '这首歌让我想起了当年......等等 我好像没有故事😭', 'direct', 6426, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t10-4')::uuid, 't10', '星海旅人·05', '看到最后我放下了手上的汽油。', 'direct', 5985, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t10-5')::uuid, 't10', '星海旅人·06', '为了这首歌曲，而买了口琴的举手。', 'direct', 4710, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t10-6')::uuid, 't10', '星海旅人·07', '"君の影 星のように
朝に溶けて消えていく"

你妹啊，这歌词原来写得真么带感！！！ 随便捡首小小Falcom游戏的曲子都这么用心，无语了。
国内浮躁的艺人们，', 'direct', 4391, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t10-7')::uuid, 't10', '星海旅人·08', '曾经是在妹子的推荐之下，玩了这游戏，一口气打完3章。学会了珍惜眼前人。现在学会日语留了学，当年推荐我游戏的妹子已嫁作他人妇。大概这就是错过吧。', 'direct', 3036, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t10-8')::uuid, 't10', '星海旅人·09', '这首歌是一部名叫《空之轨迹》的游戏的插曲。而约舒亚(乔舒亚)与艾斯蒂尔是这里面的男女主角。', 'direct', 2103, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t10-9')::uuid, 't10', '星海旅人·10', '活了二十三年连女生手都没碰过，看到泡椒凤爪都觉得白嫩细腻舍不得吃。所以我只是来听歌的，没有故事讲给你听。[撇嘴]', 'direct', 1783, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t10-10')::uuid, 't10', '星海旅人·11', '想起以前玩空轨哭的一塌糊涂…那时还在上中学，完完整整的玩完了整个fc和sc。自认为各种类型游戏玩了有几百，却再没有几个主人公能让我印象如此深刻…而如今是一个马上', 'direct', 1524, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t10-11')::uuid, 't10', '星海旅人·12', '#龙猪爱音乐# 每日推荐', 'direct', 740, now() - (interval '28 days' + interval '143 minutes')),
  (md5('seed-t10-12')::uuid, 't10', '星海旅人·13', '有次在房间里外放《星之所在》，我妈突然推门进来，第一句话就是“怎么十年了你还在听这首歌？”', 'direct', 701, now() - (interval '29 days' + interval '156 minutes')),
  (md5('seed-t10-13')::uuid, 't10', '星海旅人·14', '这兄弟就一个女粉丝 点开之后用户不存在 我眼泪直接就下来了 真心话', 'direct', 605, now() - (interval '30 days' + interval '169 minutes')),
  (md5('seed-t10-14')::uuid, 't10', '星海旅人·15', '看了评论发现这是一首暴击单身狗的曲子', 'direct', 600, now() - (interval '24 days' + interval '182 minutes')),
  (md5('seed-t10-15')::uuid, 't10', '星海旅人·16', '重置版入坑…期待今年2的重制啊啊啊啊啊我是没能想到rpg居然会断在这么离奇的地方！321开始咏唱：

僕のエステル、お日様みたいに眩しかった君。
君と一緒にいて', 'direct', 7, now() - (interval '25 days' + interval '195 minutes')),
  (md5('seed-t10-16')::uuid, 't10', '星海旅人·17', '感谢在几十年后的今天轨迹能够重置，给我了入坑的机会，年纪小了看不懂，年纪大了觉得矫情，轨迹系列是你在合适的年龄遇见的白月光，我想我就是在合适的年龄能玩上轨迹的', 'direct', 4, now() - (interval '26 days' + interval '208 minutes')),
  (md5('seed-t10-17')::uuid, 't10', '星海旅人·18', '顶级阳谋，我真的要买9月17日发售的2重制版了，小艾小约你们一定要幸福啊😭😭', 'direct', 3, now() - (interval '27 days' + interval '221 minutes')),
  (md5('seed-t10-18')::uuid, 't10', '星海旅人·19', '刚刚梦中又回到了高中时期，阳光明媚，风景正好，正在听这首歌，我很清楚知道这就是梦，但是不想醒过来。如果这是宇宙中的另一个我，希望他的未来能和梦中窗外的景色一样美', 'direct', 3, now() - (interval '28 days' + interval '234 minutes')),
  (md5('seed-t10-19')::uuid, 't10', '星海旅人·20', '空轨1st你们玩了吗，我想起来了，我想起来了，我的童年原来还在', 'direct', 2, now() - (interval '29 days' + interval '247 minutes')),
  (md5('seed-t11-0')::uuid, 't11', '星海旅人·01', '太喜欢了，说和弦没有变的宝宝。本来深海的钢琴曲跟演唱处理不同，这里需要更平稳平静的情绪，演唱里副歌的高潮变成了，休止后，更温柔的处理。
这种改变，我更喜欢这种简', 'direct', 9, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t11-1')::uuid, 't11', '星海旅人·02', '献给度过漫漫长夜的你', 'direct', 5, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t11-2')::uuid, 't11', '星海旅人·03', '南河可以是一本书，一场电影，一阵微风，温暖的阳光或者短暂的陪伴，我的意思是，你已经遇见过了。如果你把南河定义为一个现生存在的人，那也可以是你自己，千千万万次救你', 'direct', 2, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t11-3')::uuid, 't11', '星海旅人·04', '每次这个旋律一响起来 我真的仿佛就能听到参宿在海里边寻找边喊着 是那种稚嫩又急切的声音 一遍又一遍地呼唤着“南河”', 'direct', 2, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t11-4')::uuid, 't11', '星海旅人·05', '我也想 能陪你一起走啊
直到这世界崩塌
可是啊 走过长夜的你
不再需要被牵挂', 'direct', 1, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t11-5')::uuid, 't11', '星海旅人·06', '怎么办，我真的好想亖，我也不知道为什么，时不时晚上我就睡不着，想哭，莫名其妙的哭', 'direct', 1, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t11-6')::uuid, 't11', '星海旅人·07', '我会遇见属于我的南河吗？', 'direct', 1, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t11-7')::uuid, 't11', '星海旅人·08', '心有千千结，那不如系个蝴蝶结。', 'direct', 0, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t11-8')::uuid, 't11', '星海旅人·09', '如果有缘分的话，该相逢的人能再相逢。', 'direct', 0, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t11-9')::uuid, 't11', '星海旅人·10', '正值毕业季，以此句：追风而行，风之尽头亦有光影✨赠予你～', 'direct', 0, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t11-10')::uuid, 't11', '星海旅人·11', '再晚一点吧，分别再晚一点到来吧…', 'direct', 0, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t12-0')::uuid, 't12', '星海旅人·01', '啦 啦 啦啦 啦啦啦！ 啦 啦 啦啦 啦啦啦！听到这个就想起那群在演唱会现场的死宅们的呼喊的声音，挥舞着葱绿荧光棒，其实我也成为其中一个[流泪]', 'direct', 3541, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t12-1')::uuid, 't12', '星海旅人·02', '我觉得这首神曲人少的原因可能是搜melt搜不到😂', 'direct', 2422, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t12-2')::uuid, 't12', '星海旅人·03', '想起39祭上现场合唱起来的lalala~瞬间就激动得起鸡皮疙瘩[大哭]', 'direct', 1690, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t12-3')::uuid, 't12', '星海旅人·04', '最喜欢初音的一首歌，一直在找melt，结果是日文名字。。。', 'direct', 1369, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t12-4')::uuid, 't12', '星海旅人·05', '“一千万再生！像作梦一样～！非常感谢。”
——ryo在1000万时的留言', 'direct', 842, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t12-5')::uuid, 't12', '星海旅人·06', '同样，这首歌评论的易友头像全是二次元[大哭]', 'direct', 783, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t12-6')::uuid, 't12', '星海旅人·07', '10年的感谢祭这首歌唱完就泪目', 'direct', 579, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t12-7')::uuid, 't12', '星海旅人·08', '第一次听时莫名流泪[流泪]', 'direct', 406, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t12-8')::uuid, 't12', '星海旅人·09', 'ryo心里miku是有很重要的意义的，而他更想展示自己，不能说他完全离开了，只能衷心期待ryo的名字再次出现在“初音ミク”的旁边，请大家不要再指责他了。', 'direct', 370, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t12-9')::uuid, 't12', '星海旅人·10', '今天日推是una唱的melt，当时简直惊为天人啊……然后回来，嗯，果然我还是喜欢miku的歌，那话怎么说的来着？流水的老婆，铁打的初音', 'direct', 196, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t12-10')::uuid, 't12', '星海旅人·11', 'melt的意思是 融化般的温柔。', 'direct', 107, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t12-11')::uuid, 't12', '星海旅人·12', 'kz的电音miku，doriko的抒情miku，MM的人声miku，deco的感恩miku，40mp的可爱miku，ryo的公主殿下~', 'direct', 106, now() - (interval '28 days' + interval '143 minutes')),
  (md5('seed-t12-12')::uuid, 't12', '星海旅人·13', '不是这样的吧，supercell一直就有。他只是走了而已。之前的好多p主都是，但是好歹wowaka,hachi他们十周年时都有创作，ryo也许真的是odds&e', 'direct', 103, now() - (interval '29 days' + interval '156 minutes')),
  (md5('seed-t12-13')::uuid, 't12', '星海旅人·14', '太真实了⑧，几年前听的，今天上课突然就哼出来了[大哭]回来想搜然后意识到我不知道该搜什么，又不会打日文，只记得歌名的样子2333，去歌手页一个一个找出来的', 'direct', 93, now() - (interval '30 days' + interval '169 minutes')),
  (md5('seed-t12-14')::uuid, 't12', '星海旅人·15', '前几天v家受喜爱前100的术曲排名出来了 这歌实至名归的术曲Top1 比千本樱还要高 都是葱葱人的爱和青春阿😭', 'direct', 77, now() - (interval '24 days' + interval '182 minutes')),
  (md5('seed-t12-15')::uuid, 't12', '星海旅人·16', '以前的p主赋予了初音灵魂，现在的p主是用初音唱自己的作品，还是老歌有感觉啊', 'direct', 13, now() - (interval '25 days' + interval '195 minutes')),
  (md5('seed-t12-16')::uuid, 't12', '星海旅人·17', '听了一圈发现，最喜欢还是公主早期这些歌', 'direct', 9, now() - (interval '26 days' + interval '208 minutes')),
  (md5('seed-t12-17')::uuid, 't12', '星海旅人·18', 'melt放在最后一首真的爆哭，好幸福的夜晚', 'direct', 7, now() - (interval '27 days' + interval '221 minutes')),
  (md5('seed-t12-18')::uuid, 't12', '星海旅人·19', '2025mwy结束回来继续回味😭😭', 'direct', 6, now() - (interval '28 days' + interval '234 minutes')),
  (md5('seed-t12-19')::uuid, 't12', '星海旅人·20', '前奏响起的一瞬间，眼泪跟着下来了，是什么魔力能让我在这个年纪在场馆流下眼泪呢?', 'direct', 5, now() - (interval '29 days' + interval '247 minutes')),
  (md5('seed-t13-0')::uuid, 't13', '星海旅人·01', '樱花落下的速度是每秒五厘米， 我该用怎么样的速度，才能与你相遇。

雨滴降落的速度是每秒十米，我该用怎么样的速度，才能将你挽留。

陨石坠落的速度是每秒十千米，', 'direct', 445614, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t13-1')::uuid, 't13', '星海旅人·02', '疯狂支持，去年陪你看你的名字的他，今年还在你的身边吗？动画电影《升起的烟花，从下面看？还是从侧面看？》改编自岩井俊二导演的同名电视短片，由新房昭之担任纲总导演，', 'direct', 389627, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t13-2')::uuid, 't13', '星海旅人·03', '身着浴衣和服的男男女女，抬头仰望夜空、绚烂的烟火、灿烂的笑容，定格成日本夏日最美好的一瞬间。🎎🎏🎆🎇一直很憧憬11区这样的场景。。。升空的焰火，从下面看还是从侧', 'direct', 249128, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t13-3')::uuid, 't13', '星海旅人·04', '记得自己两年前跟着旅游团去日本。那是2015的七月份，天气很热，我和全车的人在日本跟着导游瞎逛，停留最长的时间总是鸡零狗碎的购物中心。那天因为堵车再高速上停留到', 'direct', 138326, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t13-4')::uuid, 't13', '星海旅人·05', '那天带上我喜欢的女孩子去电影院看了《烟花》，看完后我们都沉默着，她在前面走我在后面跟着，走着走着回头对我说：“我们做好朋友挺好的”我没有看她，低着头说了句：”嗯', 'direct', 105949, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t13-5')::uuid, 't13', '星海旅人·06', '升空的焰火到底要从哪一个方向看？不论是从下面看还是从侧面看，不论是在现实还是在梦境中，只要和你一起看就好[爱心]', 'direct', 96014, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t13-6')::uuid, 't13', '星海旅人·07', '朋友说有一个细节特别用心，男主比女主矮一点，因为青春期的女孩子比男孩子发育的快', 'direct', 91505, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t13-7')::uuid, 't13', '星海旅人·08', '“什么时候最孤独？”                                  “盛世烟火由你而放，他们都在看烟花，无人想起你”', 'direct', 90622, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t13-8')::uuid, 't13', '星海旅人·09', '很喜欢一句话:
我不会去考什么清华北大
也不会为了考第一
而半夜打手电学习
我只希望我高中生活有喜欢的人，喜欢的事
有健康的身体，有无悔的每一天
然后尽我最大的', 'direct', 72261, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t13-9')::uuid, 't13', '星海旅人·10', '学日语大多是看动漫的
学韩语大多数追星的
学法语大多是装文艺的
而学英语就厉害了
大多是被逼的...', 'direct', 53755, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t13-10')::uuid, 't13', '星海旅人·11', '呐，你知道吗？樱花下落的速度是秒速五厘米，是RPG最高速度的六千分之一。紧靠在一起的两颗心，会在200米的距离内，被TBG-7V空爆燃烧弹烧成焦炭。世界上没有什', 'direct', 52689, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t13-11')::uuid, 't13', '星海旅人·12', '奈砂：广濑铃
典道：菅田将晖
佑介：宫野真守
奈砂母：松隆子
三浦老师：花泽香菜
纯一：浅沼晋太郎
和弘：丰永利行
稔：梶裕贵。     卡司好强大！连主题曲都', 'direct', 49692, now() - (interval '28 days' + interval '143 minutes')),
  (md5('seed-t13-12')::uuid, 't13', '星海旅人·13', '中考倒计时208

——2019届中考生

愿此去前程似锦，
万事顺意。
2019年六月的某天，
超常发挥。
明年穿着重点高中的校服回来看老班。', 'direct', 41416, now() - (interval '29 days' + interval '156 minutes')),
  (md5('seed-t13-13')::uuid, 't13', '星海旅人·14', '当初为了听这个真是疯狂循环mv', 'direct', 39219, now() - (interval '30 days' + interval '169 minutes')),
  (md5('seed-t13-14')::uuid, 't13', '星海旅人·15', '在手机上看了很多日本的烟花大会，如果中国也可以就好了，穿着汉服，看烟火，放孔明灯，放河灯，逛集市，那多好啊，可是，再也看不到了吧……', 'direct', 35094, now() - (interval '24 days' + interval '182 minutes')),
  (md5('seed-t13-15')::uuid, 't13', '星海旅人·16', '你好丫，陌生人，希望你能天天开心，再无烦恼。
刷到这条的朋友，把烦恼留在这首歌里，往后只剩好运。
若是你刚好觉得这段话还算温暖，一个小小的点赞，就能让我开心好一', 'direct', 2, now() - (interval '25 days' + interval '195 minutes')),
  (md5('seed-t13-16')::uuid, 't13', '星海旅人·17', '祝我中考能考上一个理想高中---写于二零二六年八月三日', 'direct', 1, now() - (interval '26 days' + interval '208 minutes')),
  (md5('seed-t13-17')::uuid, 't13', '星海旅人·18', '终止错过美好梦幻失败', 'direct', 1, now() - (interval '27 days' + interval '221 minutes')),
  (md5('seed-t13-18')::uuid, 't13', '星海旅人·19', '“他们讨厌你好像只是因为你的国籍。”(╥_╥)', 'direct', 1, now() - (interval '28 days' + interval '234 minutes')),
  (md5('seed-t13-19')::uuid, 't13', '星海旅人·20', '一个小心心你考试多得10分', 'direct', 0, now() - (interval '29 days' + interval '247 minutes')),
  (md5('seed-t15-0')::uuid, 't15', '星海旅人·01', '孟婆桥边，一个男孩正在喝孟婆汤，孟婆说：你已经喝了18碗了，到底还有什么忘不掉？男孩凑到孟婆的耳边开口唱了起来：ロキロキのロックンロックンロール', 'direct', 1731, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t15-1')::uuid, 't15', '星海旅人·02', '要问你术力口2018代表作，口丰还是有排面的
米奇头🐮🍺', 'direct', 1475, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t15-2')::uuid, 't15', '星海旅人·03', '口丰口丰丿口一刀二口一刀二口一儿', 'direct', 925, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t15-3')::uuid, 't15', '星海旅人·04', '2018年2月27日，投稿了《ロキ》。这首歌曲以令人印象深刻的曲风，带感的节奏，在短时间内获得了大量人气。歌曲在发布后连续两天都排在N站Vocaloid类视频的', 'direct', 629, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t15-4')::uuid, 't15', '星海旅人·05', '隔壁熱評的友情提示:副歌前的“怒音”（比如1:53处）使用的是Vocaloid4的最新特有机能“嘶吼（growl）”参数哦。', 'direct', 462, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t15-5')::uuid, 't15', '星海旅人·06', '总感觉mikito的声音比起铃来说有一点小受……', 'direct', 422, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t15-6')::uuid, 't15', '星海旅人·07', '以前我看到这首歌就会读“roki ”，但是吧毒瘤们天天“口丰口丰”，现在我也“口丰”了[大哭][大哭]', 'direct', 358, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t15-7')::uuid, 't15', '星海旅人·08', '哈哈哈哈哈哈哈哈哈哈哈哈哈哈君日本语本当上手', 'direct', 220, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t15-8')::uuid, 't15', '星海旅人·09', 'Don''t stop! Don''t stop!', 'direct', 133, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t15-9')::uuid, 't15', '星海旅人·10', '镜音这个p主太厉害了能调教出大叔音（', 'direct', 122, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t15-10')::uuid, 't15', '星海旅人·11', '！？什么大实话，在大声点说出来', 'direct', 104, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t15-11')::uuid, 't15', '星海旅人·12', '口丰是什么鬼emmm', 'direct', 101, now() - (interval '28 days' + interval '143 minutes')),
  (md5('seed-t15-12')::uuid, 't15', '星海旅人·13', '你怎么不说术力口呢（滑稽）', 'direct', 82, now() - (interval '29 days' + interval '156 minutes')),
  (md5('seed-t15-13')::uuid, 't15', '星海旅人·14', '然后孟婆开始给自己猛灌孟婆汤', 'direct', 81, now() - (interval '30 days' + interval '169 minutes')),
  (md5('seed-t15-14')::uuid, 't15', '星海旅人·15', '自信一点，把“总感觉”三个字删了', 'direct', 74, now() - (interval '24 days' + interval '182 minutes')),
  (md5('seed-t15-15')::uuid, 't15', '星海旅人·16', '打算六一跳这个舞，和姐妹排练时被老师看到了，老师夸我们好有活力[爱心]', 'direct', 11, now() - (interval '25 days' + interval '195 minutes')),
  (md5('seed-t15-16')::uuid, 't15', '星海旅人·17', '现在还有人在听嘛[多多可怜]', 'direct', 7, now() - (interval '26 days' + interval '208 minutes')),
  (md5('seed-t15-17')::uuid, 't15', '星海旅人·18', '额等等，那我赞的那首是啥[惊恐]', 'direct', 6, now() - (interval '27 days' + interval '221 minutes')),
  (md5('seed-t15-18')::uuid, 't15', '星海旅人·19', '孟婆桥边，一个男孩正在喝孟婆汤，孟婆说：你已经喝了18碗了，到底还有什么忘不掉？男孩凑到孟婆的耳边开口唱了起来：ロキロキのロックンロックンロール', 'direct', 5, now() - (interval '28 days' + interval '234 minutes')),
  (md5('seed-t15-19')::uuid, 't15', '星海旅人·20', '⚡小心点别死了🥴彼此彼此💢（劲爆怒音）⚡
⚡Roki⚡Roki Rock''n⚡Rock''n Roll⚡
⚡😎肤浅幼稚的情歌也无所谓😎⚡
⚡Don''t Stop⚡', 'direct', 4, now() - (interval '29 days' + interval '247 minutes')),
  (md5('seed-t18-0')::uuid, 't18', '星海旅人·01', '《别去管那个绿油油的家伙了》哈哈哈这是初音嘛', 'direct', 2202, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t18-1')::uuid, 't18', '星海旅人·02', '啊.....好像是没有准确的设定，双胞胎.伴侣.朋友等设定都是为了创作者有更好的发挥空间（像我是吃双胞胎＋伴侣的骨科设定的说', 'direct', 1725, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t18-2')::uuid, 't18', '星海旅人·03', '同学：知道镜音连吗？
我：知道啊
同学：他和镜音铃可甜了！
我：WTF？
同学：你现充啊
我：他俩不是双胞胎吗？（质疑自己是个现充） （登录维基百科）（搜索）', 'direct', 1535, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t18-3')::uuid, 't18', '星海旅人·04', '问区别的，是另一首最后一句歌词【魔法未来】和这版【有爱的时代】，的区别', 'direct', 1225, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t18-4')::uuid, 't18', '星海旅人·05', '恭喜喵斯快跑收录这首歌！', 'direct', 1208, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t18-5')::uuid, 't18', '星海旅人·06', '这翻译内味儿太冲力（（（', 'direct', 1098, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t18-6')::uuid, 't18', '星海旅人·07', '其实宅在家里很容易抑郁 多出去走走 可以跳跳楼 跳跳海 撞撞汽车 人生有很多选择🙄💅', 'direct', 1080, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t18-7')::uuid, 't18', '星海旅人·08', '官方最早有姐弟设定，后面为了方便二创把这个设定删掉了，伴侣双生等都是可以的', 'direct', 984, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t18-8')::uuid, 't18', '星海旅人·09', '这个翻译我觉得太一言难尽了……其实正常那么翻译就挺好的……[多多捂脸]  歌无论听多少遍都觉得很好听呢', 'direct', 853, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t18-9')::uuid, 't18', '星海旅人·10', '听说这首在当时现场的热度超过了初音
然后热度还被压下来了', 'direct', 840, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t18-10')::uuid, 't18', '星海旅人·11', '原来叫劣等上等吗？我一直以为叫劣质上等', 'direct', 763, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t18-11')::uuid, 't18', '星海旅人·12', '啊啊那我真是记忆还停留在过去[多多捂脸][多多捂脸]我一直记得是姐弟来着虽然这不妨碍我大磕特磕[大哭][大哭]', 'direct', 426, now() - (interval '28 days' + interval '143 minutes')),
  (md5('seed-t18-12')::uuid, 't18', '星海旅人·13', '神呐，。。前面这翻译也太本土化了。。。这是评论区把翻译的给惹毛了吧[多多捂脸][多多捂脸][多多捂脸]', 'direct', 321, now() - (interval '29 days' + interval '156 minutes')),
  (md5('seed-t18-13')::uuid, 't18', '星海旅人·14', '会——场——烧——开——啦——', 'direct', 290, now() - (interval '30 days' + interval '169 minutes')),
  (md5('seed-t18-14')::uuid, 't18', '星海旅人·15', '这么有力气的歌 镜音双子合唱更是夯爆了 但怎么感觉很少有人听🤔', 'direct', 7, now() - (interval '24 days' + interval '182 minutes')),
  (md5('seed-t18-15')::uuid, 't18', '星海旅人·16', '真的不冷 这歌上过18年魔法未来', 'direct', 2, now() - (interval '25 days' + interval '195 minutes')),
  (md5('seed-t18-16')::uuid, 't18', '星海旅人·17', 'pjsk这个给我打爽了🙌', 'direct', 2, now() - (interval '26 days' + interval '208 minutes')),
  (md5('seed-t18-17')::uuid, 't18', '星海旅人·18', '利益至上  资本为王🤩🤩🤩', 'direct', 2, now() - (interval '27 days' + interval '221 minutes')),
  (md5('seed-t18-18')::uuid, 't18', '星海旅人·19', '好样的！就这么唱这歌有力气', 'direct', 1, now() - (interval '28 days' + interval '234 minutes')),
  (md5('seed-t18-19')::uuid, 't18', '星海旅人·20', '无意间刷到了El6的翻唱，，找到原唱之后发现格外熟悉。。找了好久，结果刷到了翻唱[难顶]不过翻唱也意味着好听MV好帅[装可爱]', 'direct', 1, now() - (interval '29 days' + interval '247 minutes')),
  (md5('seed-t19-0')::uuid, 't19', '星海旅人·01', '真正热爱祖国的年轻人，即便他们是日本动漫游戏的铁杆粉丝，他们也会在大是大非的问题面前维护自己国家的主权和民族尊严。而那些没有脊梁骨、双膝发软的人，即便他们对日本', 'direct', 94195, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t19-1')::uuid, 't19', '星海旅人·02', '歌词大赞，希望每个人都去理解一下歌词的深层意思，无论是中国人还是日本人', 'direct', 93694, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t19-2')::uuid, 't19', '星海旅人·03', '《千本樱》讽刺的是日本战争的疯狂，表示对带来黑暗生活的战争非常痛恨，也表现了人们渴望美好生活的愿望。歌曲里面反讽了战争是罪恶的，给人们带来了很多伤害，也毁灭了很', 'direct', 37088, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t19-3')::uuid, 't19', '星海旅人·04', '现在的人眼里：喜欢二次元=喜欢日本=不爱国', 'direct', 34733, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t19-4')::uuid, 't19', '星海旅人·05', '我们喜欢初音未来，我们喜欢日本文化，日本动漫，可是不代表我们喜欢日本政府，我们始终保持着大国的包容，兼容并包的接受所有有益的外来文化。排放核污水的不是日本民众，', 'direct', 29233, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t19-5')::uuid, 't19', '星海旅人·06', '我虽然每天都躺在床上看日漫傻笑。
但是我明白为什么我能悠闲的躺在床上看日漫。', 'direct', 25694, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t19-6')::uuid, 't19', '星海旅人·07', '但凡日本奥运会开幕式让初音来唱这个都不会至于那么阴间', 'direct', 22359, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t19-7')::uuid, 't19', '星海旅人·08', '兄弟们，别开枪了，这是自己人，这首歌属于暗讽，所以没有MV画面，只听歌词的话会以为她在洗白日本，但是这首歌的MV里细节很多，就比如那句光明磊落，反战国家，MV里', 'direct', 15533, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t19-8')::uuid, 't19', '星海旅人·09', '初音未来反了一辈子战，却败在了国籍上', 'direct', 13240, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t19-9')::uuid, 't19', '星海旅人·10', '这歌词既能按反战来理解 也能按支持战争来理解（霓虹国确实有这样理解的帖子） 作者自己也没有表过态 还是不要一厢情愿的好……', 'direct', 8969, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t19-10')::uuid, 't19', '星海旅人·11', '德国：我们对无休止的侵略感到羞耻。
日本：啥是二战？', 'direct', 8954, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t19-11')::uuid, 't19', '星海旅人·12', '“中国人民与日本人民是一致的，只有一个敌人，就是日本帝国主义与中国的民族败类。”', 'direct', 7367, now() - (interval '28 days' + interval '143 minutes')),
  (md5('seed-t19-12')::uuid, 't19', '星海旅人·13', '冷知识：千本樱是反战争歌曲', 'direct', 7364, now() - (interval '29 days' + interval '156 minutes')),
  (md5('seed-t19-13')::uuid, 't19', '星海旅人·14', '“好耶！日本战败了！"——滕子不二雄。', 'direct', 7195, now() - (interval '30 days' + interval '169 minutes')),
  (md5('seed-t19-14')::uuid, 't19', '星海旅人·15', '抗日是指抗日本鬼子不是抗正常人😋', 'direct', 6075, now() - (interval '24 days' + interval '182 minutes')),
  (md5('seed-t19-15')::uuid, 't19', '星海旅人·16', '千的意思是很多，成百上千。本是量词。樱代指樱花，樱花在歌曲中代表着战争中的逝者，MV中有许多的樱花特效，樱花上升也代表着逝者逝去转生。所以千本樱的意思大概是在战', 'direct', 4, now() - (interval '25 days' + interval '195 minutes')),
  (md5('seed-t19-16')::uuid, 't19', '星海旅人·17', '英文ICBM的意思是洲际弹道导弹，所以那一句其实是倒装句，意思是洲际弹道导弹让日本的极端右翼感到害怕退散', 'direct', 3, now() - (interval '26 days' + interval '208 minutes')),
  (md5('seed-t19-17')::uuid, 't19', '星海旅人·18', '《反战国家》（建议改为引战国家）', 'direct', 2, now() - (interval '27 days' + interval '221 minutes')),
  (md5('seed-t19-18')::uuid, 't19', '星海旅人·19', '什么时候他们才知道千本樱这首歌是爱国的歌呀', 'direct', 2, now() - (interval '28 days' + interval '234 minutes')),
  (md5('seed-t19-19')::uuid, 't19', '星海旅人·20', '十二年前的评论，顶一顶', 'direct', 1, now() - (interval '29 days' + interval '247 minutes')),
  (md5('seed-t21-0')::uuid, 't21', '星海旅人·01', '她对杀她的人的示意爱，这并不符合逻辑，因为没有人会对杀你的人温柔。所以可以推断出她在撒谎。而骗人的目的显然就是保护她门后的孩子不被灭口。如果她用语言激怒了杀人犯', 'direct', 47538, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t21-1')::uuid, 't21', '星海旅人·02', '初听这首歌时，我就觉得和之前YOASOBI的歌曲风格不太一样了，比起前几次出的歌曲，这首真的进步了很多。果然ayase从来没有让我失望过，你可以永远相信YOAS', 'direct', 40117, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t21-2')::uuid, 't21', '星海旅人·03', '这首OP真的神了，从一开始的无比自信的“爱”的谎言，活泼欢快但感觉到一丝违和，到中间的rap，对“爱”怀疑，歇斯底里，但在唱完阿库亚，露比和玛利亚后，突然又变得', 'direct', 34319, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t21-3')::uuid, 't21', '星海旅人·04', '“原来防盗门链是这么用的啊，孤儿院没教呢。”这句台词真的太好了。', 'direct', 25409, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t21-4')::uuid, 't21', '星海旅人·05', 'YOASOBI「アイドル (idol/偶像)」是基于赤坂アカ先生所作的小说为原作进行创作的动画OP。
ayase：我本来就是这部作品的“死忠粉”，收到创作主题曲', 'direct', 18363, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t21-5')::uuid, 't21', '星海旅人·06', '星野爱的童年经历大概整理一下，只能说，好惨一孩子，运气也不怎么好。
单亲家庭，经常挨打（出自动漫与漫画星野爱原话），有时候白饭里掺沙子，还有家暴的时候玻璃制品碎', 'direct', 17325, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t21-6')::uuid, 't21', '星海旅人·07', '希望兄妹能重新生出亲妈，我将称之为神作！', 'direct', 16265, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t21-7')::uuid, 't21', '星海旅人·08', '给大赤老师几个结局选择:
1.高尔夫结局——兄妹最后原谅亲生父亲
2.整大活结局——兄妹最后把爱生下来
3.大赤老师封神结局——兄妹和渣爹同归于尽，然后兄妹两和', 'direct', 13982, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t21-8')::uuid, 't21', '星海旅人·09', '“这首曲子如果没看过原作听会感觉只是一个贩卖幻想的完美偶像，甚至最后一句也是给粉丝的福利；但是看过原作会发现这首歌每句话都很符合本人故事，就是星野爱的一生。ay', 'direct', 11939, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t21-9')::uuid, 't21', '星海旅人·10', '这句话绝对不是谎言——「我爱你们」', 'direct', 11460, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t21-10')::uuid, 't21', '星海旅人·11', '虽然有点夹，但是攻击性拉满了。主角的真诚的一面，傲慢的一面，以及女团其他成员怨念的声音，三个声音组成了一首歌。', 'direct', 8988, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t21-11')::uuid, 't21', '星海旅人·12', 'ayase：我原本就是这部作品的粉丝，真的是那种在担当主题曲之前就已经私下试着写过曲子的程度的喜欢，这次就把我新写的曲子和之前写的合在一起，写成了这首歌。真的满', 'direct', 7502, now() - (interval '28 days' + interval '143 minutes')),
  (md5('seed-t21-12')::uuid, 't21', '星海旅人·13', '星野爱是吧，我知道诶！是最近非常火的偶像——据说马上就要上巨蛋表演了耶！', 'direct', 5715, now() - (interval '29 days' + interval '156 minutes')),
  (md5('seed-t21-13')::uuid, 't21', '星海旅人·14', '听完这首歌才去看的番，一开始不太理解星野爱的各种行为，但是慢慢发现她并非虚伪，撒谎、隐瞒都是不想让粉丝失望。她真的是想拥有亲人才生下两个孩子，非常爱自己的孩子，', 'direct', 5336, now() - (interval '30 days' + interval '169 minutes')),
  (md5('seed-t21-14')::uuid, 't21', '星海旅人·15', '意难平。。 明明爱刚刚准备学着接受生活，马上真正学会并且享受到她的名字“爱” 。就像是从崖底好不容易爬到悬崖顶 但在最后手抓住的那块石头碎掉了。就这么掉下去，摔', 'direct', 5289, now() - (interval '24 days' + interval '182 minutes')),
  (md5('seed-t21-15')::uuid, 't21', '星海旅人·16', '2026Ayase
的作曲质量还能倒退多久
看这以前的歌真是舍不得', 'direct', 3, now() - (interval '25 days' + interval '195 minutes')),
  (md5('seed-t21-16')::uuid, 't21', '星海旅人·17', '肘击超过 550 辆可能真实存在的二笔车，探索日本的绝美风光，在《Forza Hellrizon》有史以来最宏大的胡闹中成为终极干脆利落鱼雷传奇。😋', 'direct', 2, now() - (interval '26 days' + interval '208 minutes')),
  (md5('seed-t21-17')::uuid, 't21', '星海旅人·18', '我寻思着，哪家女歌手能女声说唱+女高音还能带一点夹子音[问号]
感觉已经超出人类范畴了

点开作者栏
原来是老资历[害怕]', 'direct', 2, now() - (interval '27 days' + interval '221 minutes')),
  (md5('seed-t21-18')::uuid, 't21', '星海旅人·19', '有人玩地平线6吗 比赛里面居然听到这首了', 'direct', 1, now() - (interval '28 days' + interval '234 minutes')),
  (md5('seed-t21-19')::uuid, 't21', '星海旅人·20', '地平线嘉年华听到这歌挺得劲的', 'direct', 1, now() - (interval '29 days' + interval '247 minutes')),
  (md5('seed-t23-0')::uuid, 't23', '星海旅人·01', '千万别，再美得曲子一旦做了闹铃你一定会厌烦的。', 'direct', 10509, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t23-1')::uuid, 't23', '星海旅人·02', '我记得当时看见她再次拿起扫把飞的时候，我竟然哭了…有种说不出的感动，突然想起了关于梦想关于勇敢的事情……我们却被现实压的喘不过气来。', 'direct', 8044, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t23-2')::uuid, 't23', '星海旅人·03', '魔女宅急便的结尾，琪琪即使重新学会了飞翔，却再也听不懂黑猫吉吉说的话了，琪琪成长了，可以和身边的朋友在一起了，不需要童年的黑猫安慰了。
成长很好，成长是要付出代', 'direct', 4416, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t23-3')::uuid, 't23', '星海旅人·04', '看见久石让就圆润的滚进来点赞了(*◑∇◑)爻(◐∇◐*)', 'direct', 3544, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t23-4')::uuid, 't23', '星海旅人·05', '如果睡觉之前对明天抱有万分的期待 那闹铃声就是天籁', 'direct', 3041, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t23-5')::uuid, 't23', '星海旅人·06', '刚刚看了久石让先生亲自指挥的音乐会，这首作为了安可曲！我当时都笑出声来了，joe桑指挥时，他像在跳舞一样哦~特别快乐的样子，真开心[可爱]', 'direct', 1717, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t23-6')::uuid, 't23', '星海旅人·07', '长大后住在了这个动画取景的城市 斯德哥尔摩', 'direct', 1645, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t23-7')::uuid, 't23', '星海旅人·08', '2017新年愿望、宫爷爷再出部动漫、久石让老爷子再做首曲子、会实现的对吧？', 'direct', 1267, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t23-8')::uuid, 't23', '星海旅人·09', '宫崎骏教会男孩要重感情，有责任心，教导女孩要勇敢，坚强，自立', 'direct', 1196, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t23-9')::uuid, 't23', '星海旅人·10', '刚用ukulele学会这首[呲牙]', 'direct', 808, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t23-10')::uuid, 't23', '星海旅人·11', '六七岁的时候超级喜欢琪琪。那时候放学回家的时候会对着天空打招呼。小学有一次写作文说设置一个节日，我写的是魔女节，结果被老师嘲笑了来着，趴在桌子上哭了好久。
时间', 'direct', 779, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t23-11')::uuid, 't23', '星海旅人·12', '这首歌很适合戴着耳机在地铁上观察人类', 'direct', 770, now() - (interval '28 days' + interval '143 minutes')),
  (md5('seed-t23-12')::uuid, 't23', '星海旅人·13', '心情差的时候看看宫崎骏就好了～男鹿和雄的场景真心是神笔', 'direct', 720, now() - (interval '29 days' + interval '156 minutes')),
  (md5('seed-t23-13')::uuid, 't23', '星海旅人·14', '宫崎骏先生笔下的女性才是真·女权，劳动自强的女性最美丽', 'direct', 684, now() - (interval '30 days' + interval '169 minutes')),
  (md5('seed-t23-14')::uuid, 't23', '星海旅人·15', '琪琪和吉吉从小一起长大、心灵相通所以能交流，后来吉吉有了自己的家庭，琪琪有了新的生活，他们的生活轨迹不再重合便也不能再交流。就像曾经无话不谈的发小，阔别再重逢后', 'direct', 613, now() - (interval '24 days' + interval '182 minutes')),
  (md5('seed-t23-15')::uuid, 't23', '星海旅人·16', '宫崎骏的作品真的是我最喜欢的日本动画作品，竟然没有一丁点男凝的味道，在日本作品里也太难得了', 'direct', 6, now() - (interval '25 days' + interval '195 minutes')),
  (md5('seed-t23-16')::uuid, 't23', '星海旅人·17', '抹一抹 前方的路还在等着你[可爱]', 'direct', 3, now() - (interval '26 days' + interval '208 minutes')),
  (md5('seed-t23-17')::uuid, 't23', '星海旅人·18', '宫崎骏和久石让让我成为一个爱幻想爱做梦的女孩，可当我长大了，却发现现实才是生活的主旋律。很难过。', 'direct', 2, now() - (interval '27 days' + interval '221 minutes')),
  (md5('seed-t23-18')::uuid, 't23', '星海旅人·19', '昨天深圳宫崎骏/久石让动漫作品交响音乐会就是这首压轴。爽翻了', 'direct', 2, now() - (interval '28 days' + interval '234 minutes')),
  (md5('seed-t23-19')::uuid, 't23', '星海旅人·20', '久石让真伟大 无数不朽经典', 'direct', 2, now() - (interval '29 days' + interval '247 minutes')),
  (md5('seed-t24-0')::uuid, 't24', '星海旅人·01', '难得国人能创作出这么卓越的钢琴曲，而且还是一个理科生。', 'direct', 63991, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t24-1')::uuid, 't24', '星海旅人·02', '理科只是选择，气质已经注定。[圈]', 'direct', 53491, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t24-2')::uuid, 't24', '星海旅人·03', '你见，或者不见我，
我就在那里，不悲不喜；
你念，或者不念我，
情就在那里，不来不去；
你爱，或者不爱我，
爱就在那里，不增不减；
你跟，或者不跟我，
我的手就', 'direct', 32183, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t24-3')::uuid, 't24', '星海旅人·04', '多年以后，你已想不起她曾经吸引你的是什么', 'direct', 22395, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t24-4')::uuid, 't24', '星海旅人·05', '很多时候音乐比文字更能准确地传达内心', 'direct', 15335, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t24-5')::uuid, 't24', '星海旅人·06', '世间有情痴，无关风与月。', 'direct', 13860, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t24-6')::uuid, 't24', '星海旅人·07', '听完这首，和大家说晚安[可爱]', 'direct', 10117, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t24-7')::uuid, 't24', '星海旅人·08', '这还我买的也是我收藏的唯一一张专辑，我只想在我暮年的时候还能听到最初让我心动的旋律，或许那时我已经记不清当初吸引我的是什么，但我知道她会一直附着在这段音乐上。', 'direct', 8741, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t24-8')::uuid, 't24', '星海旅人·09', '也许你我终将行踪不明，但你应知道我对你曾经动情……', 'direct', 8214, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t24-9')::uuid, 't24', '星海旅人·10', '一首一首的听他的曲子 就是为了找这个', 'direct', 6511, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t24-10')::uuid, 't24', '星海旅人·11', '心情烦躁的时候听一听，一切都宁静了', 'direct', 6184, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t24-11')::uuid, 't24', '星海旅人·12', '老婆，对不起，害你跟着我受苦那么多年，一直租房子住，当年的班花啊，结婚四五年，没去旅游过一次，没去ktv一次，唯一去的游乐场还是带我们的女儿去儿童游乐场，看着你', 'direct', 4830, now() - (interval '28 days' + interval '143 minutes')),
  (md5('seed-t24-12')::uuid, 't24', '星海旅人·13', '我们不要被命运找到。', 'direct', 4683, now() - (interval '29 days' + interval '156 minutes')),
  (md5('seed-t24-13')::uuid, 't24', '星海旅人·14', '我考试考得很糟糕，看着全校所有人都在抄，在一系列的茅盾中我选择不抄，但我看见在全校排名中退后了一百多名，总感觉有些不甘，周围所有人几乎都在嘲笑我，我做得对吗', 'direct', 4350, now() - (interval '30 days' + interval '169 minutes')),
  (md5('seed-t24-14')::uuid, 't24', '星海旅人·15', '高考英语听力时的试音，满校园响起，是告别青春的前奏，一时恍惚，一辈子也忘不了我抬头看见的那半片天空', 'direct', 3508, now() - (interval '24 days' + interval '182 minutes')),
  (md5('seed-t24-15')::uuid, 't24', '星海旅人·16', '14亿人中我竟不是任何人的唯一 我不是父母唯一的孩子 也不是好朋友唯一的朋友 我一直都是一个人 我没有不知足 我只想要一颗偏向我的心 仅此而已。', 'direct', 2, now() - (interval '25 days' + interval '195 minutes')),
  (md5('seed-t24-16')::uuid, 't24', '星海旅人·17', '你的良心不会痛吗？你们不想和我玩，你就直接跟我说啊。干嘛老吊着我？人数一多就不要我，人数不够拿我凑数，队伍说解就解，然后开隐身玩，以为我不知道吗？我会看隐身啊。', 'direct', 2, now() - (interval '26 days' + interval '208 minutes')),
  (md5('seed-t24-17')::uuid, 't24', '星海旅人·18', '现在回想起来还有意义吗？', 'direct', 1, now() - (interval '27 days' + interval '221 minutes')),
  (md5('seed-t24-18')::uuid, 't24', '星海旅人·19', '2026年8月2号  16:08    我也看到你了呢', 'direct', 1, now() - (interval '28 days' + interval '234 minutes')),
  (md5('seed-t24-19')::uuid, 't24', '星海旅人·20', '好久没收到你的访客记录了 你要开始新生活了吗', 'direct', 1, now() - (interval '29 days' + interval '247 minutes')),
  (md5('seed-t25-0')::uuid, 't25', '星海旅人·01', '建议网易在吉他谱的歌词界面显示六线谱', 'direct', 44989, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t25-1')::uuid, 't25', '星海旅人·02', '作为一个指弹6年的女孩子，我想我这辈子都不会被弹吉他的男生吸引了。', 'direct', 21476, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t25-2')::uuid, 't25', '星海旅人·03', '加油吧  所有的考研狗们！', 'direct', 9265, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t25-3')::uuid, 't25', '星海旅人·04', '有一个话剧用的这首作为配乐，说的是男主在婚姻中遇见了自己的前女友，最后他和自己的老婆离婚了，也没有选择和前女友在一起，他哭了，他说，自己最后才发现，自己失去前女', 'direct', 8671, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t25-4')::uuid, 't25', '星海旅人·05', '下雨了，我心情和天气一样阴暗低落，独自在城市的我看透了人间的冷漠…我沉浸在自己的思绪中，任凭一辆辆公交车驶过……“先生，有没有2元钱？”一个乞丐出现在面前轻声问', 'direct', 7144, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t25-5')::uuid, 't25', '星海旅人·06', '学吉他来一直在弹的曲子，真想深情地弹给某个人听[哀伤]', 'direct', 6945, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t25-6')::uuid, 't25', '星海旅人·07', '生活中总是有很多闪闪发亮的人，他们变成了一种信仰的存在。他们用他们强大的力量，改变着世界，改变着我们。可是我们中的大多数永远也不知道，他们用了多大的代价，才换来', 'direct', 6527, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t25-7')::uuid, 't25', '星海旅人·08', '有人说，吉他是离心脏最近的乐器，所以可以弹出心声。嘻嘻', 'direct', 5903, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t25-8')::uuid, 't25', '星海旅人·09', '押尾《很容易弹永远弹不好》系列', 'direct', 5807, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t25-9')::uuid, 't25', '星海旅人·10', '指弹是种很奇妙的吉他弹奏方式，因为很可能练了很久也弹不出感觉。然后，你不弹这首歌了，并不是你不会而是弹不出灵魂，这首曲子你已烂熟于心。一年或者两年后，你以为你已', 'direct', 4833, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t25-10')::uuid, 't25', '星海旅人·11', '刚开始学指弹练的一首歌，弹的越多发现右手才是灵魂，完整弹了不下一百遍的曲子，当年也是蛮拼的', 'direct', 3692, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t25-11')::uuid, 't25', '星海旅人·12', '最近在苦练这曲 发现伤感中夹杂着积极正面的情感 让过去乘风而去 开头的两个音 音色洪亮清澈 似乎暗示着 让我们随着此诗勇敢迈开脚步 向着未来前行 愿一切安好', 'direct', 2836, now() - (interval '28 days' + interval '143 minutes')),
  (md5('seed-t25-12')::uuid, 't25', '星海旅人·13', '日本其实真的音乐环境比我们这边好很多。民族仇恨的应该只是政治上。', 'direct', 2694, now() - (interval '29 days' + interval '156 minutes')),
  (md5('seed-t25-13')::uuid, 't25', '星海旅人·14', '43岁开始首次接触音乐的中年妇女，选择了吉他，到今天两年了。学会了《流行的云》，《Time Travel》，《花》，《风之诗》，并正在练习《爱的罗曼史》完整谱，', 'direct', 2179, now() - (interval '30 days' + interval '169 minutes')),
  (md5('seed-t25-14')::uuid, 't25', '星海旅人·15', '剧本:《我，与我诀别》！风介/春濑！', 'direct', 3, now() - (interval '24 days' + interval '182 minutes')),
  (md5('seed-t25-15')::uuid, 't25', '星海旅人·16', '一个手部残疾的人，对吉他的狂念是一种遗憾！', 'direct', 2, now() - (interval '25 days' + interval '195 minutes')),
  (md5('seed-t25-16')::uuid, 't25', '星海旅人·17', '@};-       ／＼_ ／＼
　　　　　| 　_　 _ l
　 　　　／` ミ＿꒳ノ
　　 　 /　　　 　 |
　　　 /　 ヽ　　 ﾉ
　 　 │　　', 'direct', 1, now() - (interval '26 days' + interval '208 minutes')),
  (md5('seed-t25-17')::uuid, 't25', '星海旅人·18', '阿姨现在练的怎么样了', 'direct', 1, now() - (interval '27 days' + interval '221 minutes')),
  (md5('seed-t25-18')::uuid, 't25', '星海旅人·19', '18年夏天，寝室黏糊糊的，所有人都在准备大二的考试。我一个同学在漆黑的走廊谈了这个曲子，多年以后无意中听到这首歌，感觉特别平静，凉爽', 'direct', 1, now() - (interval '28 days' + interval '234 minutes')),
  (md5('seed-t25-19')::uuid, 't25', '星海旅人·20', '但是男孩子会被妳吸引啊[装可爱]', 'direct', 0, now() - (interval '29 days' + interval '247 minutes')),
  (md5('seed-t27-0')::uuid, 't27', '星海旅人·01', '只能说被日推这首歌的在座的各位都是神仙！', 'direct', 3610, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t27-1')::uuid, 't27', '星海旅人·02', '网易云现状——好歌推不推你，都要看你功德够不够（我的意思是，被推到这首歌的人功德无量，今后都会快快乐乐，事事顺心✌️[可爱]）', 'direct', 2572, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t27-2')::uuid, 't27', '星海旅人·03', 'islet+倚水+ajimita，大半年没合作过的三人一下子整了个大的，给我干破防了（褒义，给我听的热泪盈眶', 'direct', 1280, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t27-3')::uuid, 't27', '星海旅人·04', '千万别被某音发现！！[多多难过]', 'direct', 1072, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t27-4')::uuid, 't27', '星海旅人·05', '规则：一团混乱
计划：一团混乱
人生：一团混乱
品味：堪称完美', 'direct', 950, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t27-5')::uuid, 't27', '星海旅人·06', '豪庭👆🤓，按下此神秘小按钮可召唤我再听一次👉', 'direct', 824, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t27-6')::uuid, 't27', '星海旅人·07', '繁花似锦，繁星如海，恰如银河倾覆，我以此身化繁星。', 'direct', 621, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t27-7')::uuid, 't27', '星海旅人·08', '抖音火那可不是喜欢的人多了，鱼龙混杂，用的人多了这首歌就烂了', 'direct', 438, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t27-8')::uuid, 't27', '星海旅人·09', '歌曲的歌词所描绘的是在夜空之下对自由与美好事物的向往

可惜对于情绪感染力虽然很好的牵动了听者心绪，但在后期的效果欠缺一个画龙点睛升华的部分
（整体感觉来说欠缺', 'direct', 418, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t27-9')::uuid, 't27', '星海旅人·10', '良作无人（×）
能者先赏（√）', 'direct', 377, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t27-10')::uuid, 't27', '星海旅人·11', '号养的我是真心喜欢！', 'direct', 290, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t27-11')::uuid, 't27', '星海旅人·12', '这是不可能火起来的，因为这首歌不适合视频的快节奏。', 'direct', 222, now() - (interval '28 days' + interval '143 minutes')),
  (md5('seed-t27-12')::uuid, 't27', '星海旅人·13', '呜呜呜他们的歌每次都好有意境，感觉是能边看歌词边想出画面的内种，可惜我只会脑绘（）
蹲一下，有人画了可以踢我一脚（死而无憾了（什）', 'direct', 194, now() - (interval '29 days' + interval '156 minutes')),
  (md5('seed-t27-13')::uuid, 't27', '星海旅人·14', '🍀找到很多好曲子，就会一个劲的听，直到不想听了，再去找其他的曲子，然后再重复，多少年过去了，慢慢积攒沉淀，或偶尔听到以前挚爱的歌都会回想起听这首曲子时自己的生活', 'direct', 189, now() - (interval '30 days' + interval '169 minutes')),
  (md5('seed-t27-14')::uuid, 't27', '星海旅人·15', '“过往所有的伤痕终将化作流星的尾翼。”', 'direct', 185, now() - (interval '24 days' + interval '182 minutes')),
  (md5('seed-t27-15')::uuid, 't27', '星海旅人·16', '亲爱的陌生人，虽然我也只是一个普通的初中生，不懂太多的大道理，但是请相信，你在学校奋力学习、拼搏的每一秒，都是在为了这样快乐的生活铺路。以这条来自2026的消息', 'direct', 3, now() - (interval '25 days' + interval '195 minutes')),
  (md5('seed-t27-16')::uuid, 't27', '星海旅人·17', '现在上高中英语不好只能去学日语了，等我学好日语唱这首歌就回来', 'direct', 2, now() - (interval '26 days' + interval '208 minutes')),
  (md5('seed-t27-17')::uuid, 't27', '星海旅人·18', '星星太耀眼啦，我的翅膀很小，飞得太慢了，但我的痛苦与悲伤还在后面追我，只要我一直飞下去的话终有一天也能变成耀眼的星星吗，喜欢倚水的这首歌，给我力量了呐', 'direct', 2, now() - (interval '27 days' + interval '221 minutes')),
  (md5('seed-t27-18')::uuid, 't27', '星海旅人·19', '最喜欢的歌，从来没有听过这么美的歌。现在感觉我闭上眼脑海里有一片触手可及的星空在我眼前', 'direct', 2, now() - (interval '28 days' + interval '234 minutes')),
  (md5('seed-t27-19')::uuid, 't27', '星海旅人·20', '下一首歌叫星降る海，爱死日推[惊恐]', 'direct', 1, now() - (interval '29 days' + interval '247 minutes')),
  (md5('seed-t38-0')::uuid, 't38', '星海旅人·01', '听这首歌的人一定很有品', 'direct', 1, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t48-0')::uuid, 't48', '星海旅人·01', 'LISA紅蓮華(红莲花)即、莲之花。也有着红莲地狱之花的意思。越是伤痕累累越会争艳绽放。
「红莲地狱」即佛教中「八寒地狱」第7的「钵特摩地狱」钵特摩是莲花(日语', 'direct', 72075, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t48-1')::uuid, 't48', '星海旅人·02', '炎柱大哥:你们三人以后要成为支撑鬼杀队的柱啊！
三人:好的！！
多年后，
伊之助→猪柱
善逸→睡柱
炭治郎→头柱', 'direct', 64833, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t48-2')::uuid, 't48', '星海旅人·03', '妈妈：孩子，你答应我，你可以看鬼灭之刃，但是只要有一个角色死了你就去读五分钟书可以吗？
孩子：好的妈妈，没有问题
现在这个孩子在清华了', 'direct', 56349, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t48-3')::uuid, 't48', '星海旅人·04', '初入鬼杀队篇（第1～9话）
沼鬼篇（第10～13话）
与鬼舞辻的邂逅篇（第13～19话）
鼓鬼篇（第20～27话）
蜘蛛山篇（第28话～44话）
柱集结篇（第4', 'direct', 53067, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t48-4')::uuid, 't48', '星海旅人·05', '善逸:爷爷！！
对不起，我没和獊岳搞好关系
要不是有我在
他也不会变成那个样子
真的很抱歉！！请原谅我！
对不起爷爷！没能做出任何报答
您讨厌我了吗？说话啊爷爷', 'direct', 39252, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t48-5')::uuid, 't48', '星海旅人·06', '鬼灭之刃（[叉]）
柱灭之刃（⭕️）
改天我们给作者寄刀片', 'direct', 32277, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t48-6')::uuid, 't48', '星海旅人·07', '右面是无惨晒太阳的次数☞', 'direct', 23922, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t48-7')::uuid, 't48', '星海旅人·08', '猪肉骨，拿来卤，你又要洗蛋，不过我煮了袋速食面。菠萝拿来开刀，送了个罗密欧，可我把卤都搞了，葫芦娃来带娃，四袋米都不够俺卤，色狼都该杀，又卤了一袋薏米，色狼你懒', 'direct', 21934, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t48-8')::uuid, 't48', '星海旅人·09', '上叁：
恋雪
即使我成了鬼，记忆丧失。
我的发色是记忆中你穿着那和服的颜色。
我的鬼杀术是你的发饰的雪花状。
我的每一招式名称是你我立下誓言那一晚，不，或说更早', 'direct', 21017, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t48-9')::uuid, 't48', '星海旅人·10', '认识LiSA 你只需要听一部番的OP
了解LiSA 只需看一场LiSA的live
小小的身体里藏着大大的力量
LiSA请为我们也为自己一直唱下去吧！', 'direct', 20245, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t48-10')::uuid, 't48', '星海旅人·11', '“灶门少年，我相信你的妹妹，我认可她是鬼杀队的一员。我看见那个少女在车厢里流着血保护人类，不管别人怎么说，挺起胸膛活下去吧。”
“就算被自己的弱小无助击垮，你也', 'direct', 19326, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t48-11')::uuid, 't48', '星海旅人·12', '我能为我妹妹做任何事。[钟情]', 'direct', 18848, now() - (interval '28 days' + interval '143 minutes')),
  (md5('seed-t48-12')::uuid, 't48', '星海旅人·13', '黑发紫瞳，发梢紫色。戴深紫色边缘的薄荷色蝴蝶发夹，羽织如同蝴蝶的翅膀。
年少时留着短发，严肃认真，不苟言笑。姐姐蝴蝶香奈惠死后努力变得温和，一直压抑着对于鬼的愤', 'direct', 12676, now() - (interval '29 days' + interval '156 minutes')),
  (md5('seed-t48-13')::uuid, 't48', '星海旅人·14', '“狛治哥哥看到了我的未来，还对我说明年后年，我真的好开心。我有狛治哥哥就好，能和我结为夫妻吗？”  明明猗窝座可以继承道场，可以和恋雪结婚，可以让自己的人生从头', 'direct', 12654, now() - (interval '30 days' + interval '169 minutes')),
  (md5('seed-t48-14')::uuid, 't48', '星海旅人·15', '本番别名：为了妹妹，我说不定连鬼舞辻无惨都能干掉 [大哭]', 'direct', 11198, now() - (interval '24 days' + interval '182 minutes')),
  (md5('seed-t48-15')::uuid, 't48', '星海旅人·16', '无惨皮肤太白了，很明显就是贫血，补补铁，多晒晒太阳', 'direct', 2, now() - (interval '25 days' + interval '195 minutes')),
  (md5('seed-t48-16')::uuid, 't48', '星海旅人·17', '致我们鱼死网破的胜利！', 'direct', 2, now() - (interval '26 days' + interval '208 minutes')),
  (md5('seed-t48-17')::uuid, 't48', '星海旅人·18', '爱上无惨大人就和呼吸一样简单', 'direct', 1, now() - (interval '27 days' + interval '221 minutes')),
  (md5('seed-t48-18')::uuid, 't48', '星海旅人·19', '每呼吸一分钟，就过去了60秒。', 'direct', 1, now() - (interval '28 days' + interval '234 minutes')),
  (md5('seed-t48-19')::uuid, 't48', '星海旅人·20', '今年乐队排练的是这首歌', 'direct', 1, now() - (interval '29 days' + interval '247 minutes')),
  (md5('seed-t49-0')::uuid, 't49', '星海旅人·01', '就喜欢这种嘶吼着的希望！', 'direct', 3, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t49-1')::uuid, 't49', '星海旅人·02', '等会儿，作词作曲:Lia？是我想的那位么', 'direct', 2, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t49-2')::uuid, 't49', '星海旅人·03', '这位lia嗓子也有lisa那股冲劲儿 喜欢喜欢', 'direct', 1, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t49-3')::uuid, 't49', '星海旅人·04', '很锐气的曲调，少年感。
我们始终憧憬着那些无所畏惧的人，就好像望着水坑里的月光。', 'direct', 1, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t49-4')::uuid, 't49', '星海旅人·05', 'choose life！？', 'direct', 1, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t49-5')::uuid, 't49', '星海旅人·06', '好喜欢这种用尽力气去唱的感觉', 'direct', 0, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t49-6')::uuid, 't49', '星海旅人·07', '一听就是lisa曲风，再一看作词编曲，会心一笑', 'direct', 0, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t49-7')::uuid, 't49', '星海旅人·08', '~o(〃''▽''〃)o', 'direct', 0, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t49-8')::uuid, 't49', '星海旅人·09', '声音好亮好清透(oﾟvﾟ)o', 'direct', 0, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t49-9')::uuid, 't49', '星海旅人·10', '用薇尔丹蒂听，好爽的人声啊姐姐', 'direct', 0, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t49-10')::uuid, 't49', '星海旅人·11', '今もそうやっている気がして，
时至今日我还在祈愿
星が降った日に思い出した，
回想星空下落的日子
花が枯れた花瓶だけが，
只有花瓶里枯萎的花
暗闇を彷徨うだろう', 'direct', 0, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t49-11')::uuid, 't49', '星海旅人·12', '唱的太好了，有力量感', 'direct', 0, now() - (interval '28 days' + interval '143 minutes')),
  (md5('seed-t50-0')::uuid, 't50', '星海旅人·01', '对不起 大哥封面好像游乐王子啊哈哈哈哈哈哈哈哈哈哈哈哈哈', 'direct', 2878, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t50-1')::uuid, 't50', '星海旅人·02', '黑兔老登只需要用一首坎特雷拉把冰葱姐拉入坑就行了，而冰葱姐要考虑的就多了…', 'direct', 1600, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t50-2')::uuid, 't50', '星海旅人·03', '人这么少的原因是因为中文搜坎特雷拉搜不到本家啊。', 'direct', 1042, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t50-3')::uuid, 't50', '星海旅人·04', '杀死妹妹的丈夫,再次把她掠夺回来,被后世史学家用手段残忍、凶狠、恐怖这些字眼来形容的毒药男人 。', 'direct', 1011, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t50-4')::uuid, 't50', '星海旅人·05', '冰葱曲下提逆家的没有素质和品味', 'direct', 939, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t50-5')::uuid, 't50', '星海旅人·06', '传说曲：坎特雷拉/禁断之毒
日语：カンタレラ
2008年02月18日投稿的初版再生数为160,000+，2008年02月21日投稿的第二版再生数为2,470,0', 'direct', 923, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t50-6')::uuid, 't50', '星海旅人·07', '无论听多久都会被开头的小提琴美到...', 'direct', 699, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t50-7')::uuid, 't50', '星海旅人·08', '西泽尔·波吉亚,罗马教庭的最高统治者亚历山大六世与罗马妇女的私生子,意大利的瓦伦丁公爵,历史上赫赫有名的野心家,差不多掠夺了整个意大利北部的土地,用施毒暗杀的手', 'direct', 673, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t50-8')::uuid, 't50', '星海旅人·09', '有种说法真实的卢克蕾西亚并没有和凯撒乱伦，是政敌故意造谣，卢克蕾西亚早嫁了风评甚至还挺不错。完全有可能这才是真相，自古这种黄谣都是最吸引人眼球也最脍灸人口的，也', 'direct', 554, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t50-9')::uuid, 't50', '星海旅人·10', '你这个冷漠无情的人，我永远也不会原谅你', 'direct', 505, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t50-10')::uuid, 't50', '星海旅人·11', '原曲人意外地好少，初中时候特别喜欢听的...T T歌词翻译已上传，等审核（直接从百度那里搬来的）', 'direct', 336, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t50-11')::uuid, 't50', '星海旅人·12', '黑兔p敢不敢再写一首冰葱曲把我吓死', 'direct', 267, now() - (interval '28 days' + interval '143 minutes')),
  (md5('seed-t50-12')::uuid, 't50', '星海旅人·13', '黑兔随手一卖留冰葱粉们痛苦一生。。', 'direct', 240, now() - (interval '29 days' + interval '156 minutes')),
  (md5('seed-t50-13')::uuid, 't50', '星海旅人·14', '入坑冰葱后发现根本没有粮[流泪]', 'direct', 227, now() - (interval '30 days' + interval '169 minutes')),
  (md5('seed-t50-14')::uuid, 't50', '星海旅人·15', '我劝你们还是磕冰葱吧，曾经有位科学家做了实验，把一个冰葱姐和一个普通人一起从楼上扔下去，冰葱姐闻到饭香直接飞天，那个普通人被吓到直接当场坐下，这就是磕冰葱的好处', 'direct', 194, now() - (interval '24 days' + interval '182 minutes')),
  (md5('seed-t50-15')::uuid, 't50', '星海旅人·16', '可以，我不磕别的cp也会听他们的CP曲，自己默默听，不和别人，尤其是在cp姐下面贴脸说就可以', 'direct', 11, now() - (interval '25 days' + interval '195 minutes')),
  (md5('seed-t50-16')::uuid, 't50', '星海旅人·17', '不磕冰葱。但是很喜欢这首曲…黑兔是神！😭', 'direct', 4, now() - (interval '26 days' + interval '208 minutes')),
  (md5('seed-t50-17')::uuid, 't50', '星海旅人·18', '冰葱姐觉得可以（）其实我本来是不吃的但是pjsk买了这首歌，觉得不能浪费所以去了解了一下磕点，结果垂直入坑力（）', 'direct', 4, now() - (interval '27 days' + interval '221 minutes')),
  (md5('seed-t50-18')::uuid, 't50', '星海旅人·19', '没人觉得kaito很扫吗嗯明明是个成男角色在队伍一直这么微笑嗯立绘还拎着自己的薄丝带围巾深蓝色的一套衣服虽然很成熟但是一点也不违和该有的可爱对尤其是他的深蓝色指', 'direct', 2, now() - (interval '28 days' + interval '234 minutes')),
  (md5('seed-t50-19')::uuid, 't50', '星海旅人·20', '我看评论区be like：小姐姐你们真的是来听歌的吗？', 'direct', 2, now() - (interval '29 days' + interval '247 minutes')),
  (md5('seed-t52-0')::uuid, 't52', '星海旅人·01', '枕边掉的头发越来越多，喜欢的配餐面包从便利店的货架上消失，这些微小的绝望不断堆积，才会使你变成大人。————七海建人', 'direct', 40655, now() - (interval '24 days' + interval '0 minutes')),
  (md5('seed-t52-1')::uuid, 't52', '星海旅人·02', '犹记5t5过生日，我空间全是
“知道的是5t5过生日，不知道还以为日本天皇登基了。”', 'direct', 36418, now() - (interval '25 days' + interval '13 minutes')),
  (md5('seed-t52-2')::uuid, 't52', '星海旅人·03', '以前的热血漫:挥洒少年们的热血
现在的热血漫:挥洒少年们的热血', 'direct', 35239, now() - (interval '26 days' + interval '26 minutes')),
  (md5('seed-t52-3')::uuid, 't52', '星海旅人·04', '“可你不知道5t5老了之后去卖鱼了”', 'direct', 32169, now() - (interval '27 days' + interval '39 minutes')),
  (md5('seed-t52-4')::uuid, 't52', '星海旅人·05', '虽然我是男的也不耽误我是5t5的老婆', 'direct', 26094, now() - (interval '28 days' + interval '52 minutes')),
  (md5('seed-t52-5')::uuid, 't52', '星海旅人·06', '我看完漫画以后，比较在意的是虎子让人产生不存在的记忆的能力……emmm，顺平出现了虎子和他在高专的记忆，东堂出现了虎子是他好朋友的记忆，胀相出现了虎子是他兄弟的', 'direct', 25332, now() - (interval '29 days' + interval '65 minutes')),
  (md5('seed-t52-6')::uuid, 't52', '星海旅人·07', '今天成功给舍友安利到了咒术回战，她看的很上头一口气刷了前七集，当晚回寝室就和我说她饿了，我翻翻找找也没找到什么吃的就让她看看她还有没有存货，她的表情就突然，奇奇', 'direct', 23561, now() - (interval '30 days' + interval '78 minutes')),
  (md5('seed-t52-7')::uuid, 't52', '星海旅人·08', '5t5跟宿傩的最大区别就是5t5不会撕衣服', 'direct', 20965, now() - (interval '24 days' + interval '91 minutes')),
  (md5('seed-t52-8')::uuid, 't52', '星海旅人·09', '「你叫什么名字？」
「伏黑...」
「不是姓禅院啊？那太好了。」 ​​​', 'direct', 17538, now() - (interval '25 days' + interval '104 minutes')),
  (md5('seed-t52-9')::uuid, 't52', '星海旅人·10', '请问诅咒之王的名字是？
A两面宿摊
B两面宿瘫
C两面宿傩
D两面宿痰', 'direct', 17108, now() - (interval '26 days' + interval '117 minutes')),
  (md5('seed-t52-10')::uuid, 't52', '星海旅人·11', '悠仁是我近几年最喜欢的jump男主了，没有人可以拒绝可可爱爱没有脑袋、健气阳光、情商爆表、战力超强、善良体贴富有责任心的虎子！！！希望大家都可以喜欢这位主角！', 'direct', 16967, now() - (interval '27 days' + interval '130 minutes')),
  (md5('seed-t52-11')::uuid, 't52', '星海旅人·12', '低情商：这么大人了，幼不幼稚？

高情商：你有没有觉得自己很像五条悟', 'direct', 16813, now() - (interval '28 days' + interval '143 minutes')),
  (md5('seed-t52-12')::uuid, 't52', '星海旅人·13', '《咒术回战》x
《咒术惠战》x
《五条悟传》x
《瑚宝受难记》x
《唯品惠》   x
《真人传》   ✓', 'direct', 14149, now() - (interval '29 days' + interval '156 minutes')),
  (md5('seed-t52-13')::uuid, 't52', '星海旅人·14', '这世界上只有两种人,一种是没看咒术回战的,另一种是5t5推（狗头', 'direct', 13178, now() - (interval '30 days' + interval '169 minutes')),
  (md5('seed-t52-14')::uuid, 't52', '星海旅人·15', '低情商：你睫毛好长
高情商：你适合cos伏黑惠

低情商：你眼睛好小
高情商：你适合cos夏油杰

低情商：你性格好差
高情商：你适合cos五条悟', 'direct', 12006, now() - (interval '24 days' + interval '182 minutes')),
  (md5('seed-t52-15')::uuid, 't52', '星海旅人·16', '转盘看多了现在一听到这曲子脑子里就冒出来一局：普通人', 'direct', 4, now() - (interval '25 days' + interval '195 minutes')),
  (md5('seed-t52-16')::uuid, 't52', '星海旅人·17', '第1次看还是三年之前呢，当时是个很稚嫩的初一学生现在都中考完了初一的时候那时候还是非常稚嫩看到理子死的时候我都懵了好长时间，真的……', 'direct', 3, now() - (interval '26 days' + interval '208 minutes')),
  (md5('seed-t52-17')::uuid, 't52', '星海旅人·18', '咒术回战这番就是在平常的日常里突然刀我一下[哭哭][哭哭]或是在我情绪高涨，非常开心的时候，突然刀我一下看着挺难受的，但是还是很好看，我感觉。', 'direct', 2, now() - (interval '27 days' + interval '221 minutes')),
  (md5('seed-t52-18')::uuid, 't52', '星海旅人·19', '这歌一开始听的时候找不到任何旋律，感觉挺一般的，后面越听越好听。', 'direct', 2, now() - (interval '28 days' + interval '234 minutes')),
  (md5('seed-t52-19')::uuid, 't52', '星海旅人·20', '梦开始的地方。问：你是什么时候开始看咒术回战的', 'direct', 2, now() - (interval '29 days' + interval '247 minutes'))
on conflict (id) do nothing;
