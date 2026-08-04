"""
Generate 4 character chat background images
Uses SenseNova text-to-image API + PIL post-processing
"""

import subprocess
import json
import os
import sys
from PIL import Image, ImageFilter
import numpy as np
import time

SN_IMAGE_BASE = r"C:\Users\tyx\.agents\skills\SenseNova-Skills\skills\sn-image-base"
OUTPUT_DIR = r"D:\agent开发\前端demo\二次元音乐网站\public\images"
TEMP_DIR = r"C:\tmp\openclaw-sn-image"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

PROMPTS = {
    "chat-bg-sio": (
        "anime cel-shaded background scene, calm starry sea at night, "
        "gentle waves with soft foam, small paper boats floating on water, "
        "starry sky with twinkling stars, warm purple-pink color palette, "
        "soft moonlight reflection on water, flat simple colors, clean line art, "
        "center area is open water with no objects, "
        "anime scenery background, peaceful atmosphere"
    ),
    "chat-bg-lumen": (
        "anime cel-shaded background scene, a tall lighthouse on a cliff by the sea at night, "
        "aurora borealis in green and blue sweeping across the sky, "
        "distant stars, gentle ocean waves, cool blue-white color palette, "
        "lighthouse is on the right side of frame, soft beacon light, "
        "flat simple colors, clean line art, "
        "center-left area is open sky and sea with no objects, "
        "anime scenery background, serene and majestic atmosphere"
    ),
    "chat-bg-soku": (
        "anime cel-shaded background scene, night city skyline viewed from above, "
        "colorful neon signs and lights, warm gold and blue color palette, "
        "city silhouette at the bottom of frame, electric neon glow in pink and cyan, "
        "floating music notes subtly scattered, "
        "flat simple colors, clean line art, "
        "center area is open night sky with no objects, "
        "anime scenery background, vibrant urban atmosphere"
    ),
    "chat-bg-yoe": (
        "anime cel-shaded background scene, deep space with constellation patterns, "
        "stars connected by thin glowing lines forming constellations, "
        "spiral nebula in the upper left, mystical purple and dark blue tones, "
        "scattered star clusters, subtle celestial glow, "
        "flat simple colors, clean line art, "
        "center area is open deep space with scattered stars but no large objects, "
        "anime scenery background, mystical and cosmic atmosphere"
    ),
}

def generate_image(prompt, output_path):
    cmd = [
        "python",
        os.path.join(SN_IMAGE_BASE, "scripts", "sn_agent_runner.py"),
        "sn-image-generate",
        "--prompt", prompt,
        "--aspect-ratio", "4:3",
        "--image-size", "2k",
        "--output-format", "json",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    for line in result.stdout.strip().split("\n"):
        try:
            data = json.loads(line)
            if data.get("status") == "ok":
                gen_path = data["output"]
                img = Image.open(gen_path)
                img.save(output_path)
                return True
        except json.JSONDecodeError:
            continue
    return False

def process_background(input_path, name):
    output_path = os.path.join(OUTPUT_DIR, f"{name}.webp")
    img = Image.open(input_path)
    img_resized = img.resize((1024, 768), Image.LANCZOS)
    img_rgba = img_resized.convert("RGBA")
    pixels = np.array(img_rgba, dtype=np.float32)
    r, g, b = pixels[:,:,0], pixels[:,:,1], pixels[:,:,2]
    gray = 0.299 * r + 0.587 * g + 0.114 * b
    sf = 0.6
    pixels[:,:,0] = gray + (r - gray) * sf
    pixels[:,:,1] = gray + (g - gray) * sf
    pixels[:,:,2] = gray + (b - gray) * sf
    pixels = np.clip(pixels, 0, 255).astype(np.uint8)
    img_desat = Image.fromarray(pixels, "RGBA")
    img_blur = img_desat.filter(ImageFilter.GaussianBlur(radius=2))
    img_blur.save(output_path, "WEBP", quality=70, lossless=False)
    return os.path.getsize(output_path)

def main():
    total = len(PROMPTS)
    success = 0
    print(f"Generating {total} chat background images...")
    print("=" * 60)
    for name, prompt in PROMPTS.items():
        print(f"\n[{success+1}/{total}] Generating {name}...")
        temp_png = os.path.join(TEMP_DIR, f"gen_{name}.png")
        t0 = time.time()
        ok = generate_image(prompt, temp_png)
        t1 = time.time()
        if not ok:
            print(f"  FAILED ({t1-t0:.1f}s)")
            continue
        t2 = time.time()
        size = process_background(temp_png, name)
        t3 = time.time()
        print(f"  OK {name}.webp ({t1-t0:.1f}s + {t3-t2:.1f}s) -> {size/1024:.1f}KB")
        success += 1
        if success < total:
            time.sleep(0.5)
    print(f"\nDone! {success}/{total} succeeded")

if __name__ == "__main__":
    sys.exit(main())