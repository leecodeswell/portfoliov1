"""Render desk_scene.blend to renders/<name>.png.  blender -b desk_scene.blend --python scripts/render_preview.py -- name [samples] [percent]"""
import bpy, os, sys
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
name = args[0] if args else "preview"
sc = bpy.context.scene
if len(args) > 1: sc.cycles.samples = int(args[1])
if len(args) > 2: sc.render.resolution_percentage = int(args[2])
if len(args) > 3: sc.camera = bpy.data.objects[args[3]]
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = "OPTIX"; prefs.refresh_devices()
for d in prefs.devices: d.use = d.type != "CPU"
sc.render.filepath = os.path.join(os.path.dirname(bpy.data.filepath), "renders", name + ".png")
bpy.ops.render.render(write_still=True)
