#!/usr/bin/env bash
# Runs inside the RunPod pod: unpack code, find a hardware WebGL backend, render frames, encode video.
# Status is served at :8000/status.txt, the result at :8000/video.mp4.
cd /w; mkdir -p out
st() { echo "$*" > out/status.txt; echo "[status] $*"; }
node tools/runpod/serve.js out 8000 &
st "setup"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq ffmpeg fonts-inter libegl1 libgl1 libvulkan1 >/dev/null 2>&1
cp /usr/share/fonts/opentype/inter/Inter-Black.otf web/fonts/ 2>/dev/null
npm i --no-save --silent "playwright@$PW_VERSION" three@0.170.0 >/dev/null 2>&1
nvidia-smi -L > out/gpu.txt 2>&1
CHOSEN=""
for combo in \
  'chromium|["--use-angle=vulkan","--enable-features=Vulkan,VulkanFromANGLE,DefaultANGLEVulkan","--ignore-gpu-blocklist","--enable-gpu"]' \
  'chromium|["--use-gl=angle","--use-angle=gl-egl","--ignore-gpu-blocklist","--enable-gpu"]' \
  '|["--use-angle=vulkan","--enable-features=Vulkan,VulkanFromANGLE,DefaultANGLEVulkan","--ignore-gpu-blocklist"]' \
  '|["--use-gl=egl","--ignore-gpu-blocklist"]'; do
  ch="${combo%%|*}"; args="${combo#*|}"
  r=$(RENDER_CHANNEL="$ch" RENDER_GL_ARGS="$args" timeout 90 node render.js probe 2>&1 | tail -1)
  echo "probe [$ch] $args -> $r" >> out/probe.txt
  if echo "$r" | grep -qi nvidia; then CHOSEN="$combo"; break; fi
done
if [ -z "$CHOSEN" ]; then st "NOGPU"; sleep infinity; fi
export RENDER_CHANNEL="${CHOSEN%%|*}" RENDER_GL_ARGS="${CHOSEN#*|}"
N=$(node -e "console.log(Math.ceil(require('./build/$EP/timeline.json').duration*30))")
W=${WORKERS:-4}; PER=$(( (N + W - 1) / W ))
st "rendering 0/$N"
for ((w=0; w<W; w++)); do node render.js frames "$EP" 30 $((w*PER)) $(((w+1)*PER)) 1 > out/render_$w.log 2>&1 & done
while pgrep -f "render.js frames" >/dev/null; do st "rendering $(ls build/$EP/frames 2>/dev/null | grep -vc tmp)/$N"; sleep 10; done
c=$(ls build/$EP/frames | grep -vc tmp)
if [ "$c" -lt "$N" ]; then st "FAILED frames $c/$N"; sleep infinity; fi
st "encoding"
ffmpeg -y -loglevel error -framerate 30 -i "build/$EP/frames/%05d.jpg" -c:v libx264 -preset medium -crf 16 -pix_fmt yuv420p out/video.mp4 \
  && st "DONE" || st "FAILED encode"
sleep infinity
