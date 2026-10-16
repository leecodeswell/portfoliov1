"""Export the desk veneer's normal + roughness maps for the live lacquer reflections on the web.

Run: blender -b --factory-startup --python blender/scripts/export_wood_maps.py
Dumps the EXR pixels to .npy (Blender's Python has no PNG encoder for float data); then
`python blender/scripts/export_wood_maps.py --write` writes public/textures/oak_{normal,rough}.png (convert to .jpg for the web).
"""
import os, sys
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
SRC = os.path.join(ROOT, "blender", "assets", "black_oak_veneer", "textures")
OUT = os.path.join(ROOT, "public", "textures")
TMP = os.path.join(ROOT, "blender", "renders")
MAPS = [("black_oak_veneer_nor_gl_4k.exr", "oak_normal"), ("black_oak_veneer_rough_4k.exr", "oak_rough")]

if "--write" not in sys.argv:
    import bpy
    import numpy as np
    for src, name in MAPS:
        img = bpy.data.images.load(os.path.join(SRC, src))
        img.colorspace_settings.name = "Non-Color"
        w, h = img.size
        px = np.empty(w * h * 4, np.float32)
        img.pixels.foreach_get(px)
        np.save(os.path.join(TMP, name + ".npy"), px.reshape(h, w, 4)[::-1, :, :3])
        print("dumped", name, w, h)
else:
    import numpy as np
    from PIL import Image
    os.makedirs(OUT, exist_ok=True)
    n = np.load(os.path.join(TMP, "oak_normal.npy"))
    Image.fromarray((np.clip(n, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUT, "oak_normal.png"), optimize=True)
    r = np.load(os.path.join(TMP, "oak_rough.npy"))[..., 0]
    Image.fromarray((np.clip(r, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUT, "oak_rough.png"), optimize=True)
    print("wrote oak_normal.png, oak_rough.png", n.shape)
