"""Bake a character rebuilt by video-farm's still pipeline (tools/blender/still_build.py) into OBJ + MTL + JPG.

  blender -b <shots/blender/<scene>/scene.blend> --python tools/blender_avatar.py -- <character> <out folder>
      [part=#rrggbb ...]               recolour a body part that clothing hides
      [split:<part>=<x>]               cut a layered top at +-x from the body's centre into a torso and two sleeves
      [gain:<part>=r,g,b]              scale a baked texture (a colour the bake came out darker than in Roblox)
      [fill:<name>=x,y0,y1,z,#rrggbb]  a hidden box under the clothes (x, z half sizes in studs)
      [auto]                           do all of that by measuring the character (tools/farm_avatars.py): a wide layered
                                       top is split, what it hides takes its colour, the gaps are filled, limb textures
                                       are smaller. Writes look.json (mean colours) beside the model.

No Studio export needed: still_capture.py lists the dressed character over MCP, still_build.py rebuilds it with layered
clothing fitted and classic clothing composited, and this script writes what `tools/roblox_avatar.py import` reads.
Coordinates go back to studs, Roblox axes. Body parts keep their Roblox names, so web/engine/roblox.js binds them whole;
accessories are named from their Accessory. A split top goes out as UpperTorso2 / LeftUpperArm2 / RightUpperArm2, so each
piece moves whole with its bone and an arm lifts with a clean edge instead of torn triangles. The covers and fills are
there so nothing shows through a gap when a limb swings.
"""
import json
import os
import re
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

S = 0.28
argv = sys.argv[sys.argv.index("--") + 1:]
char, out = argv[0], argv[1]
cover, split, gain, fills = {}, {}, {}, []
auto = "auto" in argv[2:]
for a in argv[2:]:
    if a == "auto":
        continue
    k, v = a.split("=")
    if k.startswith("split:"):
        split[k[6:]] = float(v)
    elif k.startswith("gain:"):
        gain[k[5:]] = [float(x) for x in v.split(",")]
    elif k.startswith("fill:"):
        f = v.split(",")
        fills.append((k[5:], *[float(x) for x in f[:4]], f[4]))
    else:
        cover[k] = v
os.makedirs(out, exist_ok=True)

sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.samples = 1
sc.cycles.device = "CPU"
sc.render.bake.use_pass_direct = False
sc.render.bake.use_pass_indirect = False
sc.render.bake.use_pass_color = True
sc.render.bake.margin = 8

obs = []
for ob in bpy.data.objects:
    path = ob.get("roblox_path", "")
    if ob.type == "MESH" and f"Characters.{char}." in path and not path.endswith("HumanoidRootPart"):
        obs.append(ob)
print("AVATAR", len(obs), "parts")


def part_name(path):
    rest = path.split(f"Characters.{char}.")[1].split(".")
    if len(rest) == 1:
        return rest[0]
    return "acc_" + re.sub(r"[^A-Za-z0-9]+", "_", rest[0]).strip("_")


vlines, mlines, vi = [], [], 1
vts, vns = {}, {}   # shared texture coordinates and normals: most of an OBJ's size is these, repeated per corner


def vt_id(x, y):
    k = "vt %.4f %.4f" % (x, y)
    if k not in vts:
        vts[k] = len(vts) + 1
        vlines.append(k)
    return vts[k]


def vn_id(x, y, z):
    k = "vn %.3f %.3f %.3f" % (x, y, z)
    if k not in vns:
        vns[k] = len(vns) + 1
        vlines.append(k)
    return vns[k]


body = [ob.matrix_world @ Vector(c) for ob in obs if not part_name(ob["roblox_path"]).startswith("acc_") for c in ob.bound_box]
cx = (min(v.x for v in body) + max(v.x for v in body)) / 2
cy = (min(v.y for v in body) + max(v.y for v in body)) / 2


