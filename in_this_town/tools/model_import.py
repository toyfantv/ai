"""Blender half of `tools/models.py add`: read one model file, reduce it, write one .glb.

  blender -b --disable-autoexec --python tools/model_import.py -- <in> <out.glb> <max triangles> <max texture size>
"""
import os
import sys

import bpy

src, out, tris, tex = sys.argv[sys.argv.index("--") + 1:][:4]
tris, tex = int(tris), int(tex)
bpy.ops.wm.read_factory_settings(use_empty=True)
ext = os.path.splitext(src)[1].lower()
if ext in (".glb", ".gltf"):
    bpy.ops.import_scene.gltf(filepath=src)
elif ext == ".fbx":
    bpy.ops.import_scene.fbx(filepath=src)
elif ext == ".obj":
    bpy.ops.wm.obj_import(filepath=src)
else:
    sys.exit("not a model file")

meshes = [o for o in bpy.data.objects if o.type == "MESH"]
if not meshes:
    sys.exit("no meshes")


def count():
    dg = bpy.context.evaluated_depsgraph_get()
    n = 0
    for o in meshes:
        m = o.evaluated_get(dg).to_mesh()
        m.calc_loop_triangles()
        n += len(m.loop_triangles)
    return n


before = count()
if before > tris:
    for o in meshes:
        d = o.modifiers.new("reduce", "DECIMATE")
        d.ratio = tris / before
for im in bpy.data.images:
    w, h = im.size
    if max(w, h) > tex:
        k = tex / max(w, h)
        im.scale(max(1, int(w * k)), max(1, int(h * k)))
print("MODEL", before, "->", count(), "triangles")
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_apply=True, export_animations=True, export_extras=False)
