"""Compile a recipe (rules keyed on timeline events) into a render plan: a time map plus effect
windows in output frames and sound cues in output seconds."""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import yaml

from .timeline import Timeline
from .timemap import Ramp, TimeMap

RECIPE_DIR = Path(__file__).parent / "recipes"

# effect kinds that are replayed when the shorts hook flashes forward over them
HOOK_KINDS = {"impact_frames", "flash", "shake", "speed_lines", "radial_blur", "onomatopoeia", "punch_in"}

DEFAULT_WORDS = {
    "impact": "KABOOM!", "crash": "CRASH!", "explode": "KABOOM!", "hit": "BAM!", "punch": "POW!",
    "kick": "WHAM!", "slap": "SMACK!", "bonk": "BONK!", "shoot": "BANG!", "bazooka": "KA-BLAM!",
    "land": "THUD!", "leap": "WHOOSH!", "power": "HAAA!", "horn": "HONK!", "stop": "SCREECH!",
    "launch": "VROOM!", "slip": "WHOOPS!", "knock": "OOF!", "scream": "AAAH!", "pie": "SPLAT!",
}


@dataclass
class Effect:
    kind: str
    start: int
    frames: int
    params: dict = field(default_factory=dict)

    def active(self, i: int) -> bool:
        return self.start <= i < self.start + self.frames

    def k(self, i: int) -> int:
        return i - self.start


@dataclass
class Plan:
    recipe: dict
    timeline: Timeline
    timemap: TimeMap
    effects: list = field(default_factory=list)
    cues: list = field(default_factory=list)          # (out seconds, sfx name, gain)
    panels: list = field(default_factory=list)        # panel crop requests, filled in by render
    marks: list = field(default_factory=list)         # (out frame, label) for contact sheets
    aspects: list = field(default_factory=list)

    @property
    def fps(self):
        return self.timemap.fps


def load_recipe(name_or_path: str) -> dict:
    p = Path(name_or_path)
    if not p.suffix:
        p = RECIPE_DIR / f"{name_or_path}.yaml"
    r = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
    r.setdefault("name", p.stem)
    r.setdefault("rules", [])
    for rule in r["rules"] or []:
        if True in rule:  # YAML 1.1 reads a bare `on:` key as the boolean true
            rule["on"] = rule.pop(True)
    return r


# ---- matching ----------------------------------------------------------------------------------------
@dataclass
class Match:
    t: float
    who: str | None = None
    target: str | None = None
    text: str = ""
    end: float | None = None
    event: dict | None = None
    label: str = ""


def _listify(x):
    return x if isinstance(x, list) else [x]


def matches(sel: dict, tl: Timeline, start: float, end: float) -> list:
    out: list[Match] = []
    if "event" in sel or sel.get("climax"):
        kinds = set(_listify(sel["event"])) if "event" in sel else None
        climax = tl.climax()
        for e in tl.events:
            if kinds and e["kind"] not in kinds and "*" not in kinds:
                continue
            if sel.get("climax") is True and e is not climax:
                continue
            if sel.get("climax") is False and e is climax:
                continue
            if "who" in sel and e.get("who") not in _listify(sel["who"]):
                continue
            if e.get("speed", 1e9) < sel.get("min_speed", 0):
                continue
            out.append(Match(e["t"], e.get("who"), e.get("target"), event=e, label=e["kind"]))
    elif "dialogue" in sel:
        for d in tl.dialogue:
            if "who" in sel and d["who"] not in _listify(sel["who"]):
                continue
            out.append(Match(d["t"], d["who"], d.get("to"), d.get("text", ""), d["t"] + d["dur"],
                             label="line"))
    elif "first_appearance" in sel:
        which = sel["first_appearance"]
        names = tl.main_characters() if which == "main" else (
            list(tl.characters) if which == "all" else _listify(which))
        for who in names:
            t = tl.first_seen(who)
            if t is not None:
                out.append(Match(t, who, label=f"intro {who}"))
    elif "cut" in sel:
        for c in tl.cuts:
            if sel["cut"] == "close" and not tl.is_close(c):
                continue
            who = (c.get("shows") or [None])[0]
            out.append(Match(c["t"], tl.person(who) if who else None, end=tl.cut_end(c), label=c.get("camera", "")))
    elif sel.get("start"):
        out.append(Match(start, label="start"))
    out = [m for m in out if start - 1e-6 <= m.t < end]
    out.sort(key=lambda m: m.t)
    gap = sel.get("min_gap", 0)
    if gap:
        kept = []
        for m in out:
            if not kept or m.t - kept[-1].t >= gap:
                kept.append(m)
        out = kept
    if "max" in sel:
        out = out[:sel["max"]]
    return out


