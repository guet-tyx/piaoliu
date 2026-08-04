/**
 * 音色克隆工具：把 public/myvoices/ 下的参考音频用 mimo-v2.5-tts-voiceclone 复刻。
 *
 * 关键：参考质量决定克隆像不像。长录音（>45s）直接整段喂给模型会被噪声/停顿/背景声污染，
 * 本脚本自动解码并裁出「语音最密集的 20s 干净片段」→ 归一化 + 重采样 24kHz 单声道 →
 * 作为克隆参考（长样本大幅提升像度，实测整段喂 6 分钟录音克隆失真明显）。
 *
 * 用法：
 *   node scripts/clone-voices.mjs                 # 全部（跳过 -clone 产物）
 *   node scripts/clone-voices.mjs v1.mp3 v1-new   # 指定输入 + 输出名
 *   # 手动指定切片（源录音太长/自动选段不满意时）：开始秒数 + 时长（默认 20s）
 *   CLIP_START=450 CLIP_LEN=20 node scripts/clone-voices.mjs v3.mp3 v3
 *   # 本机 IP 被 MiMo 限流(429)时，可经代理换出口 IP（Node 24+）：
 *   NODE_USE_ENV_PROXY=1 HTTPS_PROXY=http://127.0.0.1:7897 node scripts/clone-voices.mjs v1-new-clip.wav v1
 *
 * env：MIMO_API_KEY（自动从 .env.local 读取）；CLIP_START/CLIP_LEN 手动切片
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { MPEGDecoder } from "mpg123-decoder";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "public", "myvoices");
/** 超过该时长（秒）的源文件先裁剪干净片段，不整段喂给克隆模型 */
const LONG_REF_SEC = 45;
const CLIP_SEC = 20;
const TARGET_RATE = 24000;

// 加载 .env.local
const env = {};
for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const key = env.MIMO_API_KEY ?? "";
if (!key) {
  console.error("缺少 MIMO_API_KEY（.env.local）");
  process.exit(1);
}

/** 待合成文本（各输出一致便于对比） */
const TEXT = "你好呀，很高兴认识你。今晚想听点什么歌呢？耳机分你一半。";

const BASE = "https://api.xiaomimimo.com/v1/chat/completions";

/** 解码 mp3 → { mono 双声道平均 Float32Array, samplesDecoded, sampleRate } */
async function decodeMp3(file) {
  const decoder = new MPEGDecoder();
  await decoder.ready;
  const { channelData, samplesDecoded, sampleRate } = decoder.decode(file);
  const mono = new Float32Array(samplesDecoded);
  const ch0 = channelData[0];
  const ch1 = channelData[1];
  for (let i = 0; i < samplesDecoded; i++) mono[i] = (ch0[i] + (ch1?.[i] ?? ch0[i])) / 2;
  return { mono, samplesDecoded, sampleRate };
}

/** 找语音最密集的连续 CLIP_SEC 秒片段起始下标（2s 窗口 RMS 滑动求和） */
function findBestStart(mono, sampleRate, total) {
  const win = Math.round(sampleRate * 2);
  const winCount = Math.max(1, Math.floor(total / win));
  const rms = new Array(winCount);
  for (let i = 0; i < winCount; i++) {
    const s = i * win;
    const n = Math.min(win, total - s);
    let e = 0;
    for (let j = 0; j < n; j++) e += mono[s + j] ** 2;
    rms[i] = Math.sqrt(e / n);
  }
  const span = Math.round(CLIP_SEC / 2);
  let bestStart = 0, bestSum = -1;
  for (let i = 0; i + span <= winCount; i++) {
    let s = 0;
    for (let k = 0; k < span; k++) s += rms[i + k];
    if (s > bestSum) { bestSum = s; bestStart = i * win; }
  }
  return bestStart;
}

