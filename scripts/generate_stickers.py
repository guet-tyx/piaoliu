"""
Generate 32 chibi expression stickers (4 characters × 8 stickers each)
Uses SenseNova text-to-image API + PIL post-processing

Q版 Chibi 大头风格，2.5-3 头身，LINE贴纸风
"""

import subprocess
import json
import os
import sys
from PIL import Image
import numpy as np
import time

# ============================================================
# CONFIGURATION
# ============================================================
SN_IMAGE_BASE = r"C:\Users\tyx\.agents\skills\SenseNova-Skills\skills\sn-image-base"
OUTPUT_DIR = r"D:\agent开发\前端demo\二次元音乐网站\public\images"
TEMP_DIR = r"C:\tmp\openclaw-sn-image"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# ============================================================
# 32 CHIBI STICKER PROMPTS
# ============================================================
# Each: chibi 2.5-head proportion, pure white background, cel-shaded anime style,
# character identity preserved (hair color, eyes, accessories)

STICKER_PROMPTS = {
    # ===== SIO (汐) - 电台导航少女, 紫色短发, 白色耳机, 蓝紫眼 =====
    "sio-sticker-01": (
        "chibi anime sticker, 2.5 heads tall cute girl, deep purple short bob hair, "
        "white over-ear headphones, big blue-purple sparkling eyes, tilted head, "
        "waving one hand with gentle smile, warm smile expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "soft warm purple-pink tone, highly detailed character, sticker design"
    ),
    "sio-sticker-02": (
        "chibi anime sticker, 2.5 heads tall cute girl, deep purple short bob hair, "
        "white over-ear headphones, big blue-purple sparkling eyes, "
        "both hands making a large heart shape above head, bright happy smile, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "soft warm purple-pink tone, love heart gesture, sticker design"
    ),
    "sio-sticker-03": (
        "chibi anime sticker, 2.5 heads tall cute girl, deep purple short bob hair, "
        "white over-ear headphones, big blue-purple eyes wide open in surprise, "
        "mouth open in shock, both hands covering cheeks, surprised expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "soft warm purple-pink tone, sticker design"
    ),
    "sio-sticker-04": (
        "chibi anime sticker, 2.5 heads tall cute girl, deep purple short bob hair, "
        "white over-ear headphones, big blue-purple teary eyes, "
        "bottom lip pouting, trembling expression, looking sad, "
        "about to cry, hands rubbing eyes, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "soft warm purple-pink tone, sticker design"
    ),
    "sio-sticker-05": (
        "chibi anime sticker, 2.5 heads tall cute girl, deep purple short bob hair, "
        "white over-ear headphones, big blue-purple starry sparkling eyes, "
        "both arms raised up in joy, jumping pose, excited happy expression, "
        "big smile, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "soft warm purple-pink tone, sticker design"
    ),
    "sio-sticker-06": (
        "chibi anime sticker, 2.5 heads tall cute girl, deep purple short bob hair, "
        "white over-ear headphones, big blue-purple eyes, "
        "blushing face, both hands covering face peeking through fingers, "
        "shy embarrassed expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "soft warm purple-pink tone, blush, sticker design"
    ),
    "sio-sticker-07": (
        "chibi anime sticker, 2.5 heads tall cute girl, deep purple short bob hair, "
        "white over-ear headphones, big blue-purple angry eyes, "
        "puffed cheeks, arms crossed, angry pouting expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "soft warm purple-pink tone, sticker design"
    ),
    "sio-sticker-08": (
        "chibi anime sticker, 2.5 heads tall cute girl, deep purple short bob hair, "
        "white over-ear headphones, big blue-purple sleepy half-closed eyes, "
        "yawning, rubbing eyes, holding a small pillow, sleepy expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "soft warm purple-pink tone, goodnight, sticker design"
    ),

    # ===== LUMEN (流明) - 灯塔守望者, 银白长发, 蓝瞳 =====
    "lumen-sticker-01": (
        "chibi anime sticker, 2.5 heads tall cute girl, silver-white long straight hair, "
        "center part, big bright blue eyes, gentle closed-eye smile, "
        "hands folded together in front, serene expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "cool blue-white tone, gentle lighthouse keeper, sticker design"
    ),
    "lumen-sticker-02": (
        "chibi anime sticker, 2.5 heads tall cute girl, silver-white long straight hair, "
        "center part, big bright blue sparkling eyes, "
        "one hand raised with fingertip glowing, eyes lit up with wonder, "
        "amazed expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "cool blue-white tone, glowing light effect, sticker design"
    ),
    "lumen-sticker-03": (
        "chibi anime sticker, 2.5 heads tall cute girl, silver-white long straight hair, "
        "center part, big bright blue eyes wide in surprise, "
        "one hand gently covering mouth, slight gasp, surprised expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "cool blue-white tone, sticker design"
    ),
    "lumen-sticker-04": (
        "chibi anime sticker, 2.5 heads tall cute girl, silver-white long straight hair, "
        "center part, big bright blue eyes with worried eyebrows, "
        "both hands clasped together at chest, concerned expression, "
        "slight frown, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "cool blue-white tone, sticker design"
    ),
    "lumen-sticker-05": (
        "chibi anime sticker, 2.5 heads tall cute girl, silver-white long straight hair, "
        "center part, big bright blue eyes, gentle guiding smile, "
        "one arm extended forward with open palm, guiding gesture, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "cool blue-white tone, sticker design"
    ),
    "lumen-sticker-06": (
        "chibi anime sticker, 2.5 heads tall cute girl, silver-white long straight hair, "
        "center part, eyes closed peacefully, "
        "hands pressed together in prayer pose, gentle serene smile, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "cool blue-white tone, meditative, sticker design"
    ),
    "lumen-sticker-07": (
        "chibi anime sticker, 2.5 heads tall cute girl, silver-white long straight hair, "
        "center part, big bright blue eyes with tear glistening, "
        "one hand over heart, touched moved expression, gentle teary smile, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "cool blue-white tone, moved to tears, sticker design"
    ),
    "lumen-sticker-08": (
        "chibi anime sticker, 2.5 heads tall cute girl, silver-white long straight hair, "
        "center part, big bright blue sleepy eyes, "
        "both arms stretched up high, yawning, stretching, morning feeling, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "cool blue-white tone, morning stretch, sticker design"
    ),

    # ===== SOKU (朔空) - 夜航 DJ, 金色短发, 蓝瞳 =====
    "soku-sticker-01": (
        "chibi anime sticker, 2.5 heads tall cute boy, golden short messy hair, "
        "big bright blue eyes, big cheerful grin, "
        "one arm waving vigorously, energetic greeting expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "warm gold-blue tone, energetic DJ, sticker design"
    ),
    "soku-sticker-02": (
        "chibi anime sticker, 2.5 heads tall cute boy, golden short messy hair, "
        "big bright blue excited eyes, "
        "wearing headphones, hands in DJ mixing pose, "
        "big grin, hyped expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "warm gold-blue tone, DJ turntable gesture, sticker design"
    ),
    "soku-sticker-03": (
        "chibi anime sticker, 2.5 heads tall cute boy, golden short messy hair, "
        "big bright blue eyes, laughing hard with mouth wide open, "
        "holding stomach, tears of joy flying, "
        "ROFL laughing expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "warm gold-blue tone, sticker design"
    ),
    "soku-sticker-04": (
        "chibi anime sticker, 2.5 heads tall cute boy, golden short messy hair, "
        "big bright blue sparkling eyes, "
        "one hand giving thumbs up, other hand on hip, "
        "winking, confident cool expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "warm gold-blue tone, sticker design"
    ),
    "soku-sticker-05": (
        "chibi anime sticker, 2.5 heads tall cute boy, golden short messy hair, "
        "big bright blue eyes wide with shock, "
        "jaw dropped, both hands on cheeks, "
        "completely shocked expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "warm gold-blue tone, sticker design"
    ),
    "soku-sticker-06": (
        "chibi anime sticker, 2.5 heads tall cute boy, golden short messy hair, "
        "big bright blue eyes, "
        "one hand making peace sign V near face, "
        "winking, playful cheeky expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "warm gold-blue tone, sticker design"
    ),
    "soku-sticker-07": (
        "chibi anime sticker, 2.5 heads tall cute boy, golden short messy hair, "
        "big bright blue teary eyes, "
        "sitting on floor, drawing circles with finger, "
        "small rain cloud above head, sad neglected expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "warm gold-blue tone, sticker design"
    ),
    "soku-sticker-08": (
        "chibi anime sticker, 2.5 heads tall cute boy, golden short messy hair, "
        "big bright blue determined eyes, "
        "one fist raised forward, other arm back, "
        "running forward pose, motivated fiery expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "warm gold-blue tone, go get em, sticker design"
    ),

    # ===== YOE (悠) - 星图占卜师, 黑色长发蓝渐变, 紫瞳 =====
    "yoe-sticker-01": (
        "chibi anime sticker, 2.5 heads tall cute girl, long black hair with blue gradient tips, "
        "blunt bangs, big bright purple eyes, "
        "holding a small star chart, mysterious gentle smile, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "dark purple cool tone, mysterious fortune teller, sticker design"
    ),
    "yoe-sticker-02": (
        "chibi anime sticker, 2.5 heads tall cute girl, long black hair with blue gradient tips, "
        "blunt bangs, big bright purple focused eyes, "
        "holding a crystal ball with both hands, "
        "concentrating fortune telling expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "dark purple cool tone, sticker design"
    ),
    "yoe-sticker-03": (
        "chibi anime sticker, 2.5 heads tall cute girl, long black hair with blue gradient tips, "
        "blunt bangs, big bright purple eyes wide in surprise, "
        "mouth slightly open, one hand near cheek, "
        "surprised expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "dark purple cool tone, sticker design"
    ),
    "yoe-sticker-04": (
        "chibi anime sticker, 2.5 heads tall cute girl, long black hair with blue gradient tips, "
        "blunt bangs, big bright purple thoughtful eyes, "
        "chin resting on hand, thinking pose, "
        "question mark or sparkle above head, pondering expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "dark purple cool tone, sticker design"
    ),
    "yoe-sticker-05": (
        "chibi anime sticker, 2.5 heads tall cute girl, long black hair with blue gradient tips, "
        "blunt bangs, big bright purple gentle eyes, "
        "one arm extended pointing diagonally upward, "
        "guiding smile, star sparkle at fingertip, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "dark purple cool tone, sticker design"
    ),
    "yoe-sticker-06": (
        "chibi anime sticker, 2.5 heads tall cute girl, long black hair with blue gradient tips, "
        "blunt bangs, big bright purple eyes, "
        "one eye winking, finger to lips in shush gesture, "
        "playful mischievous expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "dark purple cool tone, sticker design"
    ),
    "yoe-sticker-07": (
        "chibi anime sticker, 2.5 heads tall cute girl, long black hair with blue gradient tips, "
        "blunt bangs, big bright purple eyes, "
        "both arms spread in helpless shrug, slight wry smile, "
        "shaking head, helpless expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "dark purple cool tone, sticker design"
    ),
    "yoe-sticker-08": (
        "chibi anime sticker, 2.5 heads tall cute girl, long black hair with blue gradient tips, "
        "blunt bangs, big bright purple sleepy eyes, "
        "yawning, one hand patting mouth, "
        "packing up star chart, tired expression, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "dark purple cool tone, closing shop, sticker design"
    ),
}


