#!/usr/bin/env bash
# Full pipeline: voice -> frames (parallel) -> sound -> MP4.
#   ./make_episode.sh episodes/ep06_ocean_sky.json [workers]
# Needs: node + playwright (Chromium), ffmpeg, python with kokoro-onnx soundfile scipy numpy,
# KOKORO_MODEL / KOKORO_VOICES (or ELEVENLABS_API_KEY + ELEVENLABS_VOICE_NARRATOR/_MOTHER).
set -euo pipefail
cd "$(dirname "$0")"
EPJSON=$1; WORKERS=${2:-3}; PY=${PYTHON:-python3}
EP=$(node -e "console.log(require('./$EPJSON').id)")
OUT=$(node -e "console.log(require('./$EPJSON').output)")
FPS=${FPS:-30}
mkdir -p output
$PY tools/tts.py "$EPJSON"
# 1) try a RunPod GPU (<= $0.50/hr, see tools/runpod_render.py); 2) otherwise render locally
GPU_OK=0
if [ "${USE_RUNPOD:-1}" = 1 ] && python3 tools/runpod_render.py launch "$EP"; then
  echo "Allow https://$(python3 -c "import json;print(json.load(open('build/$EP/runpod.json'))['host'])") if your network is restricted."
  until s=$(python3 tools/runpod_render.py status "$EP" 2>&1 | grep "status.txt:"); echo "$s" | grep -qE "DONE|NOGPU|FAILED"; do sleep 15; done
  if echo "$s" | grep -q DONE && python3 tools/runpod_render.py fetch "$EP"; then GPU_OK=1; fi
  python3 tools/runpod_render.py delete "$EP"
fi
if [ $GPU_OK = 0 ]; then
  DUR=$(node -e "console.log(require('./build/$EP/timeline.json').duration)")
  N=$(node -e "console.log(Math.ceil($DUR*$FPS))")
  PER=$(( (N + WORKERS - 1) / WORKERS ))
  rm -rf "build/$EP/frames"
  for ((w=0; w<WORKERS; w++)); do
    node render.js frames "$EP" $FPS $((w*PER)) $(((w+1)*PER)) 1 > "build/$EP/render_$w.log" 2>&1 &
  done
  wait
  ffmpeg -y -loglevel error -framerate $FPS -i "build/$EP/frames/%05d.jpg" -c:v libx264 -preset medium -crf 16 -pix_fmt yuv420p "build/$EP/video_gpu.mp4"
fi
node render.js thumb "$EP" "$(node -e "console.log(require('./$EPJSON').thumbnail_text)")"
$PY tools/audio.py "$EP"
ffmpeg -y -loglevel error -i "build/$EP/video_gpu.mp4" -i "build/$EP/mix.wav" \
  -c:v copy \
  -af "loudnorm=I=-14:TP=-1.0:LRA=11" -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "output/$OUT"
mkdir -p output && cp "build/$EP/thumbnail.jpg" "output/${OUT%.mp4}_thumbnail.jpg"
echo "done: output/$OUT"
