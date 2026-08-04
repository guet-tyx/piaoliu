import type { Track } from "@/types/music";

/**
 * 星海电台曲目（52 首）
 * - t01-t04：原型保留曲目（本地音频优先，incompetech / SoundHelix 兜底）
 * - t05-t52：Kevin MacLeod（incompetech.com）CC BY 4.0，原曲名与时长见 public/music/CREDITS.md
 *   音频来源：未设 MUSIC_BASE_URL 时本地 /music/ 直放；设为 CDN 前缀时走远程 + 本地兜底
 * - 本文件由 scripts/gen-tracks.mjs 生成，勿手改数据段
 */
export const TRACKS: Track[] = [
  {
    "id": "t01",
    "t": "信风",
    "s": "一支你没听过的乐队 · 后摇",
    "tag": "后摇",
    "cover": "/images/cover-anime-1.png",
    "src": [
      "/audio/zen.mp3",
      "https://incompetech.com/music/royalty-free/mp3-royaltyfree/That%20Zen%20Moment.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3"
    ],
    "mood": [
      "治愈",
      "平静"
    ],
    "scene": [
      "深夜",
      "学习"
    ],
    "duration": 60
  },
  {
    "id": "t02",
    "t": "晚风告别式",
    "s": "环境电子 · 深夜电台",
    "tag": "环境电子",
    "cover": "/images/cover-anime-4.png",
    "src": [
      "/audio/gymnopedie1.mp3",
      "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Gymnopedie%20No%201.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
    ],
    "mood": [
      "伤感",
      "空灵"
    ],
    "scene": [
      "深夜",
      "雨天"
    ],
    "duration": 65
  },
  {
    "id": "t03",
    "t": "凌晨三点半的港",
    "s": "爵士嘻哈 · 失眠人士精选",
    "tag": "爵士嘻哈",
    "cover": "/images/cover-anime-2.png",
    "src": [
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3"
    ],
    "mood": [
      "伤感",
      "平静"
    ],
    "scene": [
      "深夜"
    ],
    "duration": 340
  },
  {
    "id": "t04",
    "t": "雨季漂流记",
    "s": "氛围 · 下雨天限定",
    "tag": "氛围",
    "cover": "/images/cover-anime-3.png",
    "src": [
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3"
    ],
    "mood": [
      "平静",
      "伤感"
    ],
    "scene": [
      "雨天",
      "冥想"
    ],
    "duration": 300
  },
  {
    "id": "t05",
    "t": "星舰泊港",
    "s": "Kevin MacLeod · 后摇",
    "tag": "后摇",
    "cover": "/images/covers/cover-t05.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/airship-serenity.mp3",
      "/music/airship-serenity.mp3"
    ],
    "mood": [
      "治愈",
      "空灵"
    ],
    "scene": [
      "深夜"
    ],
    "duration": 240
  },
  {
    "id": "t06",
    "t": "一切的开始",
    "s": "Kevin MacLeod · 后摇",
    "tag": "后摇",
    "cover": "/images/covers/cover-t06.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/how-it-begins.mp3",
      "/music/how-it-begins.mp3"
    ],
    "mood": [
      "治愈",
      "平静"
    ],
    "scene": [
      "深夜"
    ],
    "duration": 190
  },
  {
    "id": "t07",
    "t": "久别重逢",
    "s": "Kevin MacLeod · 氛围",
    "tag": "氛围",
    "cover": "/images/covers/cover-t07.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/long-time-coming.mp3",
      "/music/long-time-coming.mp3"
    ],
    "mood": [
      "温暖",
      "治愈"
    ],
    "scene": [
      "深夜"
    ],
    "duration": 274
  },
  {
    "id": "t08",
    "t": "无人应答",
    "s": "Kevin MacLeod · 氛围",
    "tag": "氛围",
    "cover": "/images/covers/cover-t08.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/unanswered-questions.mp3",
      "/music/unanswered-questions.mp3"
    ],
    "mood": [
      "空灵",
      "伤感"
    ],
    "scene": [
      "深夜"
    ],
    "duration": 166
  },
  {
    "id": "t09",
    "t": "无处之地",
    "s": "Kevin MacLeod · 氛围",
    "tag": "氛围",
    "cover": "/images/covers/cover-t09.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/nowhere-land.mp3",
      "/music/nowhere-land.mp3"
    ],
    "mood": [
      "空灵",
      "平静"
    ],
    "scene": [
      "深夜",
      "冥想"
    ],
    "duration": 132
  },
  {
    "id": "t10",
    "t": "微苦的甜",
    "s": "Kevin MacLeod · 后摇",
    "tag": "后摇",
    "cover": "/images/covers/cover-t10.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/bittersweet.mp3",
      "/music/bittersweet.mp3"
    ],
    "mood": [
      "伤感",
      "温暖"
    ],
    "scene": [
      "深夜",
      "雨天"
    ],
    "duration": 202
  },
  {
    "id": "t11",
    "t": "入梦仪式",
    "s": "Kevin MacLeod · 氛围",
    "tag": "氛围",
    "cover": "/images/covers/cover-t11.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/hypnothis.mp3",
      "/music/hypnothis.mp3"
    ],
    "mood": [
      "平静",
      "空灵"
    ],
    "scene": [
      "深夜"
    ],
    "duration": 283
  },
  {
    "id": "t12",
    "t": "狐色晴天",
    "s": "Kevin MacLeod · 日系",
    "tag": "日系",
    "cover": "/images/covers/cover-t12.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/kawai-kitsune.mp3",
      "/music/kawai-kitsune.mp3"
    ],
    "mood": [
      "温暖",
      "治愈"
    ],
    "scene": [
      "通勤"
    ],
    "duration": 242
  },
  {
    "id": "t13",
    "t": "轻快涂鸦",
    "s": "Kevin MacLeod · 日系",
    "tag": "日系",
    "cover": "/images/covers/cover-t13.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/chipper-doodle-v2.mp3",
      "/music/chipper-doodle-v2.mp3"
    ],
    "mood": [
      "温暖",
      "治愈"
    ],
    "scene": [
      "通勤"
    ],
    "duration": 172
  },
  {
    "id": "t14",
    "t": "超级友善",
    "s": "Kevin MacLeod · 日系",
    "tag": "日系",
    "cover": "/images/covers/cover-t14.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/super-friendly.mp3",
      "/music/super-friendly.mp3"
    ],
    "mood": [
      "温暖"
    ],
    "scene": [
      "通勤",
      "日常"
    ],
    "duration": 134
  },
  {
    "id": "t15",
    "t": "新浪潮",
    "s": "Kevin MacLeod · 日系",
    "tag": "日系",
    "cover": "/images/covers/cover-t15.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/newer-wave.mp3",
      "/music/newer-wave.mp3"
    ],
    "mood": [
      "燃"
    ],
    "scene": [
      "运动",
      "通勤"
    ],
    "duration": 175
  },
  {
    "id": "t16",
    "t": "体素革命",
    "s": "Kevin MacLeod · 日系",
    "tag": "日系",
    "cover": "/images/covers/cover-t16.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/voxel-revolution.mp3",
      "/music/voxel-revolution.mp3"
    ],
    "mood": [
      "燃"
    ],
    "scene": [
      "运动"
    ],
    "duration": 130
  },
  {
    "id": "t17",
    "t": "数字柠檬水",
    "s": "Kevin MacLeod · 日系",
    "tag": "日系",
    "cover": "/images/covers/cover-t17.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/digital-lemonade.mp3",
      "/music/digital-lemonade.mp3"
    ],
    "mood": [
      "温暖",
      "治愈"
    ],
    "scene": [
      "通勤"
    ],
    "duration": 180
  },
  {
    "id": "t18",
    "t": "比特探险",
    "s": "Kevin MacLeod · 日系",
    "tag": "日系",
    "cover": "/images/covers/cover-t18.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/bit-quest.mp3",
      "/music/bit-quest.mp3"
    ],
    "mood": [
      "燃",
      "温暖"
    ],
    "scene": [
      "运动"
    ],
    "duration": 192
  },
  {
    "id": "t19",
    "t": "等级提升",
    "s": "Kevin MacLeod · 电子",
    "tag": "电子",
    "cover": "/images/covers/cover-t19.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/level-up.mp3",
      "/music/level-up.mp3"
    ],
    "mood": [
      "燃"
    ],
    "scene": [
      "运动"
    ],
    "duration": 219
  },
  {
    "id": "t20",
    "t": "弹珠之春",
    "s": "Kevin MacLeod · 日系",
    "tag": "日系",
    "cover": "/images/covers/cover-t20.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/pinball-spring-160.mp3",
      "/music/pinball-spring-160.mp3"
    ],
    "mood": [
      "温暖"
    ],
    "scene": [
      "通勤",
      "运动"
    ],
    "duration": 171
  },
  {
    "id": "t21",
    "t": "未来恰恰",
    "s": "Kevin MacLeod · 日系",
    "tag": "日系",
    "cover": "/images/covers/cover-t21.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/future-cha-cha.mp3",
      "/music/future-cha-cha.mp3"
    ],
    "mood": [
      "温暖",
      "燃"
    ],
    "scene": [
      "通勤"
    ],
    "duration": 288
  },
  {
    "id": "t22",
    "t": "安德里斯的晨光",
    "s": "Kevin MacLeod · 纯音乐",
    "tag": "纯音乐",
    "cover": "/images/covers/cover-t22.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/andreas-theme.mp3",
      "/music/andreas-theme.mp3"
    ],
    "mood": [
      "平静"
    ],
    "scene": [
      "学习"
    ],
    "duration": 217
  },
  {
    "id": "t23",
    "t": "气球游戏",
    "s": "Kevin MacLeod · 纯音乐",
    "tag": "纯音乐",
    "cover": "/images/covers/cover-t23.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/balloon-game.mp3",
      "/music/balloon-game.mp3"
    ],
    "mood": [
      "温暖",
      "平静"
    ],
    "scene": [
      "学习"
    ],
    "duration": 222
  },
  {
    "id": "t24",
    "t": "思绪之舞",
    "s": "Kevin MacLeod · 纯音乐",
    "tag": "纯音乐",
    "cover": "/images/covers/cover-t24.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/brain-dance.mp3",
      "/music/brain-dance.mp3"
    ],
    "mood": [
      "平静"
    ],
    "scene": [
      "学习",
      "冥想"
    ],
    "duration": 215
  },
  {
    "id": "t25",
    "t": "轻巧一步",
    "s": "Kevin MacLeod · 纯音乐",
    "tag": "纯音乐",
    "cover": "/images/covers/cover-t25.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/one-sly-move.mp3",
      "/music/one-sly-move.mp3"
    ],
    "mood": [
      "平静"
    ],
    "scene": [
      "学习"
    ],
    "duration": 162
  },
  {
    "id": "t26",
    "t": "完成清单",
    "s": "Kevin MacLeod · 轻音乐",
    "tag": "轻音乐",
    "cover": "/images/covers/cover-t26.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/getting-it-done.mp3",
      "/music/getting-it-done.mp3"
    ],
    "mood": [
      "平静",
      "治愈"
    ],
    "scene": [
      "学习"
    ],
    "duration": 210
  },
  {
    "id": "t27",
    "t": "浮游之城",
    "s": "Kevin MacLeod · 纯音乐",
    "tag": "纯音乐",
    "cover": "/images/covers/cover-t27.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/floating-cities.mp3",
      "/music/floating-cities.mp3"
    ],
    "mood": [
      "空灵",
      "平静"
    ],
    "scene": [
      "冥想",
      "学习"
    ],
    "duration": 184
  },
  {
    "id": "t28",
    "t": "潘加亚纪",
    "s": "Kevin MacLeod · 纯音乐",
    "tag": "纯音乐",
    "cover": "/images/covers/cover-t28.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/pamgaea.mp3",
      "/music/pamgaea.mp3"
    ],
    "mood": [
      "空灵"
    ],
    "scene": [
      "冥想",
      "学习"
    ],
    "duration": 169
  },
  {
    "id": "t29",
    "t": "激光律动",
    "s": "Kevin MacLeod · 轻音乐",
    "tag": "轻音乐",
    "cover": "/images/covers/cover-t29.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/laser-groove.mp3",
      "/music/laser-groove.mp3"
    ],
    "mood": [
      "平静",
      "温暖"
    ],
    "scene": [
      "学习"
    ],
    "duration": 168
  },
  {
    "id": "t30",
    "t": "消磨时光",
    "s": "Kevin MacLeod · 氛围",
    "tag": "氛围",
    "cover": "/images/covers/cover-t30.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/killing-time.mp3",
      "/music/killing-time.mp3"
    ],
    "mood": [
      "伤感",
      "平静"
    ],
    "scene": [
      "雨天"
    ],
    "duration": 204
  },
  {
    "id": "t31",
    "t": "离席",
    "s": "Kevin MacLeod · 环境",
    "tag": "环境",
    "cover": "/images/covers/cover-t31.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/exit-the-premises.mp3",
      "/music/exit-the-premises.mp3"
    ],
    "mood": [
      "伤感",
      "空灵"
    ],
    "scene": [
      "雨天",
      "深夜"
    ],
    "duration": 210
  },
  {
    "id": "t32",
    "t": "仓促逃亡",
    "s": "Kevin MacLeod · 环境",
    "tag": "环境",
    "cover": "/images/covers/cover-t32.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/cut-and-run.mp3",
      "/music/cut-and-run.mp3"
    ],
    "mood": [
      "伤感",
      "燃"
    ],
    "scene": [
      "雨天"
    ],
    "duration": 215
  },
  {
    "id": "t33",
    "t": "犀牛漫步",
    "s": "Kevin MacLeod · 钢琴",
    "tag": "钢琴",
    "cover": "/images/covers/cover-t33.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/rhinoceros.mp3",
      "/music/rhinoceros.mp3"
    ],
    "mood": [
      "平静",
      "伤感"
    ],
    "scene": [
      "雨天"
    ],
    "duration": 204
  },
  {
    "id": "t34",
    "t": "点点迷境",
    "s": "Kevin MacLeod · 环境",
    "tag": "环境",
    "cover": "/images/covers/cover-t34.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/blippy-trance.mp3",
      "/music/blippy-trance.mp3"
    ],
    "mood": [
      "空灵",
      "平静"
    ],
    "scene": [
      "雨天",
      "冥想"
    ],
    "duration": 120
  },
  {
    "id": "t35",
    "t": "永夜俱乐部",
    "s": "Kevin MacLeod · 氛围",
    "tag": "氛围",
    "cover": "/images/covers/cover-t35.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/ethernight-club.mp3",
      "/music/ethernight-club.mp3"
    ],
    "mood": [
      "治愈",
      "空灵"
    ],
    "scene": [
      "深夜",
      "雨天"
    ],
    "duration": 306
  },
  {
    "id": "t36",
    "t": "雨点数据流",
    "s": "Kevin MacLeod · 电子",
    "tag": "电子",
    "cover": "/images/covers/cover-t36.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/blip-stream.mp3",
      "/music/blip-stream.mp3"
    ],
    "mood": [
      "平静",
      "空灵"
    ],
    "scene": [
      "雨天"
    ],
    "duration": 285
  },
  {
    "id": "t37",
    "t": "机械忍者",
    "s": "Kevin MacLeod · 电子",
    "tag": "电子",
    "cover": "/images/covers/cover-t37.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/cyborg-ninja.mp3",
      "/music/cyborg-ninja.mp3"
    ],
    "mood": [
      "燃"
    ],
    "scene": [
      "运动"
    ],
    "duration": 180
  },
  {
    "id": "t38",
    "t": "密文",
    "s": "Kevin MacLeod · 电子",
    "tag": "电子",
    "cover": "/images/covers/cover-t38.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/cipher.mp3",
      "/music/cipher.mp3"
    ],
    "mood": [
      "燃",
      "空灵"
    ],
    "scene": [
      "运动"
    ],
    "duration": 231
  },
  {
    "id": "t39",
    "t": "重格式化",
    "s": "Kevin MacLeod · 电子",
    "tag": "电子",
    "cover": "/images/covers/cover-t39.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/reformat.mp3",
      "/music/reformat.mp3"
    ],
    "mood": [
      "燃"
    ],
    "scene": [
      "运动"
    ],
    "duration": 219
  },
  {
    "id": "t40",
    "t": "激光背包",
    "s": "Kevin MacLeod · 电子",
    "tag": "电子",
    "cover": "/images/covers/cover-t40.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/laserpack.mp3",
      "/music/laserpack.mp3"
    ],
    "mood": [
      "燃"
    ],
    "scene": [
      "运动"
    ],
    "duration": 186
  },
  {
    "id": "t41",
    "t": "闪耀科技",
    "s": "Kevin MacLeod · 电子",
    "tag": "电子",
    "cover": "/images/covers/cover-t41.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/shiny-tech.mp3",
      "/music/shiny-tech.mp3"
    ],
    "mood": [
      "燃",
      "温暖"
    ],
    "scene": [
      "运动",
      "通勤"
    ],
    "duration": 222
  },
  {
    "id": "t42",
    "t": "机器人波佐",
    "s": "Kevin MacLeod · 电子",
    "tag": "电子",
    "cover": "/images/covers/cover-t42.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/robobozo.mp3",
      "/music/robobozo.mp3"
    ],
    "mood": [
      "燃",
      "治愈"
    ],
    "scene": [
      "运动"
    ],
    "duration": 206
  },
  {
    "id": "t43",
    "t": "衔尾之环",
    "s": "Kevin MacLeod · 电子",
    "tag": "电子",
    "cover": "/images/covers/cover-t43.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/ouroboros.mp3",
      "/music/ouroboros.mp3"
    ],
    "mood": [
      "燃",
      "空灵"
    ],
    "scene": [
      "运动",
      "深夜"
    ],
    "duration": 161
  },
  {
    "id": "t44",
    "t": "切割迷幻",
    "s": "Kevin MacLeod · 电子",
    "tag": "电子",
    "cover": "/images/covers/cover-t44.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/cut-trance.mp3",
      "/music/cut-trance.mp3"
    ],
    "mood": [
      "燃"
    ],
    "scene": [
      "运动"
    ],
    "duration": 220
  },
  {
    "id": "t45",
    "t": "摩根娜骑乘",
    "s": "Kevin MacLeod · 动漫OST",
    "tag": "动漫OST",
    "cover": "/images/covers/cover-t45.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/morgana-rides.mp3",
      "/music/morgana-rides.mp3"
    ],
    "mood": [
      "温暖",
      "燃"
    ],
    "scene": [
      "日常"
    ],
    "duration": 246
  },
  {
    "id": "t46",
    "t": "冒险岛游记",
    "s": "Kevin MacLeod · 动漫OST",
    "tag": "动漫OST",
    "cover": "/images/covers/cover-t46.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/adventures-in-adventureland.mp3",
      "/music/adventures-in-adventureland.mp3"
    ],
    "mood": [
      "温暖",
      "燃"
    ],
    "scene": [
      "日常"
    ],
    "duration": 261
  },
  {
    "id": "t47",
    "t": "哥布林巡航",
    "s": "Kevin MacLeod · 动漫OST",
    "tag": "动漫OST",
    "cover": "/images/covers/cover-t47.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/cruising-for-goblins.mp3",
      "/music/cruising-for-goblins.mp3"
    ],
    "mood": [
      "燃",
      "温暖"
    ],
    "scene": [
      "日常"
    ],
    "duration": 149
  },
  {
    "id": "t48",
    "t": "地下城 BOSS 战",
    "s": "Kevin MacLeod · 动漫OST",
    "tag": "动漫OST",
    "cover": "/images/covers/cover-t48.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/video-dungeon-boss.mp3",
      "/music/video-dungeon-boss.mp3"
    ],
    "mood": [
      "燃"
    ],
    "scene": [
      "日常",
      "运动"
    ],
    "duration": 134
  },
  {
    "id": "t49",
    "t": "地表世界",
    "s": "Kevin MacLeod · 动漫OST",
    "tag": "动漫OST",
    "cover": "/images/covers/cover-t49.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/overworld.mp3",
      "/music/overworld.mp3"
    ],
    "mood": [
      "温暖"
    ],
    "scene": [
      "日常",
      "通勤"
    ],
    "duration": 173
  },
  {
    "id": "t50",
    "t": "湮灭",
    "s": "Kevin MacLeod · 动漫OST",
    "tag": "动漫OST",
    "cover": "/images/covers/cover-t50.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/obliteration.mp3",
      "/music/obliteration.mp3"
    ],
    "mood": [
      "燃",
      "空灵"
    ],
    "scene": [
      "日常"
    ],
    "duration": 149
  },
  {
    "id": "t51",
    "t": "位移",
    "s": "Kevin MacLeod · 动漫OST",
    "tag": "动漫OST",
    "cover": "/images/covers/cover-t51.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/bit-shift.mp3",
      "/music/bit-shift.mp3"
    ],
    "mood": [
      "燃",
      "温暖"
    ],
    "scene": [
      "日常",
      "运动"
    ],
    "duration": 192
  },
  {
    "id": "t52",
    "t": "超级风暴",
    "s": "Kevin MacLeod · 动漫OST",
    "tag": "动漫OST",
    "cover": "/images/covers/cover-t52.webp",
    "src": [
      "https://mu-1317605628.cos.ap-guangzhou.myqcloud.com/music/mega-hyper-ultrastorm.mp3",
      "/music/mega-hyper-ultrastorm.mp3"
    ],
    "mood": [
      "燃"
    ],
    "scene": [
      "日常",
      "运动"
    ],
    "duration": 193
  }
];
