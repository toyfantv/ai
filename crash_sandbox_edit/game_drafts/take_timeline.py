"""DRAFT (the merge is unit-testable; the MCP reads are UNTESTED). Goes in tools/take_timeline.py.

record.py change, after the take is cut to GO (keep the rest of record.py as is):

    from take_timeline import fetch_logs, write_sidecar
    server_log, client_log = fetch_logs()                       # right after stopping the recording
    write_sidecar(out_mp4, server_log, client_log,
                  fps=60, duration=seconds, shift=go_offset,    # go_offset: seconds record.py trimmed
                  vertical=out_4x5, vertical_crop=(528, 864))   # after GO (usually ~0, can be +-1 frame)

`go_offset` is the difference between the GO the logs use (t = 0 in both logs) and the first frame
of the cut video: record.py snaps its cut to the director's camera cut at GO, so if that snap moved
the start by +d seconds, pass shift = d (every logged time becomes t - d).
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parent


def _lua(side: str, code: str) -> str:
    out = subprocess.run([sys.executable, str(TOOLS / "studio_mcp.py"), "lua", side, "-e", code],
                         capture_output=True, text=True, check=True).stdout
    return out.strip()


def fetch_logs() -> tuple[dict, dict]:
    server = _lua("Server", "return require(game:GetService('ServerScriptService').CrashServer.modules.TakeLog).export()")
    client = _lua("Client", "local v = game.Players.LocalPlayer:FindFirstChild('CrashTimeline') return v and v.Value or ''")
    return _json(server), _json(client)


def _json(text: str) -> dict:
    i, j = text.find("{"), text.rfind("}")
    return json.loads(text[i:j + 1]) if i >= 0 and j > i else {}


def merge(server: dict, client: dict, fps: float, duration: float, shift: float = 0.0) -> dict:
    """Combine the server's beats and the client's cuts / tracks into one GO-relative timeline."""
    def moved(items):
        out = []
        for it in items or []:
            it = dict(it)
            it["t"] = round(it["t"] - shift, 3)
            if -0.05 <= it["t"] <= duration + 0.05:
                it["t"] = max(0.0, it["t"])
                out.append(it)
        return sorted(out, key=lambda x: x["t"])

    tl = {
        "version": 1,
        "scene": server.get("scene", ""),
        "title": server.get("title", ""),
        "fps": fps,
        "duration": round(duration, 3),
        "characters": server.get("characters", {}),
        "vehicles": server.get("vehicles", {}),
        "cuts": moved(client.get("cuts")),
        "dialogue": moved(server.get("dialogue")),
        "events": moved(server.get("events")),
        "sounds": moved(server.get("sounds")),
        "tracks": {k: moved(v) for k, v in (client.get("tracks") or {}).items()},
    }
    if not tl["cuts"] or tl["cuts"][0]["t"] > 0:
        tl["cuts"].insert(0, {"t": 0.0, "camera": "start", "shows": []})
    return tl


def write_sidecar(video: Path, server: dict, client: dict, fps: float, duration: float, shift: float = 0.0,
                  vertical: Path | None = None, vertical_crop: tuple | None = None) -> Path:
    tl = merge(server, client, fps, duration, shift)
    tl["video"] = {"wide": Path(video).name}
    if vertical:
        tl["video"]["vertical"] = Path(vertical).name
        if vertical_crop:
            tl["video"]["verticalCropOfWide"] = {"x": vertical_crop[0], "w": vertical_crop[1]}
    path = Path(video).with_suffix(".timeline.json")
    path.write_text(json.dumps(tl, indent=1, ensure_ascii=False), encoding="utf-8", newline="\n")
    return path
