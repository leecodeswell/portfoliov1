"""Build the moody desk scene from scratch and save it to blender/desk_scene.blend.

Run:  blender -b --factory-startup --python blender/scripts/build_scene.py
Units are metres. The desk top is the z=0 plane; the camera looks almost straight down.
"""
import bpy, bmesh, math, os
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
ASSETS = os.path.join(ROOT, "assets")
DESK_WOOD = "smoked_walnut_veneer"


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


def latte_image(size=1024):
    """Paint crema + heart-shaped microfoam as a float image."""
    v, u = np.mgrid[1:-1:size * 1j, -1:1:size * 1j]
    r = np.sqrt(u * u + v * v)
    crema = np.array([0.30, 0.15, 0.06])
    dark = np.array([0.16, 0.07, 0.03])
    foam = np.array([0.93, 0.86, 0.74])
    rng = np.random.default_rng(3)
    noise = rng.normal(0, 1, (size // 16, size // 16))
    noise = np.kron(noise, np.ones((16, 16)))[:size, :size]
    col = crema[None, None] * (1 - 0.35 * r[..., None]) + dark * 0.35 * r[..., None]
    col *= (1 + 0.06 * noise[..., None])
    # heart:  (x^2 + y^2 - 1)^3 - x^2 y^3 < 0
    x, y = u * 1.9, (v + 0.05) * 1.9
    f = (x * x + y * y - 1) ** 3 - x * x * y ** 3
    heart = np.clip(0.5 - f * 6, 0, 1)
    ring = np.clip((r - 0.86) * 12, 0, 1)  # foam rim against the cup wall
    a = np.clip(heart + ring, 0, 1)[..., None]
    col = col * (1 - a) + foam * a * (1 + 0.03 * noise[..., None])
    rgba = np.concatenate([np.clip(col, 0, 1), np.ones((size, size, 1))], axis=2)
    img = bpy.data.images.new("latte_art", size, size, float_buffer=True)
    img.pixels.foreach_set(rgba[::-1].astype(np.float32).ravel())
    img.pack()
    return img


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
    bmesh.ops.scale(bm, vec=(1.5, 1.0, 1), verts=bm.verts)
    uv = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        for l in f.loops:
            l[uv].uv = (l.vert.co.x / 0.9 + 0.5, l.vert.co.y / 0.9 + 0.5)
    bm.to_mesh(me)
    desk = link(bpy.data.objects.new("Desk", me))
    desk.data.materials.append(mats[0])
    desk.rotation_euler.z = math.radians(90)  # grain runs left-right like the reference
    # darken the scan a touch: the reference desk is nearly black wenge
    nt = mats[0].node_tree
    bsdf = nt.nodes["Principled BSDF"]
    lnk = bsdf.inputs["Base Color"].links
    if lnk:
        hsv = nt.nodes.new("ShaderNodeHueSaturation")
        hsv.inputs["Value"].default_value = 0.16
        hsv.inputs["Saturation"].default_value = 0.9
        nt.links.new(lnk[0].from_socket, hsv.inputs["Color"])
        nt.links.new(hsv.outputs["Color"], bsdf.inputs["Base Color"])
    # glossier finish so the spot draws a sheen across the grain, as in the reference
    rl = bsdf.inputs["Roughness"].links
    if rl:
        mul = nt.nodes.new("ShaderNodeMath")
        mul.operation = "MULTIPLY"
        mul.inputs[1].default_value = 0.6
        nt.links.new(rl[0].from_socket, mul.inputs[0])
        nt.links.new(mul.outputs[0], bsdf.inputs["Roughness"])

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

    W, D = 0.36, 0.24
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
    cu.size = 0.042
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

    # Latte: saucer, cup, handle, crema disc.
    ceramic = mat("Ceramic", (0.88, 0.88, 0.86), rough=0.08, spec=0.6, coat=0.6, sss=0.05)
    saucer = lathe("Saucer", [(0, 0.0), (0.04, 0.0), (0.05, 0.004), (0.075, 0.009), (0.079, 0.013),
                             (0.076, 0.0135), (0.06, 0.0095), (0.035, 0.0065), (0.0, 0.0065)], ceramic)
    cup_profile = [(0, 0.0065), (0.024, 0.0065), (0.032, 0.011), (0.041, 0.027), (0.0465, 0.052),
                   (0.0482, 0.068), (0.0472, 0.0692), (0.0448, 0.067), (0.043, 0.051),
                   (0.036, 0.027), (0.0, 0.019)]
    cup = lathe("Cup", cup_profile, ceramic)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.016, minor_radius=0.0045,
                                     major_segments=48, minor_segments=16,
                                     location=(0.052, 0, 0.042), rotation=(math.radians(90), 0, 0))
    handle = bpy.context.active_object
    handle.name = "CupHandle"
    handle.scale = (0.8, 1.0, 1.0)
    handle.data.materials.append(ceramic)
    smooth(handle)
    coffee = mat("Coffee", (1, 1, 1), rough=0.35, spec=0.5)
    cn = coffee.node_tree
    it = cn.nodes.new("ShaderNodeTexImage")
    it.image = latte_image()
    cn.links.new(it.outputs["Color"], cn.nodes["Principled BSDF"].inputs["Base Color"])
    bpy.ops.mesh.primitive_circle_add(vertices=96, radius=0.0442, fill_type="NGON", location=(0, 0, 0.0625))
    disc = bpy.context.active_object
    disc.name = "LatteSurface"
    disc.data.materials.append(coffee)
    disc.data.uv_layers.new(name="UVMap")
    for l in disc.data.loops:
        co = disc.data.vertices[l.vertex_index].co
        disc.data.uv_layers[0].data[l.index].uv = (co.x / 0.0884 + 0.5, co.y / 0.0884 + 0.5)
    latte = link(bpy.data.objects.new("Latte", None))
    for o in (saucer, cup, handle, disc):
        o.parent = latte
    disc.rotation_euler.z = math.radians(-90)  # heart points away from the handle
    latte.location = (0.50, 0.15, 0)
    latte.rotation_euler.z = math.radians(-35)

    # Pencil: hex body, sharpened wood cone, graphite tip.
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
    pencil.rotation_euler = (math.radians(90), 0, math.radians(-125))
    pencil.location = (-0.46, -0.16, 0.0038)

    # Succulent in a ceramic pot (Poly Haven scans).
    pots, _ = append(os.path.join(ASSETS, "ceramic_pot", "ceramic_pot_2k.blend"), objects=["ceramic_pot"])
    plants, _ = append(os.path.join(ASSETS, "cheiridopsis_succulent", "cheiridopsis_succulent_2k.blend"),
                       objects=["cheiridopsis_succulent_a_LOD0"])
    fix_image_paths()
    place(pots, 0.10, -0.50, 0.16)
    bpy.context.view_layer.update()
    lo, hi = world_bbox(pots)
    place(plants, 0.11, -0.50, 0.16, hi.z - 0.012)

    # Folded business card.
    card_m = mat("Card", (0.85, 0.85, 0.84), rough=0.6, spec=0.35)
    c1 = box("Card_A", (0.085, 0.027, 0.0004), (0, -0.0132, 0.0002), card_m)
    c2 = box("Card_B", (0.085, 0.027, 0.0004), (0, 0.0128, 0.0055), card_m)
    c2.rotation_euler.x = math.radians(24)
    card = link(bpy.data.objects.new("Card", None))
    c1.parent = c2.parent = card
    card.location = (0.50, -0.22, 0)
    card.rotation_euler.z = math.radians(-58)

    # Lighting: one soft spot pool, a little bounce, near-black world.
    sc.world = bpy.data.worlds.new("World")
    sc.world.color = (0.0004, 0.0004, 0.0005)
    spot = bpy.data.lights.new("KeySpot", "SPOT")
    spot.energy = 95
    spot.spot_size = math.radians(42)
    spot.spot_blend = 0.8
    spot.shadow_soft_size = 0.12
    spot.color = (1.0, 0.95, 0.88)
    key = link(bpy.data.objects.new("KeySpot", spot))
    key.location = (-0.02, 0.32, 1.35)
    key.rotation_euler = (math.radians(-11), math.radians(-2), 0)
    fill = bpy.data.lights.new("Fill", "AREA")
    fill.energy = 0.12
    fill.size = 2.0
    fill.color = (0.85, 0.9, 1.0)
    fl = link(bpy.data.objects.new("Fill", fill))
    fl.location = (0, -0.4, 1.6)

    # Camera: near top-down, slight tilt, like the reference hero shot.
    cam = bpy.data.cameras.new("Camera")
    cam.lens = 38
    cam.sensor_width = 36
    co = link(bpy.data.objects.new("Camera", cam))
    co.location = (0, -0.30, 1.30)
    co.rotation_euler = (math.radians(14), 0, 0)
    sc.camera = co

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
