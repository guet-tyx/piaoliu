#!/bin/bash
# 星轨版生图：1 张 hero 立绘 + 4 张歌单封面（sn-image-base / sensenova-u1-fast）
cd "C:/Users/tyx/.agents/skills/sn-image-base/scripts" || exit 1
OUT="C:/Users/tyx/Desktop/测试/images"

run() {
  echo "=== [$1] ..."
  python sn_agent_runner.py sn-image-generate \
    --prompt "$2" \
    --aspect-ratio "$3" \
    --image-size 2k \
    --save-path "$OUT/$1" 2>&1 | tail -2
  echo "--- [$1] done, exit=${PIPESTATUS[0]}"
}

run mhy-hero.png \
  "anime style sci-fi illustration, cinematic wide shot: a girl with headphones wearing a futuristic star traveler outfit, holding a small paper boat in her hand, standing on a glowing star rail track floating in deep space, star trails and pink blue and gold nebula, gold rim light on her hair, girl positioned on the right side of the frame, left side mostly dark deep space with empty space for text, highly detailed, cel shading anime art, no text, no watermark" \
  "16:9"

run cover-mhy-1.png \
  "anime style square album cover art: a lone railway platform floating in deep space, a glowing star rail track leading into a colorful nebula, starry sky, gold and ice blue palette, dark sci-fi fantasy atmosphere, cel shading, no text, no watermark" \
  "1:1"

run cover-mhy-2.png \
  "anime style square album cover art: a retro futuristic radio floating in a galaxy of stars with holographic rings orbiting around it, gold and ice blue palette, dark sci-fi fantasy atmosphere, cel shading, no text, no watermark" \
  "1:1"

run cover-mhy-3.png \
  "anime style square album cover art: a golden meteor shower over a dark sea at night, stars reflecting on the water, a distant star rail silhouette on the horizon, gold and ice blue palette, cel shading, no text, no watermark" \
  "1:1"

run cover-mhy-4.png \
  "anime style square album cover art: crystal ice flowers blooming in a dark night sky under an aurora, a tiny girl silhouette sitting on a giant crystal, gold and ice blue palette, cel shading, no text, no watermark" \
  "1:1"

echo "=== ALL DONE"
