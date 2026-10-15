"""Render an 8K still for a book page (page aspect 0.44:0.26).
Run: blender -b blender/desk_scene.blend --python blender/scripts/render_page_8k.py -- CamName out.jpg [samples]"""
import bpy, os, sys
args = sys.argv[sys.argv.index("--") + 1:]
cam, out = args[0], args[1]
sc = bpy.context.scene
sc.camera = bpy.data.objects[cam]
sc.render.resolution_x, sc.render.resolution_y = 8192, round(8192 * 0.26 / 0.44)
sc.render.resolution_percentage = 100
sc.cycles.samples = int(args[2]) if len(args) > 2 else 128
sc.cycles.use_denoising = True
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = "OPTIX"; prefs.refresh_devices()
for d in prefs.devices: d.use = d.type != "CPU"
sc.cycles.device = "GPU"
sc.render.image_settings.file_format = "JPEG"
sc.render.image_settings.quality = 92
sc.render.filepath = os.path.abspath(out)
bpy.ops.render.render(write_still=True)
