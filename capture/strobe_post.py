"""
Post-pass for AUREL's strobe clip (capture/shots.mjs `post`), run on the captured frame folder:

  python capture/strobe_post.py <frames dir>

The clip opens on a blackout in which the tail lights are the only light: built from the first
captured frame of the rain scene, the scene goes to black except the red lamps, which get a soft bloom (in the site
they are thin red rings; a real lamp in the dark throws a glow onto the body and the air). The page's
own type and HUD stay. The clip's opening frames all get this treatment, so it moves on from the
page's still (its first frame) in the dark, until the strobe flashes the scene on.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

DARK = 36  # frames (0.6 s at 60 fps) of blackout, moving on from the still, before the strobe flashes on


def scene_mask(w, h):
    """White where the 3D scene is; black over the page's type and HUD, which stay as they are."""
    m = Image.new("L", (w, h), 255)
    dr = ImageDraw.Draw(m)
    dr.rectangle((0, 0, int(w * 0.2), int(h * 0.055)), fill=0)  # AUREL / DETAIL ATELIER
    dr.rectangle((int(w * 0.88), 0, w, int(h * 0.055)), fill=0)  # BOOK A DETAIL
    dr.rectangle((0, 0, int(w * 0.11), int(h * 0.27)), fill=0)  # chapter list
    dr.rectangle((int(w * 0.9), int(h * 0.15), w, int(h * 0.7)), fill=0)  # gloss gauge
    dr.rectangle((0, int(h * 0.66), int(w * 0.4), h), fill=0)  # headline and copy
    return m.filter(ImageFilter.GaussianBlur(w / 400))


