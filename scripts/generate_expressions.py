"""
Generate 12 character expression avatars (4 characters × 3 expressions each)
Uses SenseNova text-to-image API + PIL post-processing
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

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# ============================================================
# PROMPTS
# ============================================================
# Each prompt must specify:
# - Character identity (hair, eyes, accessories)
# - Expression (eyes, eyebrows, mouth)
# - Cel-shaded anime style
# - Pure white background
# - Bust/facial close-up composition

PROMPTS = {
    # ---- SIO (汐) - Purple-pink warm tone ----
    "sio-expr-listen": (
        "anime cel-shaded bust portrait of a girl, deep purple short bob hair, "
        "white headphones, blue-purple eyes, looking forward with soft focused eyes, "
        "mouth naturally closed, eyebrows straight, gentle attentive listening expression, "
        "warm purple-pink tone, flat simple colors, clean line art, "
        "pure white background, no gradient, front view, face close-up, anime illustration, soft lighting"
    ),
    "sio-expr-feel": (
        "anime cel-shaded bust portrait of a girl, deep purple short bob hair, "
        "white headphones, blue-purple eyes, eyes slightly downcast, gentle, "
        "mouth slightly pursed, eyebrows slightly raised, empathetic feeling expression, "
        "warm purple-pink tone, flat simple colors, clean line art, "
        "pure white background, no gradient, front view, face close-up, anime illustration, soft lighting"
    ),
    "sio-expr-smile": (
        "anime cel-shaded bust portrait of a girl, deep purple short bob hair, "
        "white headphones, blue-purple eyes, eyes crescent-shaped squinting, "
        "mouth upturned showing teeth, warm bright smile, eyebrows naturally relaxed, "
        "warm purple-pink tone, flat simple colors, clean line art, "
        "pure white background, no gradient, front view, face close-up, anime illustration, warm lighting"
    ),

    # ---- LUMEN (流明) - Blue-white cool tone ----
    "lumen-expr-gaze": (
        "anime cel-shaded bust portrait of a girl, silver-white long straight hair, "
        "center part, bright blue eyes, looking forward with calm slightly distant eyes, "
        "mouth naturally closed, eyebrows straight, serene lighthouse keeper expression, "
        "cool blue-white tone, flat simple colors, clean line art, "
        "pure white background, no gradient, front view, face close-up, anime illustration, cool lighting"
    ),
    "lumen-expr-light": (
        "anime cel-shaded bust portrait of a girl, silver-white long straight hair, "
        "center part, bright blue eyes, eyes wide open, pupils with bright highlights, "
        "mouth slightly open, eyebrows slightly raised, touched by light expression, "
        "cool blue-white tone, flat simple colors, clean line art, "
        "pure white background, no gradient, front view, face close-up, anime illustration, glowing"
    ),
    "lumen-expr-smile": (
        "anime cel-shaded bust portrait of a girl, silver-white long straight hair, "
        "center part, bright blue eyes, eyes soft and slightly curved, "
        "mouth slightly upturned in gentle smile, eyebrows naturally relaxed, "
        "peaceful warm smile, cool blue-white tone, flat simple colors, clean line art, "
        "pure white background, no gradient, front view, face close-up, anime illustration, soft lighting"
    ),

    # ---- SOKU (朔空) - Gold-blue warm tone ----
    "soku-expr-dj": (
        "anime cel-shaded bust portrait of a boy, golden short hair, "
        "blue eyes, excited eyes with sparkle, raised eyebrows, "
        "grinning showing teeth, energetic DJ expression, "
        "warm gold-blue tone, flat simple colors, clean line art, "
        "pure white background, no gradient, front view, face close-up, anime illustration, vibrant lighting"
    ),
    "soku-expr-feel": (
        "anime cel-shaded bust portrait of a boy, golden short hair, "
        "blue eyes, serious focused gaze, slightly squinting, "
        "mouth naturally closed, slight frown, immersed in rhythm expression, "
        "warm gold-blue tone, flat simple colors, clean line art, "
        "pure white background, no gradient, front view, face close-up, anime illustration, dim lighting"
    ),
    "soku-expr-recommend": (
        "anime cel-shaded bust portrait of a boy, golden short hair, "
        "blue eyes, sparkling eyes, raised eyebrows, "
        "mouth upturned showing teeth, one eyebrow higher than other, "
        "excited to share expression, warm gold-blue tone, flat simple colors, clean line art, "
        "pure white background, no gradient, front view, face close-up, anime illustration, bright lighting"
    ),

    # ---- YOE (悠) - Dark purple cool tone ----
    "yoe-expr-draw": (
        "anime cel-shaded bust portrait of a girl, long black hair with blue gradient tips, "
        "blunt bangs, bright blue eyes, deep thoughtful gaze looking to side, "
        "mouth naturally closed, slight frown, mysterious drawing expression, "
        "dark purple cool tone, flat simple colors, clean line art, "
        "pure white background, no gradient, three-quarter view, face close-up, anime illustration, dim lighting"
    ),
    "yoe-expr-gaze": (
        "anime cel-shaded bust portrait of a girl, long black hair with blue gradient tips, "
        "blunt bangs, bright blue eyes, slightly lowered head looking up from below, "
        "mouth naturally closed, straight eyebrows, penetrating gaze expression, "
        "dark purple cool tone, flat simple colors, clean line art, "
        "pure white background, no gradient, front view, face close-up, anime illustration, cool lighting"
    ),
    "yoe-expr-guide": (
        "anime cel-shaded bust portrait of a girl, long black hair with blue gradient tips, "
        "blunt bangs, bright blue eyes, gentle eyes looking straight ahead, "
        "mouth slightly upturned in soft smile, eyebrows naturally relaxed, "
        "comforting guiding expression, dark purple cool tone, flat simple colors, clean line art, "
        "pure white background, no gradient, front view, face close-up, anime illustration, warm lighting"
    ),
}


def remove_background(img, threshold=245):
    """Remove white/light background from image, return RGBA with transparent background"""
    img = img.convert('RGBA')
    pixels = np.array(img)

    r, g, b, a = pixels[:,:,0], pixels[:,:,1], pixels[:,:,2], pixels[:,:,3]

    # White pixels: all RGB > threshold
    white_mask = (r > threshold) & (g > threshold) & (b > threshold)

    # Color saturation: difference between max and min RGB
    saturation = np.maximum(r, np.maximum(g, b)) - np.minimum(r, np.minimum(g, b))

    # Background = white AND low saturation (to preserve white headphones)
    bg_mask = white_mask & (saturation < 8)

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
                # Copy/link to our output path
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


def process_image(input_path, name):
    """Post-process: remove background, resize, save as WebP"""
    # 256px version
    output_256 = os.path.join(OUTPUT_DIR, f"{name}.webp")
    # 64px version
    output_64 = os.path.join(OUTPUT_DIR, f"{name}-64.webp")

    # Load and remove background
    img = Image.open(input_path)
    clean = remove_background(img)

    # Resize to 256x256
    resized = clean.resize((256, 256), Image.LANCZOS)
    resized.save(output_256, "WEBP", quality=85, lossless=False)
    size_256 = os.path.getsize(output_256)

    # Resize to 64x64
    thumb = clean.resize((64, 64), Image.LANCZOS)
    thumb.save(output_64, "WEBP", quality=80, lossless=False)
    size_64 = os.path.getsize(output_64)

    return size_256, size_64


def main():
    total = len(PROMPTS)
    success = 0
    fail = 0

    print(f"Starting generation of {total} expression images...")
    print("=" * 60)

    for name, prompt in PROMPTS.items():
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
        size_256, size_64 = process_image(temp_png, name)
        t3 = time.time()

        print(f"  ✓ OK (gen: {t1-t0:.1f}s, proc: {t3-t2:.1f}s) "
              f"→ 256px: {size_256/1024:.1f}KB, 64px: {size_64/1024:.1f}KB")
        success += 1

        # Small delay between API calls
        if success + fail < total:
            time.sleep(0.5)

    print("\n" + "=" * 60)
    print(f"Done! {success}/{total} succeeded, {fail} failed")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())