#!/usr/bin/env python3
"""
批量生成歌单/歌曲封面（SenseNova 生图 + Pillow 转 300×300 webp）
- 6 张歌单封面：独特主题 prompt
- 52 张歌曲封面：按歌单风格分组 + 情绪变化（统一星海美学）
API key 从 ~/.zcode/v2/config.json 的 token.sensenova.cn provider 读取（不硬编码）。
用法：python scripts/gen-covers.py [--limit N] [--concurrency 3]
"""
import argparse
import concurrent.futures
import json
import os
import re
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUNNER = r"C:\Users\tyx\.agents\skills\sn-image-base\scripts\sn_agent_runner.py"
RAW_DIR = os.path.join(ROOT, "scripts", ".cover-raw")
PLC_DIR = os.path.join(ROOT, "public", "images", "playlist-covers")
CVR_DIR = os.path.join(ROOT, "public", "images", "covers")

BASE = ("anime album cover art, dreamy star sea night aesthetic, deep blue night sky "
        "with galaxy, soft cel shading, delicate lighting, square composition, no text, no letters")

# 歌单封面：独特主题（6 张）
PLAYLIST_PROMPTS = {
    "pl-night-postrock": BASE + ", post-rock mood, girl with headphones on a paper boat in quiet starry sea, melancholic calm",
    "pl-jp-breeze": BASE + ", japanese summer breeze, girl with wind-blown hair on bicycle by seaside, warm sunset pastel, cheerful",
    "pl-study-piano": BASE + ", study piano lofi, lighthouse keeper girl reading sheet music under warm lamp in starry tower, cozy quiet",
    "pl-rain-piano": BASE + ", rain day piano, girl holding umbrella beside grand piano in rain, reflections on wet street, blue-gray tones",
    "pl-stardust-electro": BASE + ", electro stardust, girl DJ with glowing headphones in neon space club among stars, energetic cyan-magenta",
    "pl-anime-ost": BASE + ", anime OST adventure, girl hero standing before a portal of light with airship silhouette, epic warm",
}

# 歌曲封面：按歌单风格分组的主题关键词（52 首 id 顺序对应 tracks.ts）
# 每项 = (风格词, 场景词)
TRACK_THEMES = {
    # 深夜电台
    "t01": ("paper boat alone in starry sea", "quiet"),
    "t02": ("girl waving goodbye to night wind", "melancholy"),
    "t03": ("harbor at 3am, neon reflections on water", "insomnia"),
    "t04": ("paper boat drifting in rain", "rain"),
    "t05": ("airship docked in the Milky Way", "serene"),
    "t06": ("first light over the sea", "hopeful"),
    "t07": ("reunion silhouette under stars", "warm"),
    "t08": ("girl asking the night sky questions", "dreamy"),
    "t09": ("land nowhere, floating island in void", "mystic"),
    "t10": ("sweet bitter starlight candy", "soft"),
    "t11": ("falling into dream, stars spiraling", "sleepy"),
    # 日系 breeze
    "t12": ("fox girl on sunny summer street", "bright"),
    "t13": ("doodle sketch notebook with stars", "playful"),
    "t14": ("friendly robot waving in sunset", "cheerful"),
    "t15": ("new wave surfing on moonlit wave", "fresh"),
    "t16": ("voxel revolution, cube world colorful", "energetic"),
    "t17": ("lemon soda with starlight bubbles", "refreshing"),
    "t18": ("bit quest, tiny pixel hero in star field", "fun"),
    "t19": ("level up, girl on stairs to sky", "upbeat"),
    "t20": ("pinball spring, bouncing star ball", "playful"),
    "t21": ("future cha cha, dancing under neon stars", "groovy"),
    # 学习自习室
    "t22": ("morning light on study desk, star bookmark", "calm"),
    "t23": ("balloon floating over open book", "gentle"),
    "t24": ("thoughts dancing as musical notes", "focused"),
    "t25": ("one sly step across the star map", "steady"),
    "t26": ("checklist done, satisfied smile", "accomplished"),
    "t27": ("floating city library in clouds", "lofty"),
    "t28": ("ancient land, quiet meadow under stars", "serene"),
    "t29": ("laser groove, thin light lines over desk", "sleek"),
    # 雨の日
    "t30": ("clock melting in rain, time passing", "rainy"),
    "t31": ("girl leaving a rainy theater, umbrella", "rainy"),
    "t32": ("running away in the rain, splash", "rainy"),
    "t33": ("rhino walking slowly in drizzle", "rainy"),
    "t34": ("tiny lights in raindrops maze", "rainy"),
    "t35": ("eternal night club with warm lamps in rain", "rainy"),
    "t36": ("data stream as raindrops on window", "rainy"),
    # 星尘电子
    "t37": ("cyborg ninja with glowing blade, star city", "neon"),
    "t38": ("cipher codes floating in space", "cyber"),
    "t39": ("reformat, grid world rebuilding with light", "cyber"),
    "t40": ("laser backpack jetting among stars", "neon"),
    "t41": ("shiny tech girl with holographic star", "glossy"),
    "t42": ("robot bozo dancing on neon stage", "playful"),
    "t43": ("ouroboros ring of stars, cycle", "mystic"),
    "t44": ("cut trance, light slices through dark", "cyber"),
    # 次元之门
    "t45": ("morgana riding a comet, cape flowing", "epic"),
    "t46": ("adventure in wonderland of stars", "epic"),
    "t47": ("goblin ship cruising the sky", "epic"),
    "t48": ("dungeon boss, dragon silhouette vs girl", "epic"),
    "t49": ("overworld, open map of star continents", "epic"),
    "t50": ("obliteration, meteor shower finale", "epic"),
    "t51": ("bit shift, dimensional portal shift", "epic"),
    "t52": ("super storm, girl riding a typhoon of stars", "epic"),
}


