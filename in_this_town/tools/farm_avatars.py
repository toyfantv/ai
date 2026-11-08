#!/usr/bin/env python3
"""Export video-farm cast members as real avatars for this renderer, in bulk and unattended.

  python tools/farm_avatars.py all                     every step for the list below
  python tools/farm_avatars.py all --only maya,jake    just these (any cast name)
  python tools/farm_avatars.py capture|bake|cast|sheet|clean      one step

capture  writes throwaway scenes of 12 characters into the farm repo, plays them in Studio over MCP (no clicks), and
         rebuilds each in Blender (still_capture.py + still_build.py). Studio must be free: it comes to the front.
bake     tools/blender_avatar.py auto + roblox_avatar.py import, one character at a time.
cast     writes web/engine/farm_cast.js: farm('maya') for makeCharacter.
sheet    renders every avatar in three poses and tiles them into build/roster/sheet_*.jpg.
clean    deletes the throwaway scenes.

State is in build/avatars/batch.json: a failed character is recorded and the run goes on; running again retries only
what isn't done (--force redoes it). Never touches the farm's cast files. FARM_REPO names the checkout (default below).
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
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
FARM = pathlib.Path(os.environ.get("FARM_REPO", r"D:\Claude\crash-sandbox"))
AV = ROOT / "web" / "assets" / "avatars"
STATE = ROOT / "build" / "avatars" / "batch.json"
OUT = ROOT / "build" / "avatars" / "export"
PER_SCENE = 12

ROSTER = """
maya jake zoe marcus lily ethan nia sam chloe leo ava omar
john casey claire lin city_man city_woman skater_boi skater_gurl barista baker lumber_joe gardener old_school_kid
principal hr_manager suit_candidate beanie_guy tv_coach cowboy fisherman prison_guard police_sergeant
old_man young_kid grandma grandpa grandma_june classic_mom dr_greene nurse_pam elevator_operator ms_henderson gerald
hc_maya hc_dex hc_theo hc_eli hc_sheriff_boone hc_mayor_harmon
lt_marion lt_cole lt_ripley lt_norman lt_teddy lt_evelyn
rs_kai rs_nova rs_rosa rs_jett rs_milo
nia_florist marcus_hardhat
bacon_hair noob bacon_girl robloxian roblox_boy roblox_girl buff_noob bacon_dad_suit guest_2016 builders_club
headless_dominus rich_dominus korblox_rich valk_korblox domino_king golden_robloxian
witch hazmat vampire wizard_will noob_cop bacon_cop robber_balaclava executioner
""".split()

PRE = ('local cs=workspace.CrashScene.Characters:GetChildren() for _,m in ipairs(cs) do for _,d in ipairs(m:GetDescendants()) do '
       'if d:IsA("LocalScript") or d:IsA("Script") then pcall(function() d.Disabled=true end) end end end '
       'for i=1,10 do for _,m in ipairs(cs) do local h=m:FindFirstChildWhichIsA("Humanoid") local a=h and h:FindFirstChildOfClass("Animator") '
       'if a then for _,t in ipairs(a:GetPlayingAnimationTracks()) do t:Stop(0) end end '
       'for _,d in ipairs(m:GetDescendants()) do if d:IsA("Motor6D") then d.Transform=CFrame.new() end end end '
       'game:GetService("RunService").RenderStepped:Wait() end')


def load():
    return json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {"chars": {}}


def save(st):
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(st, indent=1), encoding="utf-8")


def run(cmd, cwd, timeout=900):
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout)
    except subprocess.TimeoutExpired:
        return 1, "timed out"
    return r.returncode, (r.stdout + r.stderr)[-1500:]


def blender():
    hits = sorted(glob.glob(r"C:\Program Files\Blender Foundation\Blender *\blender.exe"))
    return os.environ.get("BLENDER_EXE") or hits[-1]


def scene_text(i, names):
    rows = []
    for k, n in enumerate(names):
        rows.append(f'\t\t{{ id = "{n}", cast = "{n}", position = Vector3.new({(k % 6) * 14 - 35}, 0, {(k // 6) * 16}), heading = 180, anchored = true }},')
    body = "\n".join(rows)
    return f"""-- Temporary: tools/farm_avatars.py in the In This Town renderer. Safe to delete.
