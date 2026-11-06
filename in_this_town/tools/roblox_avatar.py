#!/usr/bin/env python3
"""Download real Roblox avatars (OBJ + MTL + textures) for the In This Town engine.

  python tools/roblox_avatar.py fetch ethan --user SomeUsername          # by username
  python tools/roblox_avatar.py fetch sophie --user-id 123456789         # by user id
  python tools/roblox_avatar.py fetch hat --asset 1374269                # a marketplace item / bundle mesh
  python tools/roblox_avatar.py import ethan path/to/studio_export/      # an OBJ you exported from Studio
  python tools/roblox_avatar.py list

Files land in web/assets/avatars/<key>/ (model.obj, model.mtl, textures, avatar.json) and the key is
added to web/assets/avatars/index.json. Any CAST entry (web/engine/cast.js) whose `avatar` field names
a key in the index is then drawn with that mesh instead of the procedural blocky body; poses, walk
cycles and blinks keep working because web/engine/roblox.js splits the mesh onto the same rig.

Roblox's 3D endpoints (thumbnails.roblox.com/v1/users/avatar-3d, .../assets-thumbnail-3d) need a
signed-in account: set ROBLOSECURITY to the value of your .ROBLOSECURITY browser cookie. Treat it like
a password (it is your session); a throwaway alt account works just as well. It is only sent to
roblox.com hosts.

Studio route (no cookie): put the character in a place, select its Model, right-click > Export
Selection, save as .obj; then `import <key> <folder or .obj>`. Studio writes the textures next to it.

avatar.json can be edited after download:
  yaw        rotation in degrees applied so the avatar faces +Z (the engine's front). Auto-set from the
             3D thumbnail camera; Studio exports default to 180.
  height     target height in studs (default: as downloaded, normally ~5.3).
  landmarks  {hipY, neckY, shoulderX} in normalised studs (feet at 0) to fix a bad limb split.
  head_only  list of OBJ group names that always follow the head (e.g. long hair).
"""
import json
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AV = os.path.join(ROOT, "web", "assets", "avatars")
UA = "in-this-town-avatar-fetch/1.0"


def http(url, data=None, auth=True, binary=False):
    headers = {"User-Agent": UA, "Accept": "application/json, */*"}
    host = urllib.parse.urlparse(url).hostname or ""
    cookie = os.environ.get("ROBLOSECURITY", "").strip()
    if auth and cookie and (host == "roblox.com" or host.endswith(".roblox.com")):
        if not cookie.startswith(".ROBLOSECURITY="):
            cookie = ".ROBLOSECURITY=" + cookie
        headers["Cookie"] = cookie
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, body, headers)
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
    return raw if binary else json.loads(raw)


def cdn_url(h):
    """3D thumbnail files are referenced by hash. New-style ids (contain '-') live on tr.rbxcdn.com;
    legacy 32-hex hashes are sharded over t0..t7.rbxcdn.com."""
    if h.startswith("http"):
        return h
    if "-" in h:
        return f"https://tr.rbxcdn.com/{h}"
    i = 31
    for c in h[:38]:
        i ^= ord(c)
    return f"https://t{i % 8}.rbxcdn.com/{h}"


def user_id(name):
    d = http("https://users.roblox.com/v1/usernames/users", {"usernames": [name], "excludeBannedUsers": True}, auth=False)
    if not d.get("data"):
        sys.exit(f"no Roblox user named {name!r}")
    return d["data"][0]["id"], d["data"][0]["name"]


def thumb3d(url):
    """Poll a 3D thumbnail endpoint until it is rendered; returns the metadata JSON (obj/mtl/textures)."""
    for attempt in range(30):
        try:
            d = http(url)
        except urllib.error.HTTPError as e:
            if e.code in (401, 403):
                sys.exit("Roblox refused the 3D request (HTTP %d). Set ROBLOSECURITY to your .ROBLOSECURITY cookie "
                         "(see the top of this file), or use the Studio export route." % e.code)
            raise
        if d.get("state") == "Completed" and d.get("imageUrl"):
            return http(d["imageUrl"], auth=False)
        if d.get("state") in ("Blocked", "Error"):
            sys.exit(f"Roblox could not render this avatar in 3D: {d}")
        time.sleep(2 + attempt)
    sys.exit("timed out waiting for the 3D thumbnail")


def save_model(key, meta, source):
    out = os.path.join(AV, key)
    if os.path.isdir(out):
        shutil.rmtree(out)
    os.makedirs(out)
    tex_names = {}
    for i, h in enumerate(meta.get("textures", [])):
        data = http(cdn_url(h), auth=False, binary=True)
        name = f"tex{i}.png"
        open(os.path.join(out, name), "wb").write(data)
        tex_names[h] = name
    obj = http(cdn_url(meta["obj"]), auth=False, binary=True).decode("utf-8", "replace")
    mtl = http(cdn_url(meta["mtl"]), auth=False, binary=True).decode("utf-8", "replace")
    # point texture maps at the local files
    def fix(line):
        m = re.match(r"(\s*(?:map_\w+|bump|disp|decal)\s+)(.+)$", line)
        if not m:
            return line
        ref = m.group(2).strip()
        base = ref.split("/")[-1]
        for h, n in tex_names.items():
            if h in ref or base == h:
                return m.group(1) + n
        return line
    mtl = "\n".join(fix(l) for l in mtl.splitlines())
    obj = re.sub(r"^mtllib\s+.*$", "mtllib model.mtl", obj, count=1, flags=re.M)
    if "mtllib" not in obj:
        obj = "mtllib model.mtl\n" + obj
    open(os.path.join(out, "model.obj"), "w").write(obj)
    open(os.path.join(out, "model.mtl"), "w").write(mtl)
    info = {"key": key, "source": source, "obj": "model.obj", "mtl": "model.mtl",
            "aabb": meta.get("aabb"), "camera": meta.get("camera"), "yaw": guess_yaw(meta), "fetched": time.strftime("%Y-%m-%d")}
    finish(key, info)


