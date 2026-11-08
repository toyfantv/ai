#!/usr/bin/env python3
"""Mixamo clips -> the renderer's one-joint-per-limb rig (web/assets/anims/mixamo/<set>.json, git-ignored, played by web/engine/anims.js).

The video-farm repo already turns Mixamo FBX files into per-frame R15 joint rotations (its tools/mixamo_bake.py, cache
shots/mixamo_baked.json: local quaternions per R15 part in Roblox character space, hips travel in studs). This tool reads
that cache and fits the renderer's rig, which has one joint per limb (no elbows or knees):

* hips, torso (UpperTorso relative to LowerTorso) and neck keep their rotations;
* each arm is aimed from the shoulder at the grip point (upper arm + forearm + hand composed), each leg from the hip at
  the ankle, so the hand and foot land where Mixamo puts them even though the limb stays straight;
* the hand's own rotation is kept relative to the aimed arm (`hR`, `hL`): a held prop (a sword) follows the real wrist;
* the hips' height is set so the lower foot stands on the ground with the straight legs, plus any jump in the clip.

Roblox character space faces -Z with right = +X; the renderer's characters face +Z with right = -X, a half turn about Y:
quaternion (w, x, y, z) -> (w, -x, y, -z), position (x, y, z) -> (-x, y, -z). arms[0] / legs[0] are the right side.

  python tools/anim_retarget.py sword_set gs_idle gs_attack ... [--cache D:/Claude/crash-sandbox/shots/mixamo_baked.json]

Output per clip: {fps, n, src, frames: [{q: {hips, torso, neck, aR, aL, lR, lL, hR, hL} as [x, y, z, w], p: [x, z] hips
travel in leg lengths, h: hips height in leg lengths}]}. Quaternions are rounded to 4 places.
"""
import argparse
import json
import math
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
LEG = 2.15            # an R15 leg, hip joint to sole (the cache's scale)
UA, LA, HG = 1.0, 0.95, 0.32   # upper arm, forearm, wrist -> grip (studs, R15 blocky)
UL, LL = 1.05, 1.0             # thigh, shin (hip joint -> ankle)
ANKLE0 = 0.1                   # the ankle's height when standing


def qmul(a, b):
    aw, ax, ay, az = a
    bw, bx, by, bz = b
    return (aw * bw - ax * bx - ay * by - az * bz, aw * bx + ax * bw + ay * bz - az * by,
            aw * by - ax * bz + ay * bw + az * bx, aw * bz + ax * by - ay * bx + az * bw)


def qinv(a):
    return (a[0], -a[1], -a[2], -a[3])


def rot(q, v):
    p = qmul(qmul(q, (0.0, *v)), qinv(q))
    return p[1:]


def norm(v):
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return tuple(x / n for x in v)


def add(*vs):
    return tuple(sum(c) for c in zip(*vs))


def scale(v, s):
    return tuple(x * s for x in v)


def swing(frm, to):
    """The shortest rotation taking unit vector frm to unit vector to."""
    d = sum(a * b for a, b in zip(frm, to))
    if d < -0.99999:
        return (0.0, 0.0, 0.0, 1.0)   # half turn about Z (arms hang along -Y)
    c = (frm[1] * to[2] - frm[2] * to[1], frm[2] * to[0] - frm[0] * to[2], frm[0] * to[1] - frm[1] * to[0])
    q = (1 + d, *c)
    n = math.sqrt(sum(x * x for x in q))
    return tuple(x / n for x in q)


def js(q):
    """Roblox character space -> the renderer's (half turn about Y), and three.js order [x, y, z, w]."""
    w, x, y, z = q
    if w < 0:
        w, x, y, z = -w, -x, -y, -z
    return [round(-x, 4), round(y, 4), round(-z, 4), round(w, 4)]


DOWN = (0.0, -1.0, 0.0)


def frame(f):
    q = {k: tuple(v) for k, v in f["q"].items()}
    LT = q["LT"]
    UT = qmul(LT, q["UT"])
    out = {"hips": js(LT), "torso": js(q["UT"]), "neck": js(q["H"])}
    # arms: aim at the grip point; keep the hand's rotation relative to the aimed arm
    for side, (ua, la, hd) in {"R": ("RUA", "RLA", "RH"), "L": ("LUA", "LLA", "LH")}.items():
        wua = qmul(UT, q[ua]); wla = qmul(wua, q[la]); wh = qmul(wla, q[hd])
        v = add(rot(wua, scale(DOWN, UA)), rot(wla, scale(DOWN, LA)), rot(wh, scale(DOWN, HG)))
        local = norm(rot(qinv(UT), v))                     # in the torso's frame
        arm = swing(DOWN, local)
        hand = qmul(qinv(arm), qmul(qinv(UT), wh))         # the hand relative to the aimed arm
        out["a" + side] = js(arm)
        out["h" + side] = js(hand)
        out["r" + side] = round(math.sqrt(sum(x * x for x in v)) / (UA + LA + HG), 3)
    # legs: aim at the ankle; the hips' height from the lower foot
    hipsH = LEG + f["p"][1]
    lows, downs = [], []
    for side, (ul, ll) in {"R": ("RUL", "RLL"), "L": ("LUL", "LLL")}.items():
        wul = qmul(LT, q[ul]); wll = qmul(wul, q[ll])
        v = add(rot(wul, scale(DOWN, UL)), rot(wll, scale(DOWN, LL)))
        w = norm(v)
        out["l" + side] = js(swing(DOWN, norm(rot(qinv(LT), v))))
        lows.append(hipsH + v[1])
        downs.append(-w[1])
    lift = max(0.0, min(lows) - ANKLE0) / LEG
    p = f["p"]
    return {"q": out, "p": [round(-p[0] / LEG, 4), round(-p[2] / LEG, 4)], "h": round(max(downs) + lift, 4)}


SOURCES = {
    "gs_": "Mixamo (Adobe), Great Sword pack",
    "ss_": "Mixamo (Adobe), Sword And Shield pack",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("set")
    ap.add_argument("clips", nargs="+")
    ap.add_argument("--cache", default=r"D:\Claude\crash-sandbox\shots\mixamo_baked.json")
    a = ap.parse_args()
    cache = json.loads(pathlib.Path(a.cache).read_text())
    meta = json.loads((pathlib.Path(a.cache).parent.parent / "assets" / "mixamo" / "clips.json").read_text())
    by_fbx = {v["fbx"]: k for k, v in meta.items()}
    out_p = ROOT / "web" / "assets" / "anims" / "mixamo" / f"{a.set}.json"   # git-ignored: Mixamo data stays out of this public repo
    out_p.parent.mkdir(parents=True, exist_ok=True)
    data = json.loads(out_p.read_text()) if out_p.exists() else {"clips": {}}
    for name in a.clips:
        c = cache[name]
        src = next((v for k, v in SOURCES.items() if name.startswith(k)), "Mixamo (Adobe)")
        data["clips"][name] = {"fps": c["fps"], "n": len(c["frames"]), "src": f"{src}: {name} (video-farm assets/mixamo/fbx, clip {by_fbx.get(name, name)})",
                               "licence": "Mixamo: royalty-free for personal, commercial and non-profit projects (Adobe's Mixamo FAQ); the animation files are not redistributed as such",
                               "frames": [frame(f) for f in c["frames"]]}
        print(name, len(c["frames"]), "frames")
    out_p.write_text(json.dumps(data, separators=(",", ":")))
    print("->", out_p, round(out_p.stat().st_size / 1e3), "kB")


if __name__ == "__main__":
    main()
