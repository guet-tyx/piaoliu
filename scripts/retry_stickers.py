"""
Retry 2 failed sticker generations with adjusted prompts (avoiding sensitive keywords)
"""
import subprocess, json, os, sys, time
from PIL import Image
import numpy as np

SN_IMAGE_BASE = r"C:\Users\tyx\.agents\skills\SenseNova-Skills\skills\sn-image-base"
OUTPUT_DIR = r"D:\agent开发\前端demo\二次元音乐网站\public\images"
TEMP_DIR = r"C:\tmp\openclaw-sn-image"
os.makedirs(TEMP_DIR, exist_ok=True)

RETRY_PROMPTS = {
    # lumen-sticker-07: was "teary eyes, moved to tears" - removed tear keywords
    "lumen-sticker-07": (
        "chibi anime sticker, 2.5 heads tall cute girl, silver-white long straight hair, "
        "center part, big bright blue gentle sparkling eyes, "
        "one hand over heart, touched warm expression, gentle smile, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "cool blue-white tone, sticker design"
    ),
    # yoe-sticker-03: was "surprised, mouth open" - toned down
    "yoe-sticker-03": (
        "chibi anime sticker, 2.5 heads tall cute girl, long black hair with blue gradient tips, "
        "blunt bangs, big bright purple eyes slightly widened, "
        "gentle curious expression, one hand near cheek, "
        "cel-shaded, flat colors, clean thick line art, kawaii style, "
        "pure white background, no gradient, front view, full body chibi, "
        "dark purple cool tone, sticker design"
    ),
}

def remove_background(img, threshold=240):
    img = img.convert('RGBA')
    pixels = np.array(img)
    r, g, b, a = pixels[:,:,0], pixels[:,:,1], pixels[:,:,2], pixels[:,:,3]
    white_mask = (r > threshold) & (g > threshold) & (b > threshold)
    saturation = np.maximum(r, np.maximum(g, b)) - np.minimum(r, np.minimum(g, b))
    bg_mask = white_mask & (saturation < 10)
    pixels[bg_mask, 3] = 0
    return Image.fromarray(pixels)

def generate_image(prompt, output_path):
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
    for line in result.stdout.strip().split("\n"):
        try:
            data = json.loads(line)
            if data.get("status") == "ok":
                img = Image.open(data["output"])
                img.save(output_path)
                return True
            else:
                print(f"  API error: {data.get('error', 'unknown')}")
                return False
        except json.JSONDecodeError:
            continue
    print(f"  Failed: {result.stdout[:200]}")
    return False

def main():
    total = len(RETRY_PROMPTS)
    success = 0
    for name, prompt in RETRY_PROMPTS.items():
        print(f"\nRetrying {name}...")
        temp_png = os.path.join(TEMP_DIR, f"retry_{name}.png")
        t0 = time.time()
        ok = generate_image(prompt, temp_png)
        t1 = time.time()
        if not ok:
            print(f"  ✗ FAILED ({t1-t0:.1f}s)")
            continue
        # Post-process
        img = Image.open(temp_png)
        clean = remove_background(img)
        resized = clean.resize((512, 512), Image.LANCZOS)
        out_path = os.path.join(OUTPUT_DIR, f"{name}.webp")
        resized.save(out_path, "WEBP", quality=85)
        t2 = time.time()
        size = os.path.getsize(out_path)
        print(f"  ✓ OK ({t1-t0:.1f}s gen, {t2-t1:.1f}s proc) → {size/1024:.1f}KB")
        success += 1
    print(f"\nDone: {success}/{total} succeeded")
    return 0 if success == total else 1

if __name__ == "__main__":
    sys.exit(main())