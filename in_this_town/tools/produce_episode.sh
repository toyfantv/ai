#!/usr/bin/env bash
# Produce one Season 2 episode end to end (after its JSON + director exist).
#   tools/produce_episode.sh episodes/ep07_moving_houses.json [--skip-tts]
set -uo pipefail
cd "$(dirname "$0")/.."
EPJSON=$1; PY=${PYTHON:-/tmp/claude-0/pv/bin/python}
EP=$(node -e "console.log(require('./$EPJSON').id)")
OUT=$(node -e "console.log(require('./$EPJSON').output)")
SEASON="output/InThisTown_Season2_Episodes07-16"; mkdir -p "$SEASON"
log() { echo "[$(date +%H:%M:%S)] $EP: $*"; }
if [ "${2:-}" != "--skip-tts" ]; then log tts; $PY tools/tts.py "$EPJSON" || exit 1; fi
log events; node render.js stills "$EP" 0.25 0 >/dev/null || exit 1
GPU_OK=0
for attempt in 1 2; do
  log "runpod attempt $attempt"
  if python3 tools/runpod_render.py launch "$EP"; then
    t0=$(date +%s)
    until s=$(timeout 60 python3 tools/runpod_render.py status "$EP" 2>&1 | grep "status.txt:"); echo "$s" | grep -qE "DONE|NOGPU|FAILED"; do
      [ $(( $(date +%s) - t0 )) -gt 2400 ] && { s="TIMEOUT"; break; }; sleep 15; done
    log "pod: $s"
    if echo "$s" | grep -q DONE && python3 tools/runpod_render.py fetch "$EP"; then GPU_OK=1; fi
    python3 tools/runpod_render.py delete "$EP"
  fi
  [ $GPU_OK = 1 ] && break
done
if [ $GPU_OK = 0 ]; then
  log "local render fallback"
  N=$(node -e "console.log(Math.ceil(require('./build/$EP/timeline.json').duration*30))"); W=3; PER=$(( (N + W - 1) / W ))
  rm -rf "build/$EP/frames"
  for ((w=0; w<W; w++)); do node render.js frames "$EP" 30 $((w*PER)) $(((w+1)*PER)) 1 > "build/$EP/render_$w.log" 2>&1 & done; wait
  ffmpeg -y -loglevel error -framerate 30 -i "build/$EP/frames/%05d.jpg" -c:v libx264 -preset medium -crf 16 -pix_fmt yuv420p "build/$EP/video_gpu.mp4"
fi
log mix; $PY tools/audio2.py "$EPJSON" || exit 1
log thumb; node render.js thumb "$EP" "$(node -e "console.log(require('./$EPJSON').thumbnail_text)")"
log encode
ffmpeg -y -loglevel error -i "build/$EP/video_gpu.mp4" -i "build/$EP/mix.wav" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
  -profile:v high -r 30 -af "loudnorm=I=-14:TP=-1.0:LRA=11" -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$SEASON/$OUT" || exit 1
cp "build/$EP/thumbnail.jpg" "$SEASON/${OUT%.mp4}_thumbnail.jpg"
log qc; $PY tools/qc.py "$EPJSON" "$SEASON/$OUT" "$([ $GPU_OK = 1 ] && echo runpod || echo local)"