# ---- compile -----------------------------------------------------------------------------------------
def compile_plan(recipe: dict, tl: Timeline, source_duration: float) -> Plan:
    fps = tl.fps
    dur = min(tl.duration or source_duration, source_duration)
    rng = recipe.get("range", {})
    start = float(rng.get("start", 0.0))
    end = rng.get("end")
    if end == "auto":
        last = max([e["t"] for e in tl.events] + [d["t"] + d["dur"] for d in tl.dialogue] + [0])
        end = min(dur, last + float(rng.get("tail", 1.2)))
    end = float(end) if end else dur
    tm = TimeMap(fps, start, end)

    if recipe.get("trim_dead_air"):
        tm.removed = dead_air(tl, start, end, **recipe["trim_dead_air"])
    climax = tl.climax()
    if recipe.get("hook") and climax:
        h = recipe["hook"]
        tm.hook = (max(start, climax["t"] - h.get("before", 0.4)), min(end, climax["t"] + h.get("after", 0.6)))
        tm.rewind_frames = int(h.get("rewind_frames", 14))

    # phase 1: time operations (they shape the map everything else is placed on)
    staged = []
    for rule in recipe.get("rules", []):
        sel = rule.get("on", {})
        for m in matches(sel, tl, start, end):
            freezes = {}
            for j, action in enumerate(rule.get("do", [])):
                (name, p), = action.items() if isinstance(action, dict) else ((action, {}),)
                p = dict(p or {})
                t = m.t + p.get("delay", 0.0)
                if name == "hitstop":
                    freezes[j] = tm.add_freeze(t, p.get("frames", 4) / fps, "hitstop")
                elif name == "freeze":
                    freezes[j] = tm.add_freeze(t, p.get("seconds", 0.5), "freeze")
                elif name in ("intro_card", "face_panels") and p.get("freeze", True):
                    freezes[j] = tm.add_freeze(t, p.get("seconds", 0.8), name)
                elif name == "slowmo":
                    tm.ramps.append(Ramp(t - p.get("before", 0.3), t + p.get("after", 1.2), p.get("speed", 0.35),
                                         p.get("ease_in", 0.25), p.get("ease_out", 0.3)))
            staged.append((rule, m, freezes))
    tm.build()
    plan = Plan(recipe, tl, tm, aspects=recipe.get("aspects", ["wide", "4x5"]))

    # phase 2: effects and sounds, anchored on output frames
    for rule, m, freezes in staged:
        hit_freeze = next((f for j, f in freezes.items() if f.tag == "hitstop"), None)
        for j, action in enumerate(rule.get("do", [])):
            (name, p), = action.items() if isinstance(action, dict) else ((action, {}),)
            p = dict(p or {})
            delay = p.get("delay", 0.0)
            if j in freezes:
                anchor = tm.freeze_index(freezes[j])
            elif hit_freeze is not None and not delay:
                anchor = tm.freeze_index(hit_freeze)
            else:
                anchor = tm.index(m.t + delay)
            if anchor is None:
                continue
            anchors = [(anchor, "main")]
            if tm.hook and name in HOOK_KINDS | {"sfx"} and tm.hook[0] <= m.t + delay < tm.hook[1]:
                h = tm.index(m.t + delay, "hook")
                if h is not None:
                    anchors.append((h, "hook"))
            for a, part in anchors:
                _add(plan, name, p, a, m, freezes.get(j), part)
        if m.event is not None:
            i = tm.index(m.t)
            if i is not None:
                plan.marks.append((i, m.label))

    if recipe.get("title_card"):
        tc = recipe["title_card"]
        plan.effects.append(Effect("title_card", 0, int(tc.get("seconds", 1.8) * fps),
                                   {"title": tc.get("title") or tl.title or tl.scene, "subtitle": tc.get("subtitle", "")}))
    if recipe.get("captions", {}).get("enabled"):
        for d in tl.dialogue:
            a, b = tm.index(d["t"]), tm.index(d["t"] + d["dur"]) or len(tm.frames)
            if a is not None and b > a:
                plan.effects.append(Effect("caption", a, b - a, dict(recipe["captions"], text=d["text"], who=d["who"])))
    if tm.hook:
        # effects replayed in the hook stop where the rewind starts
        n_hook = sum(1 for f in tm.frames if f.part == "hook" and f.kind == "play")
        for e in plan.effects:
            if e.start < n_hook:
                e.frames = min(e.frames, n_hook - e.start)
    if tm.hook and recipe["hook"].get("sfx", "whoosh"):
        plan.cues.append((n_hook / fps, recipe["hook"].get("sfx", "whoosh"), 0.7))
    # one sound word at a time: an earlier word ends when the next one lands
    words = sorted((e for e in plan.effects if e.kind == "onomatopoeia"), key=lambda e: e.start)
    for a, b in zip(words, words[1:]):
        if a.start + a.frames > b.start and a.start != b.start:
            a.frames = max(6, b.start - a.start)
    if not plan.marks:
        plan.marks = [(int(len(tm.frames) * k / 6), "") for k in range(6)]
    return plan


