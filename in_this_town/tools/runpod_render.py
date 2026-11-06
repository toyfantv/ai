#!/usr/bin/env python3
"""Render an episode's frames on a cheap RunPod GPU pod.

  python tools/runpod_render.py launch ep06     # create pod (only GPUs <= MAX_PRICE $/hr), prints proxy host
  python tools/runpod_render.py status ep06     # pod state + render status
  python tools/runpod_render.py fetch  ep06     # download video.mp4 (video only) -> build/ep06/video_gpu.mp4
  python tools/runpod_render.py delete ep06     # terminate the pod (always do this)

The RunPod key is sent as Authorization: Bearer $RUNPOD_API_KEY (injected by the proxy in Claude cloud
sessions). Output is read through https://<podId>-8000.proxy.runpod.net, which must be reachable.
If no GPU at or under the price cap is available, or the pod cannot get hardware WebGL, use the
local renderer instead (render.js frames ...).
"""
import base64
import io
import json
import os
import sys
import tarfile
import time
import urllib.request

MAX_PRICE = float(os.environ.get("RUNPOD_MAX_PRICE", "2.00"))
KEY = os.environ.get("RUNPOD_API_KEY", "proxy-injected")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def api(method, url, body=None):
    req = urllib.request.Request(url, json.dumps(body).encode() if body is not None else None,
                                 {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json", "User-Agent": "itt-render/1.0"}, method=method)
    with urllib.request.urlopen(req, timeout=60) as r:
        t = r.read()
        return json.loads(t) if t else {}


def gpu_prices():
    q = "{ gpuTypes { id securePrice communityPrice lowestPrice(input:{gpuCount:1}){ uninterruptablePrice stockStatus } } }"
    d = api("POST", "https://api.runpod.io/graphql", {"query": q})["data"]["gpuTypes"]
    out = []
    for g in d:
        for cloud, price in (("COMMUNITY", g.get("communityPrice")), ("SECURE", g.get("securePrice"))):
            if price and 0 < price <= MAX_PRICE and (g.get("lowestPrice") or {}).get("stockStatus"):
                out.append((price, cloud, g["id"]))
    # keep only GPU ids the pod-create API accepts
    try:
        spec = api("GET", "https://rest.runpod.io/v1/openapi.json")
        allowed = set(spec["components"]["schemas"]["PodCreateInput"]["properties"]["gpuTypeIds"]["items"]["enum"])
        out = [o for o in out if o[2] in allowed]
    except Exception:
        pass
    return sorted(out)


def bundle(ep):
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tf:
        for p in ["web", "render.js", "package.json", "tools/runpod", f"build/{ep}/timeline.json"]:
            tf.add(os.path.join(ROOT, p), p, filter=lambda ti: None if ti.name.endswith(".otf") else ti)
    return base64.b64encode(buf.getvalue()).decode()


def state_file(ep):
    return os.path.join(ROOT, "build", ep, "runpod.json")


def launch(ep):
    options = gpu_prices()
    if not options:
        print("NO_GPU_UNDER_CAP"); sys.exit(2)
    print("candidates:", options)
    pw = json.load(open(os.path.join(ROOT, "node_modules", "playwright", "package.json")))["version"] \
        if os.path.exists(os.path.join(ROOT, "node_modules", "playwright")) else os.environ.get("PW_VERSION", "1.63.0")
    code = bundle(ep)
    start = ("set -e; mkdir -p /w && cd /w && echo \"$CODE_B64\" | base64 -d | tar xz; "
             "npx -y playwright@$PW_VERSION install --with-deps chromium >/w/install.log 2>&1 || true; "
             "if [ ! -f /usr/share/fonts/opentype/inter/Inter-Black.otf ]; then mkdir -p /tmp/f && cd /tmp/f && "
             "curl -sSLo i.zip https://github.com/rsms/inter/releases/download/v4.0/Inter-4.0.zip && "
             "python3 -c \"import zipfile;z=zipfile.ZipFile('i.zip');open('/w/web/fonts/Inter-Black.otf','wb').write(z.read('extras/otf/Inter-Black.otf'))\" || true; cd /w; fi; "
             "bash tools/runpod/run.sh")
    # group by cloud so each request only lists GPUs priced under the cap in that cloud
    for cloud in ("COMMUNITY", "SECURE"):
        ids = [g for p, c, g in options if c == cloud]
        if not ids:
            continue
        body = {"name": f"itt-render-{ep}", "imageName": "node:22-bookworm", "computeType": "GPU", "cloudType": cloud,
                "gpuCount": 1, "gpuTypeIds": ids, "gpuTypePriority": "custom", "containerDiskInGb": 30,
                "ports": ["8000/http"], "dockerStartCmd": ["bash", "-c", start],
                "env": {"CODE_B64": code, "EP": ep, "PW_VERSION": pw, "WORKERS": "4", "NVIDIA_DRIVER_CAPABILITIES": "all"}}
        try:
            pod = api("POST", "https://rest.runpod.io/v1/pods", body)
        except urllib.error.HTTPError as e:
            print(cloud, "create failed:", e.code, e.read()[:300]); continue
        cost = pod.get("costPerHr") or pod.get("adjustedCostPerHr")
        print(f"pod {pod.get('id')} {cloud} gpu={pod.get('machine', {}).get('gpuTypeId', ids)} costPerHr={cost}")
        if cost is not None and float(cost) > MAX_PRICE:
            api("DELETE", f"https://rest.runpod.io/v1/pods/{pod['id']}")
            print("deleted: over price cap"); continue
        json.dump({"id": pod["id"], "host": f"{pod['id']}-8000.proxy.runpod.net", "cost": cost, "cloud": cloud},
                  open(state_file(ep), "w"))
        print("PROXY_HOST", f"{pod['id']}-8000.proxy.runpod.net")
        return
    print("NO_GPU_AVAILABLE"); sys.exit(2)


def get(ep, name):
    s = json.load(open(state_file(ep)))
    req = urllib.request.Request(f"https://{s['host']}/{name}", headers={"User-Agent": "itt-render/1.0"})
    with urllib.request.urlopen(req, timeout=600) as r:
        return r.read()


def main():
    cmd, ep = sys.argv[1], sys.argv[2]
    if cmd == "launch":
        launch(ep)
    elif cmd == "status":
        s = json.load(open(state_file(ep)))
        pod = api("GET", f"https://rest.runpod.io/v1/pods/{s['id']}")
        print("pod:", pod.get("desiredStatus"), "cost/hr:", pod.get("costPerHr"))
        for f in ("status.txt", "gpu.txt", "probe.txt"):
            try:
                print(f"{f}:", get(ep, f).decode().strip())
            except Exception as e:
                print(f"{f}: (unavailable: {e})")
    elif cmd == "fetch":
        data = get(ep, "video.mp4")
        out = os.path.join(ROOT, "build", ep, "video_gpu.mp4")
        open(out, "wb").write(data); print("saved", out, len(data))
    elif cmd == "delete":
        s = json.load(open(state_file(ep)))
        api("DELETE", f"https://rest.runpod.io/v1/pods/{s['id']}"); print("deleted", s["id"])


if __name__ == "__main__":
    main()