return {{
\ttitle = "Avatar capture {i}",
\tlength = 10,
\tmap = {{ preset = "baseplate", color = "#5b6b52", studs = false, structures = 0, platformer = false }},
\tlighting = "day",
\tcolorMode = "vibrant",
\tgestures = false,
\tautoLook = false,
\tcharacters = {{
{body}
\t}},
\tcameras = {{
\t\t{{ name = "still", type = "fixed", position = Vector3.new(0, 8, 70), lookAt = Vector3.new(0, 3, 8), fov = 45 }},
\t}},
\tshots = {{ {{ t = 0, cam = "still", shows = {{ "{names[0]}" }} }} }},
}}
"""


def fresh_play():
    """Stop Play and start it again, and wait until the game answers: a slow start made whole groups fail."""
    mcp = [sys.executable, "tools/studio_mcp.py"]
    run(mcp + ["call", "start_stop_play", '{"is_start":false}'], FARM, 60)
    time.sleep(4)
    run(mcp + ["call", "start_stop_play", '{"is_start":true}'], FARM, 60)
    for _ in range(45):
        code, log = run(mcp + ["lua", "Server", "-e", 'return game.ReplicatedStorage.CrashState.SceneName.Value ~= "" and "game-up" or "wait"'], FARM, 30)
        if "game-up" in log:
            time.sleep(8)
            return True
        time.sleep(2)
    return False


def capture(names, force):
    st = load()
    todo = [n for n in names if force or st["chars"].get(n, {}).get("blend") is None]
    if not todo:
        print("capture: nothing to do")
        return
    groups = [todo[i:i + PER_SCENE] for i in range(0, len(todo), PER_SCENE)]
    stamp = len(glob.glob(str(FARM / "shots" / "blender" / "avcap_*")))
    scenes = []
    for i, g in enumerate(groups):
        s = f"avcap_{stamp + i}"
        (FARM / "scenes" / "sandbox" / f"{s}.lua").write_text(scene_text(stamp + i, g), encoding="utf-8", newline="\n")
        scenes.append((s, g))
    code, log = run([sys.executable, "tools/studio_mcp.py", "call", "start_stop_play", '{"is_start":false}'], FARM, 60)
    code, log = run([sys.executable, "tools/sync.py", "--scene", scenes[0][0]], FARM, 300)
    print("sync", code, log[-200:].strip())
    if code:
        sys.exit("sync failed: nothing captured")
    for s, g in scenes:
        for attempt in (1, 2, 3):
            if not fresh_play():
                code, log = 1, "Play did not start"
                continue
            code, log = run([sys.executable, "tools/blender/still_capture.py", s, "4", "--cam", "still", "--pre", PRE], FARM, 240)
            if code == 0:
                code, log = run([sys.executable, "tools/blender/still_build.py", s, "--samples", "1"], FARM, 1200)
            if code == 0:
                break
            print(s, "attempt", attempt, "failed:", log[-300:])
        blend = FARM / "shots" / "blender" / s / "scene.blend"
        for n in g:
            st["chars"].setdefault(n, {})
            if code == 0 and blend.exists():
                st["chars"][n].update(blend=str(blend), error=None, done=False)
            else:
                st["chars"][n].update(error="capture: " + log[-200:])
        save(st)
        print(s, "ok" if code == 0 else "FAILED", len(g), "characters", flush=True)


def bake(names, force):
    st = load()
    cast = json.loads((FARM / "cast" / "cast.json").read_text(encoding="utf-8"))
    stop_at = time.time() + float(os.environ.get("FARM_BAKE_MINUTES", 1e6)) * 60   # stop cleanly between characters; run again to go on
    for n in names:
        c = st["chars"].get(n, {})
        if not c.get("blend") or (c.get("done") and not force):
            continue
        if time.time() > stop_at:
            print("bake: time budget used, run again to continue", flush=True)
            return
        out = OUT / n
        shutil.rmtree(out, ignore_errors=True)
        code, log = run([blender(), "-b", c["blend"], "--python", str(ROOT / "tools" / "blender_avatar.py"), "--", n, str(out), "auto"], FARM, 600)
        key = "farm_" + n
        ok = code == 0 and (out / "model.obj").exists() and "Traceback" not in log
        if ok:
            code, log2 = run([sys.executable, "tools/roblox_avatar.py", "import", key, str(out)], ROOT, 120)
            ok = code == 0
            log = log2
        if not ok:
            c.update(error="bake: " + log[-300:], done=False)
            print(n, "FAILED", log[-160:].replace("\n", " "), flush=True)
        else:
            look = json.loads((out / "look.json").read_text())
            p = AV / key / "avatar.json"
            info = json.loads(p.read_text(encoding="utf-8"))
            info.update(yaw=0, source={"farm_cast": n, "route": "tools/farm_avatars.py"})
            p.write_text(json.dumps(info, indent=1), encoding="utf-8")
            e = cast.get(n, {})
            size = sum(f.stat().st_size for f in (AV / key).iterdir())
            c.update(done=True, error=None, tops=look["tops"], colours=look["colours"], label=e.get("label", n), gender=e.get("gender"),
                     group=(e.get("group") or "").strip(), skin=(e.get("desc") or {}).get("HeadColor"), bytes=size)
            print(n, "ok", round(size / 1e6, 2), "MB", "tops", look["tops"], flush=True)
        st["chars"][n] = c
        save(st)


def hexof(rgb, default):
    return "#%02x%02x%02x" % tuple(rgb) if rgb else default


def cast_js():
    st = load()
    rows = []
    for n, c in sorted(st["chars"].items()):
        if not c.get("done") or c.get("rejected"):
            continue
        col = c.get("colours") or {}
        f = c.get("gender") == "f"
        rows.append(f"  {n}: {{ avatar: 'farm_{n}', label: {json.dumps(c.get('label', n))}, group: {json.dumps(c.get('group', ''))}, gender: {json.dumps(c.get('gender'))}, "
                    f"skin: '{hexof(c.get('skin'), '#f2c79a')}', shirt: '{col.get('UpperTorso') or '#8899aa'}', pants: '{col.get('LeftUpperLeg') or '#334455'}', "
                    f"shoes: '{col.get('LeftFoot') or '#222222'}', hair: '#3a2a1c', hairStyle: '{'wavy' if f else 'short'}', female: {'true' if f else 'false'} }},")
    text = ("// Generated by tools/farm_avatars.py: the farm cast as real avatars. Don't edit by hand.\n"
            "// Opt-in, not the default. An episode names what it uses:\n"
            "//   ctx = await initStage('ep20', { avatars: ['farm_maya'] });  makeCharacter(farm('maya', { scale: 1 }));\n"
            "// The colours are the procedural body's, for ?avatars=0.\n"
            "export const FARM = {\n" + "\n".join(rows) + "\n};\n"
            "export const farm = (name, over = {}) => ({ ...FARM[name], ...over });\n")
    (ROOT / "web" / "engine" / "farm_cast.js").write_text(text, encoding="utf-8", newline="\n")
    print("farm_cast.js:", len(rows), "avatars")


def sheet():
    d = ROOT / "build" / "roster"
    shutil.rmtree(d, ignore_errors=True)
    (d / "stills").mkdir(parents=True)
    keys = sorted(k for k in json.loads((AV / "index.json").read_text(encoding="utf-8")) if k.startswith("farm_"))
    (ROOT / "web" / "assets" / "avatars" / "roster.json").write_text(json.dumps(keys), encoding="utf-8")
    code, log = run(["node", "render.js", "stills", "roster", "0.5"] + [str(i) for i in range(len(keys))], ROOT, 3000)
    (AV / "roster.json").unlink(missing_ok=True)
    if code:
        sys.exit("roster failed: " + log[-400:])
    cols, per = 4, 24
    for s in range(0, len(keys), per):
        args, fc = [], ""
        part = keys[s:s + per]
        for i, k in enumerate(part):
            args += ["-i", str(d / "stills" / f"t_{s + i}.00.jpg")]
            fc += (f"[{i}]crop=540:330:0:300,drawtext=text='{k[5:]}':x=6:y=6:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6[a{i}];")
        lay = "|".join(f"{(i % cols) * 540}_{(i // cols) * 330}" for i in range(len(part)))
        fc += "".join(f"[a{i}]" for i in range(len(part))) + f"xstack=inputs={len(part)}:layout={lay}:fill=black"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error"] + args + ["-filter_complex", fc, "-q:v", "3", str(d / f"sheet_{s // per}.jpg")], stderr=subprocess.DEVNULL)
    print("sheets:", len(glob.glob(str(d / "sheet_*.jpg"))))


def clean():
    for f in glob.glob(str(FARM / "scenes" / "sandbox" / "avcap_*.lua")):
        os.remove(f)
    print("scenes removed")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("step", choices=["all", "capture", "bake", "cast", "sheet", "clean"])
    ap.add_argument("--only")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    names = a.only.split(",") if a.only else ROSTER
    if a.step in ("all", "capture"):
        capture(names, a.force)
    if a.step in ("all", "bake"):
        bake(names, a.force)
    if a.step in ("all", "cast"):
        cast_js()
    if a.step in ("all", "sheet"):
        sheet()
    if a.step in ("all", "clean"):
        clean()
    st = load()["chars"]
    bad = {n: c.get("error") for n, c in st.items() if c.get("error")}
    print("done", sum(1 for c in st.values() if c.get("done")), "failed", len(bad))
    for n, e in bad.items():
        print(" ", n, (e or "")[:140].replace("\n", " "))


if __name__ == "__main__":
    main()
