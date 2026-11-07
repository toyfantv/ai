#!/usr/bin/env python3
"""AltiWyre's Face Pack for this renderer: the id tables from the video-farm repo, the images from Roblox's public thumbnails.

  python tools/alti_pack.py      # -> web/assets/faces/alti/index.json + <id>.png (700x700, transparent)

Finished images are skipped. FARM_REPO names the video-farm checkout. The pack's terms: free for animations; don't re-upload
the whole model or sell the faces. Engine side: web/engine/altiface.js.
"""
import concurrent.futures as cf
import json
import os
import pathlib
import re
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
FARM = pathlib.Path(os.environ.get("FARM_REPO", r"D:\Claude\crash-sandbox"))
OUT = ROOT / "web" / "assets" / "faces" / "alti"


def parse_lua(s):
    s = re.sub(r"--[^\n]*", "", s)
    s = s[s.index("return") + 6:]
    toks = re.findall(r'"(?:[^"\\]|\\.)*"|\[|\]|\{|\}|=|,|[A-Za-z_]\w*|-?\d+(?:\.\d+)?', s)
    i = 0

    def val():
        nonlocal i
        t = toks[i]
        if t == "{":
            return table()
        i += 1
        if t.startswith('"'):
            return t[1:-1].replace("\\'", "'").replace('\\"', '"')
        if t in ("true", "false"):
            return t == "true"
        return float(t) if "." in t else int(t)

    def table():
        nonlocal i
        i += 1
        out, n = {}, 0
        while toks[i] != "}":
            if toks[i] == "[":
                i += 1
                k = val()
                i += 2   # ] =
                out[str(k)] = val()
            elif toks[i + 1] == "=" and re.match(r"[A-Za-z_]", toks[i]):
                k = toks[i]
                i += 2
                out[k] = val()
            else:
                n += 1
                out[str(n)] = val()
            if toks[i] == ",":
                i += 1
        i += 1
        return out

    return table()


def ids(v):
    if isinstance(v, dict):
        for x in v.values():
            yield from ids(x)
    elif isinstance(v, int) and v > 100000:
        yield v


def http(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "itt-renderer/1.0"}), timeout=60).read()


def main():
    t = parse_lua((FARM / "src" / "shared" / "AltiFaces.lua").read_text(encoding="utf-8"))
    t.pop("asset", None)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "index.json").write_text(json.dumps(t, indent=0, sort_keys=True), encoding="utf-8")
    todo = sorted({i for i in ids(t) if not (OUT / f"{i}.png").exists()})
    print(len(todo), "images to fetch")
    urls = {}
    for k in range(0, len(todo), 50):
        part = todo[k:k + 50]
        for attempt in range(6):
            d = json.loads(http("https://thumbnails.roblox.com/v1/assets?assetIds=" + ",".join(map(str, part)) + "&returnPolicy=PlaceHolder&size=700x700&format=Png&isCircular=false"))["data"]
            pend = [x for x in d if x["state"] == "Pending"]
            if not pend:
                break
            time.sleep(3)
        for x in d:
            if x["state"] == "Completed":
                urls[x["targetId"]] = x["imageUrl"]
            else:
                print("no image:", x["targetId"], x["state"])

    def get(kv):
        i, u = kv
        (OUT / f"{i}.png").write_bytes(http(u))

    with cf.ThreadPoolExecutor(8) as ex:
        list(ex.map(get, urls.items()))
    print("done", len(list(OUT.glob("*.png"))))


if __name__ == "__main__":
    main()