def hexrgb(c):
    c = c.lstrip("#")
    return [int(c[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def write_split(ob, name, x):
    """The top, cut exactly at +-x: every triangle lies wholly in the torso or a sleeve."""
    global vi
    x *= S
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.transform(ob.matrix_world)
    for side in (-1, 1):
        g = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=g, plane_co=(cx + side * x, 0, 0), plane_no=(1, 0, 0))
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.normal_update()
    bm.verts.index_update()
    uv = bm.loops.layers.uv.active
    groups = {"UpperTorso2": [], "LeftUpperArm2": [], "RightUpperArm2": []}
    for f in bm.faces:
        fx = f.calc_center_median().x - cx
        groups["UpperTorso2" if abs(fx) < x else "LeftUpperArm2" if fx > 0 else "RightUpperArm2"].append(f)
    for g, faces in groups.items():
        vlines.append(f"o {g}\nusemtl m_{name}")
        ids, fl = {}, []
        for f in faces:
            idx = []
            for lp in f.loops:
                v = lp.vert
                if v.index not in ids:
                    ids[v.index] = vi + len(ids)
                    vlines.append("v %.4f %.4f %.4f" % (v.co.x / S, v.co.z / S, -v.co.y / S))
                u = lp[uv].uv
                idx.append(f"{ids[v.index]}/{vt_id(u.x, u.y)}/{vn_id(v.normal.x, v.normal.z, -v.normal.y)}")
            fl.append("f " + " ".join(idx))
        vlines.extend(fl)
        vi += len(ids)
        print("AVATAR", g, len(faces), "tris")
    bm.free()


def box_of(ob):
    w = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    return (min(v.x for v in w), max(v.x for v in w), min(v.z for v in w), max(v.z for v in w), min(v.y for v in w), max(v.y for v in w))


def mean_colour(img):
    """The bake's mean, ignoring the black outside its UV islands."""
    px = np.empty(img.size[0] * img.size[1] * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(-1, 4)[:, :3]
    px = px[px.sum(axis=1) > 0.02]
    if not len(px):
        return None
    srgb = np.where(px.mean(axis=0) <= 0.0031308, px.mean(axis=0) * 12.92, 1.055 * px.mean(axis=0) ** (1 / 2.4) - 0.055)
    return "#%02x%02x%02x" % tuple(int(max(0, min(1, c)) * 255) for c in srgb)


parts = {part_name(ob["roblox_path"]): ob for ob in obs}
torso = parts.get("UpperTorso") or parts.get("Torso")
look, tops = {}, {}
if auto and torso:
    tb = box_of(torso)
    half = (tb[1] - tb[0]) / 2
    for n, ob in parts.items():
        b = box_of(ob)
        wide = max(cx - b[0], b[1] - cx) > half * 1.35 and min(cx - b[0], b[1] - cx) > half * 1.35
        over = min(b[3], tb[3]) - max(b[2], tb[2]) > 0.6 * (tb[3] - tb[2])
        # a top wraps the torso and stops at the neck; wings and capes are thin or stand clear of the shoulders
        if n.startswith("acc_") and ob.data.uv_layers and wide and over and b[3] < tb[3] + 0.45 * (tb[3] - tb[2]) and b[5] - b[4] < 3 * (tb[1] - tb[0]):
            tops[n] = ob
            split[n] = half / S * 1.06
    obs.sort(key=lambda o: part_name(o["roblox_path"]) not in tops)
    print("AVATAR tops", list(tops))


def sleeve_reach(ob):
    """The lowest point of the top beyond the shoulders."""
    mw = ob.matrix_world
    z = [(mw @ v.co).z for v in ob.data.vertices if abs((mw @ v.co).x - cx) > half * 1.06]
    return min(z) if z else None


for ob in obs:
    if not ob.data.polygons:   # a tool's empty Handle: nothing to see or bake
        continue
    name = part_name(ob["roblox_path"])
    size = 1024 if name == "Head" or name.startswith("acc_") else 512
    if auto and name != "Head":
        size = 512 if name.startswith("acc_") else 256
    me = ob.data
    has_uv = bool(me.uv_layers)
    mlines.append(f"newmtl m_{name}")
    if name in cover:
        rgb = hexrgb(cover[name])
        mlines.append("Kd %.4f %.4f %.4f\n" % tuple(rgb))
    elif has_uv:
        img = bpy.data.images.new("bake_" + name, size, size, alpha=False)
        mat = ob.material_slots[0].material
        mat = mat.copy()
        ob.material_slots[0].material = mat
        node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        node.image = img
        mat.node_tree.nodes.active = node
        for o2 in bpy.context.selected_objects:
            o2.select_set(False)
        bpy.context.view_layer.objects.active = ob
        ob.select_set(True)
        bpy.ops.object.bake(type="DIFFUSE")
        fn = f"t_{name}.jpg"
        look[name] = mean_colour(img)
        if name in tops and look[name]:
            cover.setdefault("UpperTorso", look[name])
            reach = sleeve_reach(ob)
            for arm in ("Left", "Right"):
                for seg in ("UpperArm", "LowerArm"):
                    p = parts.get(arm + seg)
                    if p and reach is not None:
                        b = box_of(p)
                        if reach < (b[2] + b[3]) / 2:
                            cover.setdefault(arm + seg, look[name])
        k = next((v for n, v in gain.items() if name.startswith(n)), None)
        if k:
            px = np.empty(size * size * 4, dtype=np.float32)
            img.pixels.foreach_get(px)
            px = px.reshape(-1, 4)
            px[:, :3] = np.clip(px[:, :3] * np.array(k, dtype=np.float32), 0, 1)
            img.pixels.foreach_set(px.ravel())
            img.update()
        sc.render.image_settings.quality = 82
        img.filepath_raw = os.path.join(out, fn)
        img.file_format = "JPEG"
        img.save()
        mlines.append("Kd 1 1 1\nmap_Kd " + fn + "\n")
    else:
        mlines.append("Kd 0.8 0.8 0.8\n")
    hit = next((v for n, v in split.items() if name.startswith(n)), None)
    if hit:
        write_split(ob, name, hit)
        continue
    me.calc_loop_triangles()
    mw = ob.matrix_world
    vlines.append(f"o {name}\nusemtl m_{name}")
    for v in me.vertices:
        w = mw @ v.co
        vlines.append("v %.4f %.4f %.4f" % (w.x / S, w.z / S, -w.y / S))
    uvl = me.uv_layers.active.data if has_uv else None
    n3 = mw.to_3x3().inverted().transposed()
    me.calc_loop_triangles()
    nrm = me.corner_normals
    faces = []
    for t in me.loop_triangles:
        idx = []
        for k in range(3):
            lp = t.loops[k]
            tv = vt_id(*uvl[lp].uv) if uvl else ""
            n = (n3 @ nrm[lp].vector).normalized()
            idx.append(f"{vi + t.vertices[k]}/{tv}/{vn_id(n.x, n.z, -n.y)}")
        faces.append("f " + " ".join(idx))
    vlines += faces
    vi += len(me.vertices)
    print("AVATAR", name, len(me.vertices), "verts", len(faces), "tris")

if auto and tops:
    tb = box_of(torso)
    tw, y0, y1, hz = half / S, tb[2] / S, tb[3] / S, (tb[5] - tb[4]) / 2 / S
    fills.append(("UpperTorso3", tw, y0, y1, hz * 0.96, cover["UpperTorso"]))
    low = parts.get("LowerTorso")
    if low is not None and look.get("LowerTorso"):
        lb = box_of(low)
        fills.append(("LowerTorso2", tw * 0.97, lb[2] / S, lb[3] / S, hz * 0.94, look["LowerTorso"]))

for fname, hx, y0, y1, hz, col in fills:
    mlines.append(f"newmtl m_{fname}\nKd %.4f %.4f %.4f\n" % tuple(hexrgb(col)))
    vlines.append(f"o {fname}\nusemtl m_{fname}")
    c = [(cx / S + sx * hx, y, -cy / S + sz * hz) for y in (y0, y1) for sx in (-1, 1) for sz in (-1, 1)]
    vlines += ["v %.4f %.4f %.4f" % p for p in c]
    for q in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
        vlines.append("f " + " ".join(str(vi + i) for i in q))
    vi += 8

with open(os.path.join(out, "model.obj"), "w") as f:
    f.write("mtllib model.mtl\n" + "\n".join(vlines) + "\n")
with open(os.path.join(out, "model.mtl"), "w") as f:
    f.write("\n".join(mlines) + "\n")
if auto:
    with open(os.path.join(out, "look.json"), "w") as f:
        json.dump({"tops": list(tops), "colours": look}, f)
