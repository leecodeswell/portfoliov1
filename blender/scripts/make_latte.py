"""Paint the latte-art texture (crema + layered heart) to blender/textures/latte.png.  Needs numpy + Pillow."""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

S = 2048
OUT = os.path.join(os.path.dirname(__file__), "..", "textures", "latte.png")
rng = np.random.default_rng(7)


def blurred_noise(scale, blur):
    n = Image.fromarray((rng.random((S // scale, S // scale)) * 255).astype(np.uint8)).resize((S, S), Image.BICUBIC)
    return np.asarray(n.filter(ImageFilter.GaussianBlur(blur)), np.float32) / 255 - 0.5


def heart(cx, cy, w, h, squash=1.0):
    """Classic parametric heart, point down, as a polygon in pixel space."""
    t = np.linspace(0, 2 * np.pi, 400)
    x = 16 * np.sin(t) ** 3
    y = -(13 * np.cos(t) - 5 * np.cos(2 * t) - 2 * np.cos(3 * t) - np.cos(4 * t)) * squash
    return list(zip(cx + x / 32 * w, cy + y / 30 * h))


yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
r = np.hypot(xx - S / 2, yy - S / 2) / (S / 2)

# crema: warm brown, darker toward the rim, mottled with fine bubbles
crema = np.array([0.22, 0.10, 0.04])
rim = np.array([0.08, 0.035, 0.014])
k = np.clip((r - 0.55) / 0.45, 0, 1)[..., None] ** 1.5
col = crema * (1 - k) + rim * k
col *= 1 + 0.18 * blurred_noise(8, 6)[..., None] + 0.10 * blurred_noise(64, 1.2)[..., None]

# foam mask: stacked hearts alternating foam/crema (the poured layers), then a pull-through line
mask = Image.new("L", (S, S), 0)
d = ImageDraw.Draw(mask)
cx, cy = S / 2, S / 2 + 40
layers = [(1.00, 255), (0.90, 0), (0.87, 255), (0.74, 0), (0.71, 255)]
for i, (s, val) in enumerate(layers):
    d.polygon(heart(cx, cy - (1 - s) * 260, 1180 * s, 1100 * s), fill=val)
d.line([(cx, cy - 520), (cx, cy + 560)], fill=0, width=9)       # brown cut through the top notch
d.line([(cx, cy + 300), (cx, cy + 640)], fill=255, width=10)     # white tail at the point
mask = mask.filter(ImageFilter.GaussianBlur(7))
# organic wobble: displace the foam mask with low-frequency noise
mk = np.asarray(mask)
dx = (blurred_noise(256, 40) * 70).astype(int)
dy = (blurred_noise(256, 40) * 70).astype(int)
mask = Image.fromarray(mk[np.clip(yy.astype(int) + dy, 0, S - 1), np.clip(xx.astype(int) + dx, 0, S - 1)])
# micro-variation on the edges so it isn't vector-clean
m = np.asarray(mask, np.float32) / 255
m = np.clip(m + 0.25 * blurred_noise(16, 3) * (m * (1 - m) * 4), 0, 1)

# thin foam halo against the cup wall
halo = np.clip((r - 0.93) / 0.05, 0, 1) * 0.85
a = np.clip(m + halo, 0, 1)[..., None]
foam = np.array([0.95, 0.89, 0.79]) * (1 + 0.04 * blurred_noise(32, 2)[..., None])
col = col * (1 - a) + foam * a
img = (np.clip(col, 0, 1) ** (1 / 2.2) * 255).astype(np.uint8)  # store as sRGB
os.makedirs(os.path.dirname(OUT), exist_ok=True)
Image.fromarray(img).save(OUT)
print("wrote", os.path.normpath(OUT))