def guess_yaw(meta):
    """The 3D thumbnail camera sits in front of the avatar; turn the avatar so that side faces +Z."""
    cam, box = meta.get("camera") or {}, meta.get("aabb") or {}
    try:
        p, lo, hi = cam["position"], box["min"], box["max"]
        dx = p["x"] - (lo["x"] + hi["x"]) / 2
        dz = p["z"] - (lo["z"] + hi["z"]) / 2
        import math
        return round(-math.degrees(math.atan2(dx, dz)), 1)
    except (KeyError, TypeError):
        return 0


def finish(key, info):
    out = os.path.join(AV, key)
    groups = sorted(set(re.findall(r"^[go]\s+(.+?)\s*$", open(os.path.join(out, info["obj"]), errors="replace").read(), re.M)))
    info["groups"] = groups
    json.dump(info, open(os.path.join(out, "avatar.json"), "w"), indent=1)
    idx_path = os.path.join(AV, "index.json")
    idx = json.load(open(idx_path)) if os.path.exists(idx_path) else {}
    idx[key] = f"{key}/avatar.json"
    json.dump(dict(sorted(idx.items())), open(idx_path, "w"), indent=1)
    size = sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out))
    print(f"saved web/assets/avatars/{key}/ ({size / 1e6:.1f} MB, {len(groups)} OBJ groups, yaw {info['yaw']})")
    print(f"CAST entries with  avatar: '{key}'  (web/engine/cast.js) now use it. Check the rig split with:")
    print(f"  node render.js stills avatars 0.5 0.5 1.5 2.5 3.5 4.5 5.5   -> build/avatars/stills/")


def cmd_fetch(key, args):
    if "--asset" in args:
        aid = int(args[args.index("--asset") + 1])
        meta = thumb3d(f"https://thumbnails.roblox.com/v1/assets-thumbnail-3d?assetId={aid}")
        return save_model(key, meta, {"assetId": aid})
    if "--user-id" in args:
        uid, uname = int(args[args.index("--user-id") + 1]), None
    elif "--user" in args:
        uid, uname = user_id(args[args.index("--user") + 1])
    else:
        sys.exit("fetch needs --user NAME, --user-id ID or --asset ID")
    meta = thumb3d(f"https://thumbnails.roblox.com/v1/users/avatar-3d?userId={uid}")
    save_model(key, meta, {"userId": uid, "username": uname})


def cmd_import(key, src):
    if os.path.isdir(src):
        objs = [f for f in os.listdir(src) if f.lower().endswith(".obj")]
        if len(objs) != 1:
            sys.exit(f"expected exactly one .obj in {src}, found {objs}")
        obj_path = os.path.join(src, objs[0])
    else:
        obj_path = src
    folder = os.path.dirname(os.path.abspath(obj_path))
    out = os.path.join(AV, key)
    if os.path.isdir(out):
        shutil.rmtree(out)
    os.makedirs(out)
    obj = open(obj_path, errors="replace").read()
    m = re.search(r"^mtllib\s+(.+?)\s*$", obj, re.M)
    candidates = ([os.path.join(folder, m.group(1))] if m else []) + [os.path.splitext(obj_path)[0] + ".mtl"] + \
        sorted(os.path.join(folder, f) for f in os.listdir(folder) if f.lower().endswith(".mtl"))
    mtl_src = next((c for c in candidates if os.path.exists(c)), None)
    if not mtl_src:
        print("warning: no .mtl found next to the .obj; the avatar will be untextured grey")
    mtl = open(mtl_src, errors="replace").read() if mtl_src else ""
    # copy every texture the MTL references, flattening paths
    def fix(line):
        mm = re.match(r"(\s*(?:map_\w+|bump|disp|decal)\s+)(.+)$", line)
        if not mm:
            return line
        ref = mm.group(2).strip().replace("\\", "/")
        p = ref if os.path.isabs(ref) else os.path.join(folder, ref)
        if os.path.exists(p):
            shutil.copy(p, os.path.join(out, os.path.basename(p)))
            return mm.group(1) + os.path.basename(p)
        print("warning: missing texture", ref)
        return line
    mtl = "\n".join(fix(l) for l in mtl.splitlines())
    obj = re.sub(r"^mtllib\s+.*$", "mtllib model.mtl", obj, count=1, flags=re.M) if m else "mtllib model.mtl\n" + obj
    open(os.path.join(out, "model.obj"), "w").write(obj)
    open(os.path.join(out, "model.mtl"), "w").write(mtl)
    finish(key, {"key": key, "source": {"import": os.path.basename(obj_path)}, "obj": "model.obj", "mtl": "model.mtl", "yaw": 180,
                 "fetched": time.strftime("%Y-%m-%d")})


def main():
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); return
    if a[0] == "list":
        idx = os.path.join(AV, "index.json")
        print(open(idx).read() if os.path.exists(idx) else "{}"); return
    if len(a) < 3 and a[0] != "list":
        sys.exit(__doc__)
    if a[0] == "fetch":
        cmd_fetch(a[1], a[2:])
    elif a[0] == "import":
        cmd_import(a[1], a[2])
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