def remove_background(img, threshold=240):
    """Remove white/light background from image, return RGBA with transparent background"""
    img = img.convert('RGBA')
    pixels = np.array(img)

    r, g, b, a = pixels[:,:,0], pixels[:,:,1], pixels[:,:,2], pixels[:,:,3]

    # White pixels: all RGB > threshold
    white_mask = (r > threshold) & (g > threshold) & (b > threshold)

    # Color saturation: difference between max and min RGB
    saturation = np.maximum(r, np.maximum(g, b)) - np.minimum(r, np.minimum(g, b))

    # Background = white AND low saturation (to preserve light-colored elements)
    bg_mask = white_mask & (saturation < 10)

    # Apply transparency
    pixels[bg_mask, 3] = 0

    return Image.fromarray(pixels)


def generate_image(prompt, output_path):
    """Call sn-image-generate API and save output"""
    cmd = [
        "python",
        os.path.join(SN_IMAGE_BASE, "scripts", "sn_agent_runner.py"),
        "sn-image-generate",
        "--prompt", prompt,
        "--aspect-ratio", "1:1",
        "--image-size", "2k",
        "--output-format", "json",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

    # Parse JSON output
    for line in result.stdout.strip().split("\n"):
        try:
            data = json.loads(line)
            if data.get("status") == "ok":
                gen_path = data["output"]
                img = Image.open(gen_path)
                img.save(output_path)
                return True
            else:
                print(f"  API error: {data.get('error', 'unknown')}")
                return False
        except json.JSONDecodeError:
            continue

    print(f"  Failed to parse API output: {result.stdout[:200]}")
    print(f"  Stderr: {result.stderr[:200]}")
    return False


def process_sticker(input_path, name):
    """Post-process: remove background, resize to 512x512, save as WebP"""
    output_path = os.path.join(OUTPUT_DIR, f"{name}.webp")

    # Load and remove background
    img = Image.open(input_path)
    clean = remove_background(img)

    # Resize to 512x512 (square sticker size)
    resized = clean.resize((512, 512), Image.LANCZOS)
    resized.save(output_path, "WEBP", quality=85, lossless=False)
    size = os.path.getsize(output_path)

    return size


def main():
    total = len(STICKER_PROMPTS)
    success = 0
    fail = 0

    print(f"Starting generation of {total} chibi sticker images...")
    print("=" * 60)

    for name, prompt in STICKER_PROMPTS.items():
        print(f"\n[{success+fail+1}/{total}] Generating {name}...")

        # Generate
        temp_png = os.path.join(TEMP_DIR, f"gen_{name}.png")
        t0 = time.time()
        ok = generate_image(prompt, temp_png)
        t1 = time.time()
        if not ok:
            print(f"  ✗ FAILED ({t1-t0:.1f}s)")
            fail += 1
            continue

        # Post-process
        t2 = time.time()
        size = process_sticker(temp_png, name)
        t3 = time.time()

        print(f"  ✓ OK (gen: {t1-t0:.1f}s, proc: {t3-t2:.1f}s) → {size/1024:.1f}KB")

        success += 1

        # Small delay between API calls
        if success + fail < total:
            time.sleep(0.5)

    print("\n" + "=" * 60)
    print(f"Done! {success}/{total} succeeded, {fail} failed")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())