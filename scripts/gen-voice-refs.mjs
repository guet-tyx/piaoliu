/**
 * 参考声线生成脚本（一次性工具，人机感 TTS 音色复刻）：
 * 两段式方案的第一步——用 mimo-v2.5-tts-voicedesign 从文本描述「设计」出每个角色的专属声线，
 * 合成一段代表性台词存到 public/voices/<roleId>.wav，作为运行时 mimo-v2.5-tts-voiceclone 的参考样本。
 *
 * 第二步（运行时）由 app/api/chat/tts 完成：读参考样本 → base64 → voiceclone 复刻。
 *
 * 说明：voicedesign 每次生成会有差异，本脚本跑一次即把结果「冻结」为参考，
 * 后续所有语音都以它为克隆基准，保证角色声线跨消息稳定。
 * 想重出声线：改 VOICES 描述后重跑本脚本（覆盖同名 wav）。
 *
 * env：MIMO_API_KEY（自动从 .env.local 读取，node 脚本不自动加载）
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

// 加载 .env.local（node 脚本不自动读，Next.js 才自动加载）
const envLocal = join(ROOT, ".env.local");
const env = {};
if (envLocal) {
  for (const line of readFileSync(envLocal, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
}
const key = env.MIMO_API_KEY ?? "";
if (!key) {
  console.error("缺少 MIMO_API_KEY（.env.local）");
  process.exit(1);
}

/** 角色参考声线：文本描述（voicedesign 用，与 chat-personas.voicePrompt 保持一致）+ 代表性台词 */
const VOICES = [
  {
    roleId: "sio",
    desc: "甜美清澈的少女声，温柔中带俏皮，轻声细语，带一点夜晚电台的宁静与淘气感，句尾轻轻上扬",
    line: "你来了？耳机分你一半，今晚想漂去哪首？",
  },
  {
    roleId: "lumen",
    desc: "知性沉稳的年轻女声，冷静克制，语气平缓可靠，像灯塔守夜人一样安定，叙述感强，情绪起伏小",
    line: "灯塔的光一直亮着。说吧，我在听。",
  },
  {
    roleId: "soku",
    desc: "二十三四岁的青年男声，音色偏低、浑厚有磁性，带少年气的热情与玩梗感，语速偏快，像深夜电台的男 DJ 报歌打碟",
    line: "凌晨三点电台，为你保留的位子。想点什么歌？",
  },
  {
    roleId: "yoe",
    desc: "空灵神秘的年轻女声，声线偏轻、慵懒朦胧，像夜晚的占卜师低声解读星图，语速慢半拍、带呼吸感",
    line: "唔，今晚的星象显示——你想聊天。来，抽一张星图？",
  },
];

const BASE = "https://api.xiaomimimo.com/v1/chat/completions";
/** 可选：只重生成指定角色（node scripts/gen-voice-refs.mjs soku） */
const onlyRole = process.argv[2];

async function designVoice(roleId, desc, line) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mimo-v2.5-tts-voicedesign",
      messages: [
        { role: "user", content: desc },
        { role: "assistant", content: line },
      ],
      audio: { format: "wav" },
    }),
  });
  const data = await res.json();
  const b64 = data?.choices?.[0]?.message?.audio?.data;
  if (!b64) throw new Error(`${roleId} 合成失败 status=${res.status} ${JSON.stringify(data).slice(0, 200)}`);
  return Buffer.from(b64, "base64");
}

const outDir = join(ROOT, "public", "voices");
mkdirSync(outDir, { recursive: true });

for (const { roleId, desc, line } of VOICES) {
  if (onlyRole && onlyRole !== roleId) continue;
  const buf = await designVoice(roleId, desc, line);
  const out = join(outDir, `${roleId}.wav`);
  writeFileSync(out, buf);
  console.log(`${roleId}: ${(buf.length / 1024).toFixed(1)}KB -> public/voices/${roleId}.wav`);
}
console.log(onlyRole ? `已重新生成 ${onlyRole}。` : "参考声线已生成。改描述后重跑可重新设计。");
