"""Build the moody desk scene from scratch and save it to blender/desk_scene.blend.

Run:  blender -b --factory-startup --python blender/scripts/build_scene.py
Units are metres. The desk top is the z=0 plane; the camera looks almost straight down.
"""
import bpy, bmesh, math, os
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
ASSETS = os.path.join(ROOT, "assets")
DESK_VALUE = 0.13
# Key light (Blender coordinates, metres). Mirrored in src/three/Experience.tsx for the real-time book.
KEY = {
    "pos": (0.07, -0.04, 1.15),  # softbox above the desk, nudged right and toward the viewer
    "target": (0.05, -0.08, 0.0),
    "size": (0.62, 0.3),  # its reflection is the long silvery streak in the lacquer
    "spread": 44,  # degrees: narrows the pool so the far desk falls to black
    "energy": 8,
    "color": (0.82, 0.9, 1.0),
}
DESK_WOOD = "black_oak_veneer"  # ebony-stained open-pore oak, like the reference desk


# ---------------------------------------------------------------- helpers
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def mat(name, color, rough=0.5, spec=0.5, coat=0.0, sss=0.0):
    m = bpy.data.materials.new(name)
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Specular IOR Level"].default_value = spec
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Subsurface Weight"].default_value = sss
    return m


def smooth(obj, subdiv=0):
    for p in obj.data.polygons:
        p.use_smooth = True
    if subdiv:
        obj.modifiers.new("subd", "SUBSURF").levels = subdiv
        obj.modifiers["subd"].render_levels = subdiv


def box(name, size, loc, material, bevel=0.0):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    bm.to_mesh(me)
    ob = link(bpy.data.objects.new(name, me))
    ob.location = loc
    ob.data.materials.append(material)
    if bevel:
        bv = ob.modifiers.new("bevel", "BEVEL")
        bv.width, bv.segments, bv.limit_method = bevel, 3, "ANGLE"
        smooth(ob)
        ob.data.set_sharp_from_angle(angle=math.radians(40)) if hasattr(ob.data, "set_sharp_from_angle") else None
    return ob


