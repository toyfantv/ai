#!/usr/bin/env bash
# Re-run the post-render steps (mix, thumbnail, encode, QC) for an episode whose video_gpu.mp4 exists.
set -uo pipefail
cd "$(dirname "$0")/.."
EPJSON=$1; PY=${PYTHON:-/tmp/claude-0/pv/bin/python}; BACKEND=${2:-runpod}
EP=$(node -e "console.log(require('./$EPJSON').id)"); OUT=$(node -e "console.log(require('./$EPJSON').output)")
SEASON="output/InThisTown_Season2_Episodes07-16"
$PY tools/audio2.py "$EPJSON" || exit 1
node render.js thumb "$EP" "$(node -e "console.log(require('./$EPJSON').thumbnail_text)")"
ffmpeg -y -loglevel error -i "build/$EP/video_gpu.mp4" -i "build/$EP/mix.wav" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
  -profile:v high -r 30 -af "loudnorm=I=-14:TP=-1.0:LRA=11" -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$SEASON/$OUT" || exit 1
cp "build/$EP/thumbnail.jpg" "$SEASON/${OUT%.mp4}_thumbnail.jpg"
$PY tools/qc.py "$EPJSON" "$SEASON/$OUT" "$BACKEND"
