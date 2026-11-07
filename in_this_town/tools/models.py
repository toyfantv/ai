#!/usr/bin/env python3
"""The shared model library (web/assets/models/index.json; README, "Model library").

  python tools/models.py list [kind]             everything, avatars included
  python tools/models.py credits <ep>            the credit lines for the models an episode uses
  python tools/models.py add <name> <file> --kind vehicle --desc "..." --source "Poly Haven" --author "..." \\
         --licence CC0 --url https://... [--tris 30000] [--tex 1024] [--no-redistribute]
  python tools/models.py remove <name>

add takes .glb .gltf .fbx .obj only, refuses a licence that isn't allowed, reduces the polygons and textures in Blender
(scripts off) and saves one .glb in its own folder. --no-redistribute (a free licence that doesn't allow storing the file
in a repository) keeps it in web/assets/models/local/, which git ignores: the file then lives on this PC only.
"""
import argparse
import glob
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
LIB = ROOT / "web" / "assets" / "models"
INDEX = LIB / "index.json"
AVATARS = ROOT / "web" / "assets" / "avatars"
KINDS = ("building", "vehicle", "prop", "accessory", "environment", "avatar")
FORMATS = (".glb", ".gltf", ".fbx", ".obj")
NEEDS_CREDIT = ("CC-BY",)
ALLOWED = ("CC0", "CC-BY", "own", "royalty-free")   # royalty-free: a site's own free licence; needs --no-redistribute
REFUSED = re.compile(r"\bNC\b|\bND\b|non.?commercial|no.?deriv|editorial|unknown|unclear", re.I)


def load():
    return json.loads(INDEX.read_text(encoding="utf-8"))


def save(idx):
    INDEX.write_text(json.dumps(idx, indent=1, sort_keys=True), encoding="utf-8")


def avatars():
    out = {}
    if (AVATARS / "index.json").exists():
        for k in json.loads((AVATARS / "index.json").read_text(encoding="utf-8")):
            if k.startswith("farm_"):
                out[k] = {"kind": "avatar", "type": "avatar", "desc": "video-farm cast: " + k[5:], "source": "Roblox catalogue items, video-farm cast",
                          "author": "", "licence": "own", "url": ""}
    return out


def cmd_list(kind):
    idx = {**load(), **avatars()}
    for k in KINDS:
        if kind and k != kind:
            continue
        rows = sorted(n for n, e in idx.items() if e["kind"] == k)
        if not rows:
            continue
        print(f"\n{k} ({len(rows)})")
        if k == "avatar":
            print("  " + " ".join(r[5:] for r in rows))
            continue
        for n in rows:
            e = idx[n]
            print(f"  {n:18} {e['desc']}" + ("" if e["licence"] == "own" else f"  [{e['licence']}, {e['source']}]") + ("  (this PC only)" if e.get("local") else ""))


def credit_line(n, e):
    return f'"{e.get("title") or n}" by {e["author"]} ({e["url"]}), licensed under {e["licence"]}'


def cmd_credits(ep):
    code = (ROOT / "web" / "episodes" / f"{ep}.js").read_text(encoding="utf-8")
    idx = load()
    used = [n for n in idx if re.search(rf"['\"]{re.escape(n)}['\"]", code)]
    lines = [credit_line(n, idx[n]) for n in used if idx[n]["licence"].startswith(NEEDS_CREDIT)]
    print("\n".join(lines) if lines else f"{ep}: nothing to credit ({len(used)} library models used, none need it)")


def cmd_add(a):
    name = a.name
    if not re.fullmatch(r"[a-z0-9_]+", name) or name.startswith("farm_"):
        sys.exit("name: lower case, digits and _ only, not farm_")
    idx = load()
    if name in idx:
        sys.exit(f"{name} is already in the library: improve it rather than adding a copy (remove it first to replace it)")
    src = pathlib.Path(a.file)
    if src.suffix.lower() not in FORMATS:
        sys.exit(f"refused: {src.suffix} is not one of {FORMATS}")
    if REFUSED.search(a.licence) or a.licence not in ALLOWED:
        sys.exit(f"refused: licence {a.licence!r}. Allowed: {ALLOWED}. NonCommercial, NoDerivatives, editorial and unclear licences stay out: the videos are published.")
    if a.licence == "royalty-free" and not a.no_redistribute:
        sys.exit("a site's own free licence usually forbids redistribution: check its terms, and pass --no-redistribute unless they allow a repository")
    if a.licence.startswith(NEEDS_CREDIT) and not (a.author and a.url):
        sys.exit("CC-BY needs --author and --url for the credit line")
    if a.licence != "own" and not a.url:
        sys.exit("--url: where it came from")
    dest = LIB / ("local" if a.no_redistribute else "") / name
    dest.mkdir(parents=True)
    with tempfile.TemporaryDirectory() as tmp:   # the download in a folder of its own, read as data
        work = pathlib.Path(tmp) / src.name
        shutil.copy(src, work)
        hits = sorted(glob.glob(r"C:\Program Files\Blender Foundation\Blender *\blender.exe"))
        exe = os.environ.get("BLENDER_EXE") or (hits[-1] if hits else "blender")
        r = subprocess.run([exe, "-b", "--disable-autoexec", "--python", str(ROOT / "tools" / "model_import.py"), "--", str(work), str(dest / "model.glb"), str(a.tris), str(a.tex)],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
    if not (dest / "model.glb").exists():
        shutil.rmtree(dest)
        sys.exit("Blender couldn't convert it:\n" + (r.stdout + r.stderr)[-800:])
    print([x for x in r.stdout.splitlines() if x.startswith("MODEL")][-1:], round((dest / "model.glb").stat().st_size / 1e6, 2), "MB")
    idx[name] = {"kind": a.kind, "type": "file", "file": "model.glb", "desc": a.desc, "source": a.source, "author": a.author, "licence": a.licence, "url": a.url}
    if a.title:
        idx[name]["title"] = a.title
    if a.no_redistribute:
        idx[name]["local"] = True
        print("kept out of git: this file exists on this PC only")
    save(idx)


def cmd_remove(name):
    idx = load()
    e = idx.get(name)
    if not e or e["type"] != "file":
        sys.exit(f"{name}: not a file model")
    shutil.rmtree(LIB / ("local" if e.get("local") else "") / name, ignore_errors=True)
    del idx[name]
    save(idx)
    print("removed", name)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("list")
    p.add_argument("kind", nargs="?", choices=KINDS)
    p = sub.add_parser("credits")
    p.add_argument("ep")
    p = sub.add_parser("remove")
    p.add_argument("name")
    p = sub.add_parser("add")
    p.add_argument("name")
    p.add_argument("file")
    p.add_argument("--kind", required=True, choices=KINDS[:5])
    p.add_argument("--desc", required=True)
    p.add_argument("--source", required=True)
    p.add_argument("--licence", required=True)
    p.add_argument("--author", default="")
    p.add_argument("--url", default="")
    p.add_argument("--title", default="")
    p.add_argument("--tris", type=int, default=30000)
    p.add_argument("--tex", type=int, default=1024)
    p.add_argument("--no-redistribute", action="store_true")
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    if a.cmd == "list":
        cmd_list(a.kind)
    elif a.cmd == "credits":
        cmd_credits(a.ep)
    elif a.cmd == "remove":
        cmd_remove(a.name)
    else:
        cmd_add(a)


if __name__ == "__main__":
    main()