/** 裁片段 → 归一化 → 重采样 24kHz 单声道 16bit → WAV Buffer */
function makeClipWav(mono, sampleRate, startSample, lenSec) {
  const end = Math.min(mono.length, startSample + Math.round(lenSec * sampleRate));
  const seg = mono.subarray(startSample, end);
  let peak = 0;
  for (const x of seg) peak = Math.max(peak, Math.abs(x));
  const gain = peak > 0 ? 0.6 / peak : 1;
  const ratio = TARGET_RATE / sampleRate;
  const outLen = Math.round(seg.length * ratio);
  const pcm = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const src = Math.min(seg.length - 1, i / ratio);
    const lo = Math.floor(src), hi = Math.min(seg.length - 1, lo + 1);
    const f = src - lo;
    const v = (seg[lo] * (1 - f) + seg[hi] * f) * gain;
    pcm[i] = Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
  }
  const dataLen = pcm.length * 2;
  const wav = Buffer.alloc(44 + dataLen);
  wav.write("RIFF", 0); wav.writeUInt32LE(36 + dataLen, 4); wav.write("WAVE", 8);
  wav.write("fmt ", 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22); wav.writeUInt32LE(TARGET_RATE, 24);
  wav.writeUInt32LE(TARGET_RATE * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(dataLen, 40);
  for (let i = 0; i < pcm.length; i++) wav.writeInt16LE(pcm[i], 44 + i * 2);
  return wav;
}

/** 读参考：短文件直接用；长录音裁干净片段（可手动指定切片位置） */
async function loadReference(file, name) {
  const raw = readFileSync(file);
  const isMp3 = file.toLowerCase().endsWith(".mp3");
  if (!isMp3) return { buffer: raw, mime: "audio/wav", note: `${name} 直接使用` };
  const { mono, samplesDecoded, sampleRate } = await decodeMp3(raw);
  const dur = samplesDecoded / sampleRate;
  if (dur <= LONG_REF_SEC && process.env.CLIP_START === undefined) {
    return { buffer: raw, mime: "audio/mpeg", note: `${name}（${dur.toFixed(1)}s）直接使用` };
  }
  // 手动切片：CLIP_START 指定开始秒（CLIP_LEN 可选，默认 20s）；否则自动选语音最密集段
  const manual = process.env.CLIP_START !== undefined;
  const startSample = manual
    ? Math.min(samplesDecoded - 1, Math.round(Number(process.env.CLIP_START) * sampleRate))
    : findBestStart(mono, sampleRate, samplesDecoded);
  const lenSec = manual ? Number(process.env.CLIP_LEN ?? 20) : CLIP_SEC;
  const clip = makeClipWav(mono, sampleRate, startSample, lenSec);
  const clipPath = join(SRC_DIR, `${name}-clip.wav`);
  writeFileSync(clipPath, clip);
  const pos = Math.round(startSample / sampleRate);
  return {
    buffer: clip,
    mime: "audio/wav",
    note: `${name}（${dur.toFixed(0)}s）→ ${manual ? `手动切片 ${pos}s 起 ${lenSec}s` : `自动选 ${pos}s 起 20s`}（已存 ${name}-clip.wav）`,
  };
}

async function cloneVoice(name, file) {
  const ref = await loadReference(file, name);
  const b64 = ref.buffer.toString("base64");
  const sizeMb = (ref.buffer.length / 1024 / 1024).toFixed(2);
  console.log(`\n== ${name} ==`);
  console.log(`  参考：${ref.note}（${sizeMb}MB，base64 ${(b64.length / 1024 / 1024).toFixed(2)}MB）`);
  if (b64.length > 10 * 1024 * 1024) {
    console.log("  ⚠ 参考 base64 超 10MB 限制，继续尝试（可能被拒）");
  }
  const res = await fetch(BASE, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mimo-v2.5-tts-voiceclone",
      messages: [
        { role: "user", content: "" },
        { role: "assistant", content: TEXT },
      ],
      audio: { format: "wav", voice: `data:${ref.mime};base64,${b64}` },
    }),
  });
  const data = await res.json();
  const audioB64 = data?.choices?.[0]?.message?.audio?.data;
  if (!audioB64) {
    console.log(`  ✗ 克隆失败 status=${res.status} ${JSON.stringify(data).slice(0, 300)}`);
    return false;
  }
  const out = join(SRC_DIR, `${name}-clone.wav`);
  const outBuf = Buffer.from(audioB64, "base64");
  writeFileSync(out, outBuf);
  console.log(`  ✓ 克隆成功 -> ${(outBuf.length / 1024).toFixed(1)}KB ${name}-clone.wav`);
  return true;
}

const files = readdirSync(SRC_DIR).filter((f) => /\.(mp3|wav)$/i.test(f) && !f.includes("-clone"));
const onlyFile = process.argv[2];
const outName = process.argv[3];
if (!files.length) {
  console.error("public/myvoices/ 下没有 mp3/wav 参考文件");
  process.exit(1);
}
for (const f of files) {
  if (onlyFile && f !== onlyFile) continue;
  const base = outName ?? f.replace(/\.\w+$/, "");
  await cloneVoice(base, join(SRC_DIR, f));
}
console.log("\n完成。");