def _center(tl: Timeline, m: Match, p: dict) -> tuple:
    """Where an effect points: the event's target (or subject) when tracked, else the frame centre."""
    pick = p.get("center", "target")
    if isinstance(pick, list):
        return tuple(pick)
    for who in ([m.target, m.who] if pick == "target" else [m.who, m.target]):
        if who:
            tr = tl.track(tl.person(who) or who, m.t, max_gap=0.5)
            if tr and "head" in tr:
                return tuple(tr["head"])
    return (0.5, 0.45)


def _add(plan: Plan, name: str, p: dict, anchor: int, m: Match, freeze, part: str):
    fps, tl = plan.fps, plan.timeline
    E = plan.effects
    center = _center(tl, m, p)
    seed = int(m.t * 1000) % 9973
    if name in ("hitstop", "freeze", "slowmo"):
        return
    if name == "impact_frames":
        seq = p.get("sequence", ["ink", "invert", "ink"])
        hold = p.get("hold", 1)
        E.append(Effect("impact_frames", anchor, len(seq) * hold, {"sequence": seq, "hold": hold, "center": center, "seed": seed}))
    elif name == "flash":
        E.append(Effect("flash", anchor, p.get("frames", 4), {"color": tuple(p.get("color", (255, 255, 255))),
                                                              "strength": p.get("strength", 0.85)}))
    elif name == "shake":
        E.append(Effect("shake", anchor, p.get("frames", 12), {"amp": p.get("amp", 0.025), "rot": p.get("rot", 1.2), "seed": seed}))
    elif name == "speed_lines":
        E.append(Effect("speed_lines", anchor, int(p.get("seconds", 0.5) * fps),
                        {"center": center, "color": tuple(p.get("color", (255, 255, 255))),
                         "opacity": p.get("opacity", 0.75), "seed": seed}))
    elif name == "radial_blur":
        E.append(Effect("radial_blur", anchor, p.get("frames", 10), {"center": center, "strength": p.get("strength", 0.07)}))
    elif name == "punch_in":
        n_in, hold, n_out = p.get("in_frames", 4), p.get("hold_frames", 24), p.get("out_frames", 10)
        E.append(Effect("punch_in", anchor, n_in + hold + n_out,
                        {"zoom": p.get("zoom", 1.3), "in": n_in, "hold": hold, "out": n_out, "center": center}))
    elif name == "push_in":
        end = plan.timemap.index(m.end) if m.end else None
        n = (end or len(plan.timemap.frames)) - anchor
        if n > 0:
            E.append(Effect("push_in", anchor, n, {"zoom": p.get("zoom", 1.07), "center": center}))
    elif name == "onomatopoeia":
        words = dict(DEFAULT_WORDS, **plan.recipe.get("words", {}))
        text = p.get("text") or words.get(m.label) or (m.event or {}).get("sfx")
        if text:
            E.append(Effect("onomatopoeia", anchor, p.get("frames", 42),
                            {"text": text, "center": center, "seed": seed, "size": p.get("size", 0.17),
                             "fill": tuple(p.get("fill", (255, 222, 40))), "outer": tuple(p.get("outer", (0, 0, 0)))}))
    elif name == "intro_card":
        who = m.who
        sub = tl.characters.get(who, {}).get(p["subtitle"], "") if p.get("subtitle") else ""
        E.append(Effect("intro_card", anchor, int(p.get("seconds", 0.8) * fps),
                        {"name": tl.label(who), "color": tl.color(who), "subtitle": sub}))
        plan.marks.append((anchor + int(p.get("seconds", 0.8) * fps * 0.6), f"intro {who}"))
    elif name == "face_panels":
        who = p.get("who", "auto")
        names = [tl.person(w) for w in ([m.who, m.target] if who == "auto" else _listify(who))]
        names += [tl.person(w) for w in _listify(p.get("also", []))]
        names = [w for i, w in enumerate(names) if w and w not in names[:i]][:p.get("max", 3)]
        if names:
            n = int(p.get("seconds", 0.8) * fps)
            E.append(Effect("face_panels", anchor, n, {"who": names, "t": m.t}))
            plan.marks.append((anchor + n // 2, "panels"))
    elif name == "sfx":
        out_t = anchor / fps + p.get("offset", 0.0)
        plan.cues.append((out_t, p.get("name", "hit"), p.get("gain", 0.8)))
    else:
        raise ValueError(f"unknown action '{name}' in recipe {plan.recipe.get('name')}")


def dead_air(tl: Timeline, start: float, end: float, max_gap: float = 1.4, keep: float = 0.35) -> list:
    """Source spans to drop: quiet stretches longer than max_gap, keeping `keep` s on each side."""
    spans = [(max(start, a), min(end, b)) for a, b in tl.activity_spans() if b > start and a < end]
    removed, cursor = [], start
    for a, b in spans + [(end, end)]:
        if a - cursor > max_gap:
            removed.append((round((cursor + keep) * tl.fps) / tl.fps, round((a - keep) * tl.fps) / tl.fps))
        cursor = max(cursor, b)
    return removed
