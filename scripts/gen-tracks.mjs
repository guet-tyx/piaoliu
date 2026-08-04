/**
 * 生成 src/data/tracks.ts（52 首曲目）
 *
 * 数据来源：
 * - t01-t04：保留现有 4 首（本地/远程多源）
 * - t05-t52：public/music/ 的 48 首 Kevin MacLeod CC BY 4.0 曲目，
 *   时长从 public/music/CREDITS.md 表格解析（避免手敲出错），
 *   中文曲名/风格/情绪/场景由下方 MAPPING 定义（星海电台风格命名）。
 *
 * 用法：node scripts/gen-tracks.mjs
 * 输出：src/data/tracks.ts（直接覆盖）
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** 主曲目（t01-t04，保持现有内容不变） */
const MAIN_TRACKS = [
  {
    id: "t01",
    t: "信风",
    s: "一支你没听过的乐队 · 后摇",
    tag: "后摇",
    cover: "/images/cover-anime-1.png",
    src: [
      "/audio/zen.mp3",
      "https://incompetech.com/music/royalty-free/mp3-royaltyfree/That%20Zen%20Moment.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    ],
    mood: ["治愈", "平静"],
    scene: ["深夜", "学习"],
    duration: 60,
  },
  {
    id: "t02",
    t: "晚风告别式",
    s: "环境电子 · 深夜电台",
    tag: "环境电子",
    cover: "/images/cover-anime-4.png",
    src: [
      "/audio/gymnopedie1.mp3",
      "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Gymnopedie%20No%201.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    ],
    mood: ["伤感", "空灵"],
    scene: ["深夜", "雨天"],
    duration: 65,
  },
  {
    id: "t03",
    t: "凌晨三点半的港",
    s: "爵士嘻哈 · 失眠人士精选",
    tag: "爵士嘻哈",
    cover: "/images/cover-anime-2.png",
    src: [
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3",
    ],
    mood: ["伤感", "平静"],
    scene: ["深夜"],
    duration: 340,
  },
  {
    id: "t04",
    t: "雨季漂流记",
    s: "氛围 · 下雨天限定",
    tag: "氛围",
    cover: "/images/cover-anime-3.png",
    src: [
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3",
    ],
    mood: ["平静", "伤感"],
    scene: ["雨天", "冥想"],
    duration: 300,
  },
];

/**
 * 新曲目映射：文件名 → 星海电台命名 + 风格/情绪/场景
 * （原曲名以注释保留，符合 CC BY 4.0 署名要求：s 字段统一署 Kevin MacLeod）
 */
const MAPPING = [
  // —— 深夜电台 · 后摇诗篇（10 首，含 t01-t03）——
  ["airship-serenity.mp3", "星舰泊港", "后摇", ["治愈", "空灵"], ["深夜"]],
  ["how-it-begins.mp3", "一切的开始", "后摇", ["治愈", "平静"], ["深夜"]],
  ["long-time-coming.mp3", "久别重逢", "氛围", ["温暖", "治愈"], ["深夜"]],
  ["unanswered-questions.mp3", "无人应答", "氛围", ["空灵", "伤感"], ["深夜"]],
  ["nowhere-land.mp3", "无处之地", "氛围", ["空灵", "平静"], ["深夜", "冥想"]],
  ["bittersweet.mp3", "微苦的甜", "后摇", ["伤感", "温暖"], ["深夜", "雨天"]],
  ["hypnothis.mp3", "入梦仪式", "氛围", ["平静", "空灵"], ["深夜"]],
  // —— 日系 breeze · 风之旅（10 首）——
  ["kawai-kitsune.mp3", "狐色晴天", "日系", ["温暖", "治愈"], ["通勤"]],
  ["chipper-doodle-v2.mp3", "轻快涂鸦", "日系", ["温暖", "治愈"], ["通勤"]],
  ["super-friendly.mp3", "超级友善", "日系", ["温暖"], ["通勤", "日常"]],
  ["newer-wave.mp3", "新浪潮", "日系", ["燃"], ["运动", "通勤"]],
  ["voxel-revolution.mp3", "体素革命", "日系", ["燃"], ["运动"]],
  ["digital-lemonade.mp3", "数字柠檬水", "日系", ["温暖", "治愈"], ["通勤"]],
  ["bit-quest.mp3", "比特探险", "日系", ["燃", "温暖"], ["运动"]],
  ["level-up.mp3", "等级提升", "电子", ["燃"], ["运动"]],
  ["pinball-spring-160.mp3", "弹珠之春", "日系", ["温暖"], ["通勤", "运动"]],
  ["future-cha-cha.mp3", "未来恰恰", "日系", ["温暖", "燃"], ["通勤"]],
  // —— 学习自习室 · 轻音（8 首）——
  ["andreas-theme.mp3", "安德里斯的晨光", "纯音乐", ["平静"], ["学习"]],
  ["balloon-game.mp3", "气球游戏", "纯音乐", ["温暖", "平静"], ["学习"]],
  ["brain-dance.mp3", "思绪之舞", "纯音乐", ["平静"], ["学习", "冥想"]],
  ["one-sly-move.mp3", "轻巧一步", "纯音乐", ["平静"], ["学习"]],
  ["getting-it-done.mp3", "完成清单", "轻音乐", ["平静", "治愈"], ["学习"]],
  ["floating-cities.mp3", "浮游之城", "纯音乐", ["空灵", "平静"], ["冥想", "学习"]],
  ["pamgaea.mp3", "潘加亚纪", "纯音乐", ["空灵"], ["冥想", "学习"]],
  ["laser-groove.mp3", "激光律动", "轻音乐", ["平静", "温暖"], ["学习"]],
  // —— 雨の日 · 钢琴物语（8 首，含 t04）——
  ["killing-time.mp3", "消磨时光", "氛围", ["伤感", "平静"], ["雨天"]],
  ["exit-the-premises.mp3", "离席", "环境", ["伤感", "空灵"], ["雨天", "深夜"]],
  ["cut-and-run.mp3", "仓促逃亡", "环境", ["伤感", "燃"], ["雨天"]],
  ["rhinoceros.mp3", "犀牛漫步", "钢琴", ["平静", "伤感"], ["雨天"]],
  ["blippy-trance.mp3", "点点迷境", "环境", ["空灵", "平静"], ["雨天", "冥想"]],
  ["ethernight-club.mp3", "永夜俱乐部", "氛围", ["治愈", "空灵"], ["深夜", "雨天"]],
  ["blip-stream.mp3", "雨点数据流", "电子", ["平静", "空灵"], ["雨天"]],
  // —— 星尘歌单 · 电子漫游（8 首）——
  ["cyborg-ninja.mp3", "机械忍者", "电子", ["燃"], ["运动"]],
  ["cipher.mp3", "密文", "电子", ["燃", "空灵"], ["运动"]],
  ["reformat.mp3", "重格式化", "电子", ["燃"], ["运动"]],
  ["laserpack.mp3", "激光背包", "电子", ["燃"], ["运动"]],
  ["shiny-tech.mp3", "闪耀科技", "电子", ["燃", "温暖"], ["运动", "通勤"]],
  ["robobozo.mp3", "机器人波佐", "电子", ["燃", "治愈"], ["运动"]],
  ["ouroboros.mp3", "衔尾之环", "电子", ["燃", "空灵"], ["运动", "深夜"]],
  ["cut-trance.mp3", "切割迷幻", "电子", ["燃"], ["运动"]],
  // —— 次元之门 · 动漫 OST（8 首）——
  ["morgana-rides.mp3", "摩根娜骑乘", "动漫OST", ["温暖", "燃"], ["日常"]],
  ["adventures-in-adventureland.mp3", "冒险岛游记", "动漫OST", ["温暖", "燃"], ["日常"]],
  ["cruising-for-goblins.mp3", "哥布林巡航", "动漫OST", ["燃", "温暖"], ["日常"]],
  ["video-dungeon-boss.mp3", "地下城 BOSS 战", "动漫OST", ["燃"], ["日常", "运动"]],
  ["overworld.mp3", "地表世界", "动漫OST", ["温暖"], ["日常", "通勤"]],
  ["obliteration.mp3", "湮灭", "动漫OST", ["燃", "空灵"], ["日常"]],
  ["bit-shift.mp3", "位移", "动漫OST", ["燃", "温暖"], ["日常", "运动"]],
  ["mega-hyper-ultrastorm.mp3", "超级风暴", "动漫OST", ["燃"], ["日常", "运动"]],
];

/** 解析 CREDITS.md 表格 → { 文件名: 秒 } */
function parseDurations() {
  const md = readFileSync(join(ROOT, "public/music/CREDITS.md"), "utf8");
  const map = new Map();
  for (const line of md.split("\n")) {
    const m = line.match(/`([^`]+\.mp3)` \| [^|]+ \| (\d{2}):(\d{2}):(\d{2}) \|/);
    if (!m) continue;
    const [, file, h, mi, s] = m;
    map.set(file, Number(h) * 3600 + Number(mi) * 60 + Number(s));
  }
  return map;
}

const durations = parseDurations();
const missing = MAPPING.filter(([file]) => !durations.has(file));
if (missing.length > 0) {
  console.error("CREDITS.md 中找不到以下文件的时长：", missing.map(([f]) => f));
  process.exit(1);
}

/** 生成新曲目（t05 起） */
const generated = MAPPING.map(([file, t, tag, mood, scene], i) => {
  const id = `t${String(i + 5).padStart(2, "0")}`;
  return {
    id,
    t,
    s: `Kevin MacLeod · ${tag}`, // CC BY 4.0 署名
    tag,
    cover: `/images/covers/cover-${id}.webp`,
    src: [`/music/${file}`],
    mood,
    scene,
    duration: durations.get(file),
  };
});

const tracks = [...MAIN_TRACKS, ...generated];

// 校验：id 唯一、时长存在、情绪/场景合法
const ids = new Set();
for (const tr of tracks) {
  if (ids.has(tr.id)) throw new Error(`重复 id: ${tr.id}`);
  ids.add(tr.id);
  if (!Number.isFinite(tr.duration) || tr.duration <= 0) {
    throw new Error(`${tr.id} 时长非法`);
  }
  if (tr.mood.length === 0 || tr.scene.length === 0) {
    throw new Error(`${tr.id} 缺少情绪/场景标签`);
  }
}

const out = `import type { Track } from "@/types/music";

/**
 * 星海电台曲目（52 首）
 * - t01-t04：原型保留曲目（本地音频优先，incompetech / SoundHelix 兜底）
 * - t05-t52：Kevin MacLeod（incompetech.com）CC BY 4.0，本地 /music/ 直放；
 *   中文曲名为星海电台风格命名，原曲名与时长见 public/music/CREDITS.md
 * - 本文件由 scripts/gen-tracks.mjs 生成，勿手改数据段
 */
export const TRACKS: Track[] = ${JSON.stringify(tracks, null, 2)};
`;

writeFileSync(join(ROOT, "src/data/tracks.ts"), out);
console.log(`✅ src/data/tracks.ts 已生成：${tracks.length} 首（t01-t04 + ${generated.length} 首新曲）`);