def lathe(name, profile, material, steps=96, subdiv=1):
    """Revolve a closed (r, z) profile around Z."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [bm.verts.new((r, 0, z)) for r, z in profile]
    for a, b in zip(vs, vs[1:]):
        bm.edges.new((a, b))
    bm.to_mesh(me)
    ob = link(bpy.data.objects.new(name, me))
    sc = ob.modifiers.new("screw", "SCREW")
    sc.steps = sc.render_steps = steps
    sc.use_merge_vertices = True
    sc.use_smooth_shade = True
    sc.use_normal_calculate = True
    if subdiv:
        sd = ob.modifiers.new("subd", "SUBSURF")
        sd.levels = sd.render_levels = subdiv
    ob.data.materials.append(material)
    return ob


def append(blend, objects=(), materials=()):
    with bpy.data.libraries.load(blend) as (src, dst):
        dst.objects = [o for o in src.objects if o in objects]
        dst.materials = [m for m in src.materials if m in materials]
    for o in dst.objects:
        link(o)
    return dst.objects, dst.materials


def fix_image_paths():
    for img in bpy.data.images:
        if img.filepath and not os.path.exists(bpy.path.abspath(img.filepath)):
            base = os.path.basename(img.filepath)
            for d in os.listdir(ASSETS):
                cand = os.path.join(ASSETS, d, "textures", base)
                if os.path.exists(cand):
                    img.filepath = cand
                    break


def world_bbox(obs):
    pts = [o.matrix_world @ Vector(c) for o in obs for c in o.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    return lo, hi


def place(obs, diameter, x, y, z=0.0):
    """Uniformly scale a group of objects to a footprint diameter and set it down on (x, y, z)."""
    bpy.context.view_layer.update()
    lo, hi = world_bbox(obs)
    s = diameter / max(hi.x - lo.x, hi.y - lo.y)
    centre = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    for o in obs:
        o.location = (o.location - centre) * s + Vector((x, y, z))
        o.scale = o.scale * s


# ---------------------------------------------------------------- scene
def build():
    reset()
    sc = bpy.context.scene

    # Desk: 3 x 2 m slab with the scanned veneer, UVs at 1 m per tile.
    _, mats = append(os.path.join(ASSETS, DESK_WOOD, f"{DESK_WOOD}_4k.blend"), materials=[DESK_WOOD])
    fix_image_paths()
    me = bpy.data.meshes.new("Desk")
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1)
    bmesh.ops.scale(bm, vec=(0.9, 0.6, 1), verts=bm.verts)
    uv = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        for l in f.loops:
            l[uv].uv = (l.vert.co.x / 0.9 + 0.5, l.vert.co.y / 0.9 + 0.5)  # grain runs left-right
    bm.to_mesh(me)
    desk = link(bpy.data.objects.new("Desk", me))
    desk.data.materials.append(mats[0])
    # near-black, slightly cool stain: the reference desk is ebonised oak with pale open pores
    nt = mats[0].node_tree
    bsdf = nt.nodes["Principled BSDF"]
    lnk = bsdf.inputs["Base Color"].links
    if lnk:
        hsv = nt.nodes.new("ShaderNodeHueSaturation")
        hsv.inputs["Value"].default_value = DESK_VALUE
        hsv.inputs["Saturation"].default_value = 0.35
        nt.links.new(lnk[0].from_socket, hsv.inputs["Color"])
        nt.links.new(hsv.outputs["Color"], bsdf.inputs["Base Color"])
    # satin lacquer: a glossy coat over the pores, so the key light pulls long streaks along the grain
    rl = bsdf.inputs["Roughness"].links
    if rl:
        mul = nt.nodes.new("ShaderNodeMath")
        mul.operation = "MULTIPLY"
        mul.inputs[1].default_value = 1.0
        nt.links.new(rl[0].from_socket, mul.inputs[0])
        nt.links.new(mul.outputs[0], bsdf.inputs["Roughness"])
    bsdf.inputs["Coat Weight"].default_value = 0.5
    # crisper pores: they're what breaks the sheen into streaks
    for n in nt.nodes:
        if n.type == "NORMAL_MAP":
            n.inputs["Strength"].default_value = 2.2
    # the coat follows the pores too, otherwise the lacquer reads as a smooth mirror
    for n in nt.nodes:
        if n.type == "NORMAL_MAP":
            nt.links.new(n.outputs["Normal"], bsdf.inputs["Coat Normal"])
    bsdf.inputs["Coat Roughness"].default_value = 0.16
    if rl:
        # the coat dips into the pores: let the wood's own roughness break it up a little
        cr = nt.nodes.new("ShaderNodeMapRange")
        cr.inputs["To Min"].default_value = 0.03
        cr.inputs["To Max"].default_value = 0.32
        nt.links.new(mul.inputs[0].links[0].from_socket, cr.inputs["Value"])
        nt.links.new(cr.outputs["Result"], bsdf.inputs["Coat Roughness"])

    # Book (closed, landscape hardcover). Kept as its own objects under "Book" empty.
    cover = mat("BookCover", (0.005, 0.005, 0.0055), rough=0.5, spec=0.35)
    cn = cover.node_tree
    tex = cn.nodes.new("ShaderNodeTexNoise")
    tex.inputs["Scale"].default_value = 900
    bump = cn.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.08
    cn.links.new(tex.outputs["Fac"], bump.inputs["Height"])
    cn.links.new(bump.outputs["Normal"], cn.nodes["Principled BSDF"].inputs["Normal"])
    paper = mat("PageEdges", (0.80, 0.78, 0.74), rough=0.85, spec=0.3)
    pn = paper.node_tree
    wave = pn.nodes.new("ShaderNodeTexWave")
    wave.bands_direction = "Z"
    wave.inputs["Scale"].default_value = 1200
    pb = pn.nodes.new("ShaderNodeBump")
    pb.inputs["Strength"].default_value = 0.25
    pn.links.new(wave.outputs["Fac"], pb.inputs["Height"])
    pn.links.new(pb.outputs["Normal"], pn.nodes["Principled BSDF"].inputs["Normal"])

    W, D = 0.44, 0.26
    book = link(bpy.data.objects.new("Book", None))
    parts = [
        box("Book_CoverBottom", (W, D, 0.003), (0, 0, 0.0015), cover, bevel=0.0012),
        box("Book_Pages", (W - 0.008, D - 0.01, 0.013), (0.002, 0, 0.0095), paper),
        box("Book_CoverTop", (W, D, 0.003), (0, 0, 0.0175), cover, bevel=0.0012),
        box("Book_Spine", (0.006, D, 0.019), (-W / 2 + 0.002, 0, 0.0095), cover, bevel=0.002),
    ]
    logo_mat = mat("Logo", (0.75, 0.75, 0.75), rough=0.25, spec=0.8)
    cu = bpy.data.curves.new("Logo", "FONT")
    cu.body = "ares"
    cu.font = bpy.data.fonts.load("C:/Windows/Fonts/seguisb.ttf")
    cu.size = 0.048
    cu.space_character = 1.08
    cu.align_x, cu.align_y = "CENTER", "CENTER"
    cu.extrude = 0.00008
    logo = link(bpy.data.objects.new("Book_Logo", cu))
    logo.location = (0, 0, 0.0192)
    logo.data.materials.append(logo_mat)
    parts.append(logo)
    for p in parts:
        p.parent = book
    book.location = (0.0, -0.03, 0)
    book.rotation_euler.z = math.radians(4)

    # Mug (left): plain off-white stoneware, coffee inside. The coffee's surface is drawn live on the
    # web (src/three/Desk.tsx LatteTop) so it stays sharp; here a dark disc stands in for the bake.
    stone = mat("Stoneware", (0.80, 0.78, 0.74), rough=0.42, spec=0.5, coat=0.25)
    mug_profile = [(0, 0.0), (0.036, 0.0), (0.040, 0.002), (0.042, 0.010), (0.042, 0.092),
                   (0.0405, 0.0955), (0.0385, 0.094), (0.0378, 0.090), (0.0378, 0.010), (0.0, 0.008)]
    mug = lathe("Mug", mug_profile, stone)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.024, minor_radius=0.0055, major_segments=48,
                                     minor_segments=16, location=(0.052, 0, 0.050), rotation=(math.radians(90), 0, 0))
    mug_handle = bpy.context.active_object
    mug_handle.name = "MugHandle"
    mug_handle.scale = (0.75, 1.0, 1.05)
    mug_handle.data.materials.append(stone)
    smooth(mug_handle)
    coffee_dark = mat("CoffeeDark", (0.06, 0.03, 0.015), rough=0.2)
    bpy.ops.mesh.primitive_circle_add(vertices=96, radius=0.0378, fill_type="NGON", location=(0, 0, 0.083))
    brew = bpy.context.active_object
    brew.name = "MugCoffee"
    brew.data.materials.append(coffee_dark)
    mug_grp = link(bpy.data.objects.new("Mug", None))
    for o in (mug, mug_handle, brew):
        o.parent = mug_grp
    mug_grp.location = (-0.48, 0.15, 0)
    mug_grp.rotation_euler.z = math.radians(-30)  # handle toward the viewer's right

    # Notepad (bottom right): a small top-bound pad, the pencil lying across it.
    pad_paper = mat("PadPaper", (0.86, 0.85, 0.80), rough=0.85, spec=0.3)
    pad_back = mat("PadBack", (0.12, 0.11, 0.10), rough=0.7)
    pn = pad_paper.node_tree
    lines = pn.nodes.new("ShaderNodeTexWave")  # faint ruled lines
    lines.wave_type = "BANDS"
    lines.bands_direction = "Y"
    lines.inputs["Scale"].default_value = 26
    lines.inputs["Distortion"].default_value = 0
    ramp = pn.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.9
    ramp.color_ramp.elements[0].color = (0.86, 0.85, 0.80, 1)
    ramp.color_ramp.elements[1].color = (0.62, 0.68, 0.78, 1)
    pn.links.new(lines.outputs["Fac"], ramp.inputs["Fac"])
    pn.links.new(ramp.outputs["Color"], pn.nodes["Principled BSDF"].inputs["Base Color"])
    pad_w, pad_d = 0.076, 0.105
    p_back = box("Pad_Back", (pad_w, pad_d, 0.0012), (0, 0, 0.0006), pad_back, bevel=0.0004)
    p_block = box("Pad_Paper", (pad_w - 0.002, pad_d - 0.006, 0.006), (0, -0.002, 0.0042), pad_paper)
    p_bind = box("Pad_Binding", (pad_w + 0.001, 0.012, 0.0085), (0, pad_d / 2 - 0.006, 0.0045), pad_back, bevel=0.0015)
    notepad = link(bpy.data.objects.new("Notepad", None))
    for o in (p_back, p_block, p_bind):
        o.parent = notepad
    notepad.location = (0.47, -0.21, 0)
    notepad.rotation_euler.z = math.radians(-12)

    # Pencil: hex body, sharpened wood cone, graphite tip — lying across the notepad.
    body_m = mat("PencilBody", (0.05, 0.05, 0.055), rough=0.3, coat=0.4)
    wood_m = mat("PencilWood", (0.55, 0.38, 0.22), rough=0.8)
    lead_m = mat("Graphite", (0.03, 0.03, 0.03), rough=0.25, spec=0.9)
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.0038, depth=0.15, location=(0, 0, 0))
    pb_ = bpy.context.active_object
    pb_.name = "PencilBody"
    pb_.data.materials.append(body_m)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.0036, radius2=0.0009, depth=0.02, location=(0, 0, 0.085))
    cone = bpy.context.active_object
    cone.data.materials.append(wood_m)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.0009, radius2=0.0001, depth=0.005, location=(0, 0, 0.0975))
    tip = bpy.context.active_object
    tip.data.materials.append(lead_m)
    pencil = link(bpy.data.objects.new("Pencil", None))
    for o in (pb_, cone, tip):
        smooth(o)
        o.parent = pencil
    pencil.rotation_euler = (math.radians(90), 0, math.radians(-150))
    pencil.location = (0.475, -0.215, 0.0122)

    # Lighting: a cool studio softbox overhead, nudged right and toward the viewer. Seen from the near
    # top-down camera its reflection lies in the lower half of the frame, so the lacquer lights up in
    # long streaks along the grain there while the far desk falls to black (reference f0001).
    sc.world = bpy.data.worlds.new("World")
    sc.world.color = (0.0002, 0.00025, 0.0004)
    spot = bpy.data.lights.new("KeySpot", "AREA")
    spot.shape = "RECTANGLE"
    spot.size, spot.size_y = KEY["size"]
    spot.spread = math.radians(KEY["spread"])
    spot.energy = KEY["energy"]
    spot.color = KEY["color"]
    key = link(bpy.data.objects.new("KeySpot", spot))
    key.location = KEY["pos"]
    aim = link(bpy.data.objects.new("KeyTarget", None))
    aim.location = KEY["target"]
    tc = key.constraints.new("TRACK_TO")
    tc.target = aim
    tc.track_axis, tc.up_axis = "TRACK_NEGATIVE_Z", "UP_Y"
    # faint cool overhead bounce so blacks keep a little shape
    fill = bpy.data.lights.new("Fill", "AREA")
    fill.energy = 0.15
    fill.size = 1.6
    fill.color = (0.78, 0.86, 1.0)
    fl = link(bpy.data.objects.new("Fill", fill))
    fl.location = (0.1, -0.2, 1.6)

    # Camera: near top-down, slight tilt, like the reference hero shot.
    cam = bpy.data.cameras.new("Camera")
    cam.lens = 38
    cam.sensor_width = 36
    co = link(bpy.data.objects.new("Camera", cam))
    co.location = (0, -0.30, 1.30)
    co.rotation_euler = (math.radians(14), 0, 0)
    sc.camera = co

    # Close-up cameras for checking detail (render with: render_preview.py -- name samples pct CamName).
    for name, loc, look, lens in [
        ("CamCloseMug", (-0.32, -0.06, 0.30), (-0.48, 0.15, 0.05), 70),
        ("CamCloseBook", (-0.10, -0.42, 0.22), (0.02, -0.03, 0.01), 50),
        ("CamCloseNotepad", (0.33, -0.42, 0.25), (0.47, -0.21, 0.01), 60),
    ]:
        cd = bpy.data.cameras.new(name)
        cd.lens = lens
        cd.dof.use_dof = True
        cd.dof.aperture_fstop = 2.8
        c = link(bpy.data.objects.new(name, cd))
        c.location = loc
        tgt = link(bpy.data.objects.new(name + "_Target", None))
        tgt.location = look
        cd.dof.focus_object = tgt
        tc = c.constraints.new("TRACK_TO")
        tc.target = tgt
        tc.track_axis, tc.up_axis = "TRACK_NEGATIVE_Z", "UP_Y"

    # Render settings.
    sc.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "OPTIX"
    prefs.refresh_devices()
    for d in prefs.devices:
        d.use = d.type != "CPU"
    sc.cycles.device = "GPU"
    sc.cycles.samples = 256
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    sc.view_settings.exposure = 0.0

    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "desk_scene.blend"))


if __name__ == "__main__":
    build()
