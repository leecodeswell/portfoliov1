"""Paint the front-cover PBR maps: black book cloth with a debossed silver-foil 'ares'.

Writes public/textures/cover_{albedo.jpg, normal.jpg, orm.png} at 4096 px wide (board aspect).
ORM follows glTF/three conventions: R = occlusion, G = roughness, B = metalness.
Run: python blender/scripts/make_cover.py   (needs numpy + Pillow; uses Windows' Segoe UI Semibold)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W_M, D_M = 0.44 + 0.005, 0.26 + 0.010  # board size in metres (Book.tsx: W + overhang, D + 2*overhang)
PX = 4096
PY = round(PX * D_M / W_M)
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "public", "textures")
FONT = "C:/Windows/Fonts/seguisb.ttf"
rng = np.random.default_rng(11)


def blur(a, r):
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r)), np.float32) / 255


# --- letters: centred, wide tracking, like the Blender cover ---------------------------------------
mask_im = Image.new("L", (PX, PY), 0)
d = ImageDraw.Draw(mask_im)
font = ImageFont.truetype(FONT, int(PX * 0.085))
text, track = "ares", int(PX * 0.012)
widths = [d.textlength(ch, font=font) for ch in text]
total = sum(widths) + track * (len(text) - 1)
x = (PX - total) / 2
asc, desc = font.getmetrics()
y = PY / 2 - (asc - desc * 0.2) / 2 - PY * 0.02
for ch, w in zip(text, widths):
    d.text((x, y), ch, font=font, fill=255)
    x += w + track
mask = np.asarray(mask_im.filter(ImageFilter.GaussianBlur(1.2)), np.float32) / 255

# --- cloth: fine woven grain (warp/weft) + slow mottling ---------------------------------------------
yy, xx = np.mgrid[0:PY, 0:PX].astype(np.float32)
period = 7.0  # px per thread at 4096 (~0.75 mm threads)
weave = 0.5 + 0.25 * np.sin(xx * 2 * np.pi / period) * np.sign(np.sin(yy * np.pi / period)) \
            + 0.25 * np.sin(yy * 2 * np.pi / period) * np.sign(np.sin(xx * np.pi / period))
fib = rng.random((PY, PX)).astype(np.float32)
fibre = blur(fib, 0.8)
mottle = blur(rng.random((PY // 32, PX // 32)).astype(np.float32), 2)
mottle = np.asarray(Image.fromarray((mottle * 255).astype(np.uint8)).resize((PX, PY), Image.BICUBIC), np.float32) / 255

# --- height: cloth relief, letters pressed 0.4 mm into the board with soft shoulders ---------------
press = blur(mask, 3.0)
height = 0.35 * weave + 0.25 * fibre
height = height * (1 - 0.85 * press) - 2.2 * press  # foil is smooth and sits below the cloth
dzdx = np.gradient(height, axis=1)
dzdy = np.gradient(height, axis=0)
strength = 1.4
n = np.stack([-dzdx * strength, dzdy * strength, np.ones_like(height)], -1)
n /= np.linalg.norm(n, axis=-1, keepdims=True)
normal = ((n * 0.5 + 0.5) * 255).astype(np.uint8)

# --- albedo: near-black cloth, brushed-silver foil ---------------------------------------------------
cloth = 0.028 + 0.010 * (weave - 0.5) + 0.010 * (mottle - 0.5) + 0.006 * (fibre - 0.5)
cloth_rgb = np.stack([cloth, cloth * 0.98, cloth * 1.02], -1)
brush = blur(rng.random((PY, PX)).astype(np.float32), 0.6)
brush = np.asarray(Image.fromarray((brush * 255).astype(np.uint8)).resize((PX // 8, PY), Image.BILINEAR).resize((PX, PY), Image.BILINEAR), np.float32) / 255
foil = 0.72 + 0.18 * (brush - 0.5)
foil_rgb = np.stack([foil, foil * 0.99, foil * 0.97], -1)
albedo = cloth_rgb * (1 - mask[..., None]) + foil_rgb * mask[..., None]
albedo_srgb = (np.clip(albedo, 0, 1) ** (1 / 2.2) * 255).astype(np.uint8)

# --- ORM ---------------------------------------------------------------------------------------------
occl = 1 - 0.5 * np.clip(press - mask, 0, 1)  # shadowed shoulders of the deboss
rough = 0.82 - 0.08 * weave
rough = rough * (1 - mask) + (0.24 + 0.08 * brush) * mask
metal = mask
orm = (np.stack([occl, rough, metal], -1) * 255).astype(np.uint8)

os.makedirs(OUT, exist_ok=True)
Image.fromarray(albedo_srgb).save(os.path.join(OUT, "cover_albedo.jpg"), quality=92)
Image.fromarray(normal).save(os.path.join(OUT, "cover_normal.jpg"), quality=93)
Image.fromarray(orm).save(os.path.join(OUT, "cover_orm.png"), optimize=True)
print("wrote", PX, "x", PY, "cover maps to", os.path.normpath(OUT))