def load_sensenova_key():
    for path in (
        r"C:\Users\tyx\.zcode\v2\config.json",
        r"C:\Users\tyx\.zcode\cli\config.json",
    ):
        if not os.path.exists(path):
            continue
        s = open(path, encoding="utf-8").read()
        m = re.search(r'"baseURL"\s*:\s*"https://token\.sensenova\.cn/v1"[^}]*?"apiKey"\s*:\s*"([^"]+)"', s)
        if not m:
            i = s.find("token.sensenova.cn")
            if i != -1:
                m = re.search(r'"apiKey"\s*:\s*"([^"]+)"', s[max(0, i - 300):i + 300])
        if m:
            return m.group(1)
    raise SystemExit("未找到 sensenova API key（token.sensenova.cn provider）")


def generate_one(prompt: str, out_raw: str) -> str | None:
    """调用生图 runner，返回输出文件路径（失败返回 None）"""
    r = subprocess.run(
        [sys.executable, RUNNER, "sn-image-generate",
         "--prompt", prompt,
         "--aspect-ratio", "1:1", "--image-size", "2k",
         "--api-key", KEY,
         "--save-path", out_raw,
         "--output-format", "json"],
        capture_output=True, text=True, timeout=300, encoding="utf-8",
    )
    try:
        res = json.loads(r.stdout[-1000:])
        if res.get("status") == "ok":
            return res.get("output") or out_raw
    except Exception:
        pass
    print("   ✗ 失败:", (r.stdout + r.stderr)[-160:].replace("\n", " "))
    return None


def to_webp(src: str, dst: str) -> None:
    from PIL import Image
    img = Image.open(src).convert("RGB")
    img = img.resize((300, 300), Image.LANCZOS)
    img.save(dst, "WEBP", quality=82)
    os.remove(src)
    print(f"   ✓ {os.path.basename(dst)} ({os.path.getsize(dst)} B)")


def main():
    global KEY
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="只生成前 N 张（调试）")
    ap.add_argument("--concurrency", type=int, default=3)
    args = ap.parse_args()

    KEY = load_sensenova_key()
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(PLC_DIR, exist_ok=True)
    os.makedirs(CVR_DIR, exist_ok=True)

    jobs = []  # (输出 webp 路径, prompt)
    for pid, prompt in PLAYLIST_PROMPTS.items():
        jobs.append((os.path.join(PLC_DIR, f"{pid}.webp"), prompt))
    for tid, (theme, mood) in TRACK_THEMES.items():
        prompt = f"{BASE}, {theme}, {mood}, no text, no letters"
        jobs.append((os.path.join(CVR_DIR, f"cover-{tid}.webp"), prompt))

    if args.limit:
        jobs = jobs[: args.limit]
    print(f"共 {len(jobs)} 张，并发 {args.concurrency}")

    def work(job):
        dst, prompt = job
        if os.path.exists(dst):
            print(f"   ⏭ 已存在 {os.path.basename(dst)}")
            return True
        raw = os.path.join(RAW_DIR, f"{os.path.splitext(os.path.basename(dst))[0]}.png")
        out = generate_one(prompt, raw)
        if not out:
            return False
        to_webp(out, dst)
        return True

    t0 = time.time()
    ok = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as ex:
        for i, res in enumerate(ex.map(work, jobs), 1):
            ok += 1 if res else 0
            print(f"[{i}/{len(jobs)}] elapsed {time.time()-t0:.0f}s")
    print(f"完成：{ok}/{len(jobs)} 成功，{time.time()-t0:.0f}s")


if __name__ == "__main__":
    main()
