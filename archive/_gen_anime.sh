#!/bin/bash
# 星海版生图：1 张 hero 立绘 + 4 张歌单封面（sn-image-base / sensenova-u1-fast）
cd "C:/Users/tyx/.agents/skills/sn-image-base/scripts" || exit 1
OUT="C:/Users/tyx/Desktop/测试/images"

run() {
  echo "=== [$1] $2 ..."
  python sn_agent_runner.py sn-image-generate \
    --prompt "$2" \
    --aspect-ratio "$3" \
    --image-size 2k \
    --save-path "$OUT/$1" 2>&1 | tail -3
  echo "--- [$1] done, exit=${PIPESTATUS[0]}"
}

run anime-hero.png \
  "anime style illustration, cinematic wide shot: a dreamy teenage girl wearing headphones sitting in a small paper boat drifting across a starry cosmic ocean at night, deep navy blue night sky, pink and cyan aurora nebulas, scattered stars and glowing sparkles, girl positioned on the right side of the frame, left side mostly dark deep space with empty space, soft pink rim light on her hair, gentle dreamy atmosphere, highly detailed, cel shading anime art, no text, no watermark" \
  "16:9"

run cover-anime-1.png \
  "anime style square album cover art: a cozy retro radio on a windowsill at midnight, warm pink and cyan neon glow, city lights bokeh outside the window, a small cat sleeping beside the radio, dreamy peaceful night atmosphere, cel shading, vibrant pink and blue palette, no text, no watermark" \
  "1:1"

run cover-anime-2.png \
  "anime style square album cover art: a girl with headphones walking through a neon city street at dusk, pink and cyan neon signs reflecting on wet pavement, light rain, cinematic dreamy atmosphere, cel shading, vibrant pink and blue palette, no text, no watermark" \
  "1:1"

run cover-anime-3.png \
  "anime style square album cover art: tiny paper boats floating on rain puddles, reflections of a pink and cyan sunset sky, falling raindrops, soft dreamy light, gentle peaceful mood, cel shading, vibrant pink and blue palette, no text, no watermark" \
  "1:1"

run cover-anime-4.png \
  "anime style square album cover art: a girl lying on a small floating island of clouds gazing at a huge moon and starry sky, sea of clouds below, pink and cyan aurora, peaceful night, cel shading, vibrant pink and blue palette, no text, no watermark" \
  "1:1"

echo "=== ALL DONE"
