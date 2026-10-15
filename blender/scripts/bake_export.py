"""Bake Cycles lighting into textures for the static desk + props and export one glTF for the web.

Run:  blender -b blender/desk_scene.blend --python blender/scripts/bake_export.py -- [samples]
Writes public/models/desk.glb. The book is hidden during the bake (it is real-time on the web).

Baked images are written through the Standard view at EXPOSURE stops so they keep headroom; the web
side multiplies them back by 2**-EXPOSURE and applies AgX tone mapping, matching the Blender render.
"""
import bpy, bmesh, os, sys

EXPOSURE = -1.0
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, "public", "models", "desk.glb")
BAKE_DIR = os.path.join(ROOT, "blender", "renders", "bakes")
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAMPLES = int(args[0]) if args else 512

# group root -> lightmap resolution (w, h)
GROUPS = {"Desk": (4096, 2731), "Latte": (2048, 2048), "Succulent": (2048, 2048),
          "Pencil": (512, 512), "Card": (512, 512)}

sc = bpy.context.scene
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = False
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = "OPTIX"
prefs.refresh_devices()
for d in prefs.devices:
    d.use = d.type != "CPU"
sc.cycles.device = "GPU"
sc.render.bake.margin = 8

for o in bpy.data.objects:
    if o.name.startswith("Book"):
        o.hide_render = True


def descendants(root):
    out = []
    for c in root.children:
        out.append(c)
        out += descendants(c)
    return out


def only_select(objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]


def prepare(group):
    root = bpy.data.objects[group]
    objs = [o for o in ([root] + descendants(root)) if o.type == "MESH"]
    only_select(objs)
    bpy.ops.object.convert(target="MESH")  # apply screw/subsurf/bevel
    for o in objs:
        prev = o.data.uv_layers.active
        uv = o.data.uv_layers.new(name="Bake")
        o.data.uv_layers.active = uv
        (prev or uv).active_render = True
    return objs


def unwrap(objs, group):
    if group == "Desk":  # plane: map straight to the non-square image
        me = objs[0].data
        bm = bmesh.new()
        bm.from_mesh(me)
        uv = bm.loops.layers.uv["Bake"]
        xs = [v.co.x for v in bm.verts]
        ys = [v.co.y for v in bm.verts]
        for f in bm.faces:
            for l in f.loops:
                l[uv].uv = ((l.vert.co.x - min(xs)) / (max(xs) - min(xs)),
                            (l.vert.co.y - min(ys)) / (max(ys) - min(ys)))
        bm.to_mesh(me)
        return
    only_select(objs)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.003, scale_to_bounds=False)
    bpy.ops.uv.average_islands_scale()  # smart_project normalises per object; equalise texel density
    bpy.ops.uv.pack_islands(margin=0.003, rotate=True)
    bpy.ops.object.mode_set(mode="OBJECT")


def bake(objs, group):
    w, h = GROUPS[group]
    img = bpy.data.images.new(f"{group}_bake", w, h, float_buffer=True)
    mats = {s.material for o in objs for s in o.material_slots if s.material}
    for m in mats:
        n = m.node_tree.nodes.new("ShaderNodeTexImage")
        n.name = "__bake"
        n.image = img
        m.node_tree.nodes.active = n
    only_select(objs)
    bpy.ops.object.bake(type="COMBINED")
    for m in mats:
        m.node_tree.nodes.remove(m.node_tree.nodes["__bake"])
    os.makedirs(BAKE_DIR, exist_ok=True)
    vs = sc.view_settings
    vs.view_transform, vs.look, vs.exposure = "Standard", "None", EXPOSURE
    path = os.path.join(BAKE_DIR, f"{group}.png")
    img.save_render(path, scene=sc)
    vs.view_transform, vs.look, vs.exposure = "AgX", "AgX - Medium High Contrast", 0.0
    baked = bpy.data.images.load(path)
    baked.name = f"{group}_lightmap"
    return baked


def finalize(objs, group, img):
    """Join into one mesh with a single texture-only material, keeping only the bake UVs."""
    m = bpy.data.materials.new(f"Baked_{group}")
    b = m.node_tree.nodes["Principled BSDF"]
    t = m.node_tree.nodes.new("ShaderNodeTexImage")
    t.image = img
    m.node_tree.links.new(t.outputs["Color"], b.inputs["Base Color"])
    for o in objs:
        o.data.materials.clear()
        o.data.materials.append(m)
        for uv in [u for u in o.data.uv_layers if u.name != "Bake"]:
            o.data.uv_layers.remove(uv)
        o.data.uv_layers["Bake"].name = "UVMap"
    only_select(objs)
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.join()
    j = bpy.context.view_layer.objects.active
    j.name = group
    return j


results = []
for g in GROUPS:
    objs = prepare(g)
    unwrap(objs, g)
    img = bake(objs, g)
    results.append(finalize(objs, g, img))
    print("baked", g, flush=True)

only_select(results)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_format="GLB",
                          export_image_format="JPEG", export_jpeg_quality=92,
                          export_apply=True, export_lights=False, export_cameras=False)
print("exported", OUT)
