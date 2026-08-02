#!/usr/bin/env bash
# 生成星海背景图（Bash schema bug 绕过脚本）
python "C:/Users/tyx/.agents/skills/SenseNova-Skills/skills/sn-image-base/scripts/sn_agent_runner.py" sn-image-generate \
  --prompt "深海星海氛围背景插画：深邃藏蓝夜色与海洋海平线交融，柔和星云光斑（粉紫与冰蓝），细碎星辰散布，海面微弱星光倒影与波光，整体深色低亮度，宁静唯美，无文字无人物，适合网站全屏深色背景氛围装饰" \
  --negative-prompt "文字, logo, 水印, 人物, 亮色, 卡通" \
  --aspect-ratio 16:9 \
  --save-path "D:/agent开发/前端demo/二次元音乐网站/public/images/star-sea-bg.png"