def lamp_red(im):
    """The red lamps alone, as a mask: strong red that clearly outweighs green (yellow type drops out)."""
    w, h = im.size
    a = np.asarray(im, dtype=np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # red clearly dominant (yellow type has r ~ g); dimmer parts of the ring still count
    score = np.clip((r - g - 45) / 35, 0, 1) * np.clip((r - 110) / 40, 0, 1)
    score *= np.clip((b - 0.75 * g) / 20 + 1, 0, 1)  # lamp red is pinkish (b ~ g); lit orange paint has little blue
    red = Image.fromarray((score * 255).astype(np.uint8))
    car = Image.new("L", (w, h), 0)
    car.paste(255, (int(w * 0.3), int(h * 0.3), int(w * 0.75), int(h * 0.66)))
    return ImageChops.multiply(red, car)


def blur(a, radius):
    """Gaussian blur in float (three box passes along each axis): smooth, no 8-bit banding."""
    r = max(1, int(radius))
    for axis in (0, 1):
        for _ in range(3):
            c = np.cumsum(np.pad(a, [(r + 1, r) if ax == axis else (0, 0) for ax in range(2)], mode="edge"), axis=axis)
            a = (np.take(c, range(2 * r + 1, c.shape[axis]), axis=axis) - np.take(c, range(0, c.shape[axis] - 2 * r - 1), axis=axis)) / (2 * r + 1)
    return a


def lamps(red):
    """Find the round tail lamps in the red mask: (cx, cy, radius) in pixels, largest first."""
    w, h = red.size
    k = 4  # work on a small copy
    small = np.asarray(red.resize((w // k, h // k), Image.BOX)) > 12
    seen = np.zeros_like(small)
    found = []
    for y0, x0 in zip(*np.nonzero(small)):
        if seen[y0, x0]:
            continue
        stack, pts = [(y0, x0)], []
        seen[y0, x0] = True
        while stack:
            y, x = stack.pop()
            pts.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < small.shape[0] and 0 <= nx < small.shape[1] and small[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        ys, xs = zip(*pts)
        bw, bh = (max(xs) - min(xs) + 1) * k, (max(ys) - min(ys) + 1) * k
        if bw > 1.8 * bh or bh > 1.8 * bw or max(bw, bh) < 2.5 * k:
            continue  # the brake-light strip and specks are not lamps
        found.append(((min(xs) + max(xs) + 1) / 2 * k, (min(ys) + max(ys) + 1) / 2 * k, max(bw, bh) / 2))
    last = getattr(lamps, "last", None)
    if last:
        # follow each lamp from the previous frame: nearest blob of similar size, else keep where it was
        picked = []
        for lx, ly, lr in last:
            near = [f for f in found if np.hypot(f[0] - lx, f[1] - ly) < 3 * lr and 0.6 < f[2] / lr < 1.6]
            picked.append(min(near, key=lambda f: np.hypot(f[0] - lx, f[1] - ly)) if near else (lx, ly, lr))
        found = picked
    else:
        found = sorted(sorted(found, key=lambda f: -f[2])[:2], key=lambda f: f[0])
    lamps.last = found
    return found


def ring_field(w, h, cx, cy, r):
    """Distance-based fields for a lamp at (cx, cy): its ring (crisp, anti-aliased) and lens disc."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.hypot(xx - cx, yy - cy)
    t = max(1.5, r * 0.2)  # ring thickness
    ring = np.clip(1 - np.abs(d - r * 0.85) / t, 0, 1) ** 0.6
    lens = np.clip((r * 0.75 - d) / 2, 0, 1)
    return ring, lens


def blackout(im):
    """Lights out: the tail lamps are the only light. Each lamp is a crisp, hot red ring with a tight
    halo and a soft bloom; its light falls off across the rear of the car, which shows only in red."""
    w, h = im.size
    red = lamp_red(im)
    src = np.asarray(im, dtype=np.float32) / 255
    ring = np.zeros((h, w), np.float32)
    lens = np.zeros((h, w), np.float32)
    for cx, cy, r in lamps(red):  # redraw each lamp as a clean, defined ring
        x0, y0, x1, y1 = int(max(0, cx - 2 * r)), int(max(0, cy - 2 * r)), int(min(w, cx + 2 * r)), int(min(h, cy + 2 * r))
        rg, ln = ring_field(x1 - x0, y1 - y0, cx - x0, cy - y0, r)
        ring[y0:y1, x0:x1] = np.maximum(ring[y0:y1, x0:x1], rg)
        lens[y0:y1, x0:x1] = np.maximum(lens[y0:y1, x0:x1], ln)
    strip = np.asarray(red, dtype=np.float32) / 255 * (1 - np.clip(ring + lens, 0, 1))  # the brake-light strip
    band = np.zeros_like(strip)
    found = lamps.last
    if len(found) == 2:  # only between the two lamps
        (ax, ay, ar), (bx, by, br) = found
        band[int(min(ay, by) - 2 * ar): int(max(ay, by) + ar), int(min(ax, bx) + ar): int(max(ax, bx) - br)] = 1
    strip *= band
    ring = np.maximum(ring, strip)
    light = Image.fromarray((np.clip(ring + lens * 0.25, 0, 1) * 255).astype(np.uint8))
    q = np.asarray(light.resize((w // 4, h // 4), Image.BOX), dtype=np.float32) / 255 * 2.5
    up = lambda a: np.asarray(Image.fromarray(a.astype(np.float32), "F").resize((w, h), Image.BICUBIC))
    halo = up(blur(q, w / 4 / 500))  # light scattering in the lens
    bloom = up(blur(q, w / 4 / 120))  # the soft glow in the air
    wash = up(blur(q, w / 4 / 22))  # light reaching the bodywork
    # the bodywork, lit red by the lamps and falling off with distance
    y = src @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    body = (y * np.clip(wash * 14, 0, 1.8))[..., None] * np.array([1.0, 0.1, 0.07])
    # the lamps: deep red rings whose cores run hot (toward orange-white), with their halo
    core = np.clip(ring * 1.35, 0, 1)[..., None]
    lamp = core * np.array([1.0, 0.18, 0.12]) + (core ** 3) * np.array([0.0, 0.38, 0.3])
    lamp = lamp + (lens * 0.22)[..., None] * np.array([1.0, 0.12, 0.1])  # the lens behind the ring, dimly lit
    glow = (1 - np.exp(-halo * 5))[..., None] * np.array([0.95, 0.08, 0.06]) * 0.42 + (1 - np.exp(-bloom * 8))[..., None] * np.array([0.6, 0.03, 0.03]) * 0.3
    scene = 1 - (1 - body) * (1 - lamp) * (1 - glow)
    m = np.asarray(scene_mask(w, h), dtype=np.float32)[..., None] / 255
    # the page's own type stays; the scene behind it (fog, rain) goes dark like everything else
    y = (src @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32))[..., None]
    # type is small and sharp, fog is soft: keep what stands out from its own surroundings
    y2 = y[..., 0]
    local = blur(y2, w / 250)
    key = np.clip((y2 - local - 0.2) * 8, 0, 1)  # small type; rain streaks are fainter than this
    key += np.clip((y2 - 0.72) * 8, 0, 1)  # large white type
    key += np.clip((src[..., 0] - src[..., 2] - 0.4) * 6, 0, 1) * np.clip((src[..., 1] - 0.45) * 6, 0, 1)  # the yellow
    key = np.clip(key, 0, 1)[..., None]
    out = scene * m + src * key * (1 - m)
    return Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8))


def scene_state(path):
    """(ceiling, middle, headline) brightness: the lit studio has its ceiling on; the rain scene has a dark sky
    over a lit middle; a full blackout is dark in both."""
    im = Image.open(path).convert("L")
    w, h = im.size
    top = im.crop((w // 4, 0, w * 3 // 4, h // 8)).resize((32, 8))
    mid = im.crop((w // 4, h // 3, w * 3 // 4, h * 2 // 3)).resize((32, 16))
    head = im.crop((int(w * 0.02), int(h * 0.68), int(w * 0.3), int(h * 0.82))).resize((56, 28))
    mean = lambda i: sum(i.get_flattened_data()) / (i.width * i.height)
    return mean(top), mean(mid), max(head.get_flattened_data())


if __name__ == "__main__":
    d = sys.argv[1]
    files = sorted(f for f in os.listdir(d) if f.startswith("f") and f.endswith(".jpg"))
    # open on the first rain-scene frame: ceiling fully off, LIGHTS OUT. already on screen
    start = 0
    for i, f in enumerate(files[:240]):
        top, mid, head = scene_state(os.path.join(d, f))
        if top < 12 and mid > 12 and head > 200:
            start = i
            break
    for f in files[:start]:
        os.remove(os.path.join(d, f))
    kept = files[start:]
    for k, f in enumerate(kept):
        src = os.path.join(d, f)
        dst = os.path.join(d, f"g{k:05d}.jpg")
        if k < DARK:  # the opening stretch plays on in the dark, lamps only
            blackout(Image.open(src).convert("RGB")).save(dst, quality=95)
            os.remove(src)
        else:
            os.rename(src, dst)
    for k in range(len(kept)):
        os.rename(os.path.join(d, f"g{k:05d}.jpg"), os.path.join(d, f"f{k:05d}.jpg"))
    print(f"strobe_post: opens on captured frame {start}; {min(DARK, len(kept))} blackout frames, {len(kept)} in all")
