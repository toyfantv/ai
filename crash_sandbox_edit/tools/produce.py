"""One command from scene to finished cuts.

    python tools/produce.py <scene> [--recipes anime,cinematic,shorts] [--takes 2] [--seconds 15]
    python tools/produce.py <scene> --from edit                 # re-edit the last take, no recording
    python tools/produce.py --video recordings/x.mp4            # edit an existing take (timeline next to it)

Steps: sync -> record -> iso -> edit -> sheet. Each one can be resumed on its own with --from;
the state of a take lives in recordings/<scene>/<take>/produce.json.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
sys.path.insert(0, str(TOOLS))

from edit.plan import compile_plan, load_recipe  # noqa: E402
from edit.render import render  # noqa: E402
from edit.sheet import contact_sheet  # noqa: E402
from edit.timeline import Timeline  # noqa: E402
from edit.media import probe  # noqa: E402

STEPS = ["sync", "record", "iso", "edit", "sheet"]
DEFAULT_RECIPES = "plain,anime,cinematic,shorts"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("scene", nargs="?", help="scene name (as for record.py)")
    ap.add_argument("--video", type=Path, help="edit this existing take instead of recording")
    ap.add_argument("--timeline", type=Path, help="timeline sidecar (default: <video>.timeline.json)")
    ap.add_argument("--recipes", default=DEFAULT_RECIPES, help=f"comma list (default {DEFAULT_RECIPES})")
    ap.add_argument("--aspects", help="override every recipe's aspects, e.g. wide,4x5,9x16")
    ap.add_argument("--takes", type=int, default=1, help="record N takes and keep the best one")
    ap.add_argument("--seconds", type=float, default=15, help="take length for record.py")
    ap.add_argument("--from", dest="start", choices=STEPS, default="sync", help="resume from this step")
    ap.add_argument("--out", type=Path, help="output folder (default recordings/<scene>/<take>)")
    ap.add_argument("--no-gpu", action="store_true", help="encode with libx264 even when NVENC works")
    ap.add_argument("--record-args", default="--obs", help="extra args for record.py (default --obs)")
    a = ap.parse_args()

    if a.video:
        a.start = "edit"
    if not a.scene and not a.video:
        ap.error("give a scene or --video")
    state = _load_state(a)
    t_all = time.time()

    for step in STEPS[STEPS.index(a.start):]:
        print(f"== {step}")
        if step == "sync":
            _run([sys.executable, TOOLS / "sync.py", "--scene", a.scene])
        elif step == "record":
            state.update(_record(a))
        elif step == "iso":
            state["iso"] = _iso(a, state)
        elif step == "edit":
            state["outputs"] = _edit(a, state)
        elif step == "sheet":
            state["sheet"] = _sheet(state)
        _save_state(state)

    print(f"\nDone in {time.time() - t_all:.0f} s. Take: {state['video']}")
    for name, outs in state.get("outputs", {}).items():
        for aspect, path in outs.items():
            print(f"  {name:10s} {aspect:5s} {path}")
    if state.get("sheet"):
        print(f"  contact sheet  {state['sheet']}")


# ---- state ---------------------------------------------------------------------------------------------
def _take_dir(scene: str, video: Path, out: Path | None) -> Path:
    if out:
        return out
    stem = video.stem
    take = stem[len(scene) + 1:] if stem.startswith(scene + "_") else stem
    return ROOT / "recordings" / scene / take


def _load_state(a) -> dict:
    if a.video:
        video = a.video.resolve()
        tl_path = a.timeline or _sidecar(video)
        scene = a.scene or Timeline.load(tl_path).scene
        d = _take_dir(scene, video, a.out)
        return {"scene": scene, "video": str(video), "timeline": str(tl_path) if tl_path else None,
                "dir": str(d), "iso": []}
    if a.start in ("sync", "record"):
        return {"scene": a.scene}
    # resume: the newest take of this scene
    states = sorted((ROOT / "recordings" / a.scene).glob("*/produce.json"), key=lambda p: p.stat().st_mtime)
    if not states:
        sys.exit(f"no earlier take of {a.scene} to resume from; run without --from")
    return json.loads(states[-1].read_text(encoding="utf-8"))


def _save_state(state: dict):
    if "dir" not in state:
        return
    d = Path(state["dir"])
    d.mkdir(parents=True, exist_ok=True)
    keep = {k: v for k, v in state.items() if not k.startswith("_")}
    (d / "produce.json").write_text(json.dumps(keep, indent=1, default=str), encoding="utf-8")


def _sidecar(video: Path) -> Path | None:
    p = video.with_suffix(".timeline.json")
    return p if p.exists() else None


def _run(cmd: list):
    print("  $ " + " ".join(str(c) for c in cmd))
    subprocess.run([str(c) for c in cmd], check=True, cwd=ROOT)


# ---- record (UNTESTED here: needs Studio + OBS on the PC) -----------------------------------------------
def _record(a) -> dict:
    rec_dir = ROOT / "recordings"
    takes = []
    for n in range(a.takes):
        before = set(rec_dir.glob(f"{a.scene}_*.mp4"))
        _run([sys.executable, TOOLS / "record.py", a.scene, "--seconds", a.seconds, *a.record_args.split()])
        new = [p for p in set(rec_dir.glob(f"{a.scene}_*.mp4")) - before
               if not p.stem.endswith(("_4x5", "_9x16", "_1x1"))]
        if not new:
            sys.exit("record.py produced no new take")
        takes.append(max(new, key=lambda p: p.stat().st_mtime))
    best = max(takes, key=_score)
    if len(takes) > 1:
        print(f"  best of {len(takes)} takes: {best.name} (score {_score(best):.1f})")
    tl = _sidecar(best)
    if not tl:
        print("  ! no timeline sidecar next to the take: effects will only use the plain timing")
    return {"video": str(best), "timeline": str(tl) if tl else None,
            "dir": str(_take_dir(a.scene, best, a.out)), "takes": [str(t) for t in takes], "iso": []}


def _score(video: Path) -> float:
    """Prefer takes whose timeline has the key beats, with the characters on screen at the climax."""
    p = _sidecar(video)
    if not p:
        return 0.0
    tl = Timeline.load(p)
    s = len(tl.events) * 0.1
    c = tl.climax()
    if c:
        s += 5
        people = [tl.person(w) for w in (c.get("who"), c.get("target")) if w]
        s += sum(2 for w in people if w and tl.track(w, c["t"], 0.5))
    return s


def _iso(a, state) -> list:
    """Replay passes (docs/ISO_PASSES.md). Runs only when record.py has learned --iso."""
    if not state.get("timeline"):
        return []
    help_text = subprocess.run([sys.executable, str(TOOLS / "record.py"), "--help"], capture_output=True,
                               text=True, cwd=ROOT).stdout if (TOOLS / "record.py").exists() else ""
    if "--iso" not in help_text:
        print("  record.py has no --iso yet: panels use crops of the main take")
        return []
    _run([sys.executable, TOOLS / "record.py", state["scene"], "--iso", state["timeline"]])
    manifest = Path(state["video"]).with_suffix(".iso.json")
    if not manifest.exists():
        return []
    clips = json.loads(manifest.read_text(encoding="utf-8")).get("clips", [])
    for c in clips:
        c["path"] = str((manifest.parent / c["path"]).resolve())
    return clips


# ---- edit ------------------------------------------------------------------------------------------------
def _edit(a, state) -> dict:
    video = Path(state["video"])
    info = probe(video)
    tl = Timeline.load(Path(state["timeline"]) if state.get("timeline") else None, info["duration"], info["fps"])
    out_dir = Path(state["dir"])
    outputs, thumbs = {}, {}
    for name in [r.strip() for r in a.recipes.split(",") if r.strip()]:
        recipe = load_recipe(name)
        if a.aspects:
            recipe["aspects"] = a.aspects.split(",")
        plan = compile_plan(recipe, tl, info["duration"])
        res = render(plan, video, out_dir, prefer_gpu=not a.no_gpu, iso_clips=state.get("iso"))
        outputs[recipe["name"]] = {k: str(v["path"]) for k, v in res.items()}
        thumbs[recipe["name"]] = {k: v["thumbs"] for k, v in res.items()}
    state["_thumbs"] = thumbs
    state["_fps"] = tl.fps
    return outputs


def _sheet(state) -> str | None:
    thumbs = state.pop("_thumbs", None)
    if not thumbs:
        print("  (thumbnails are made during edit: run with --from edit)")
        return state.get("sheet")
    rows = [(f"{name} {aspect}", t) for name, per in thumbs.items() for aspect, t in per.items()]
    path = Path(state["dir"]) / "contact_sheet.png"
    contact_sheet(rows, path, state.pop("_fps", 60), title=f"{state['scene']}  {Path(state['video']).name}")
    return str(path)


if __name__ == "__main__":
    main()
