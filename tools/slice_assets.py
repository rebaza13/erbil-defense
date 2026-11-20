"""Cut Google Flow asset sheets into transparent PNG parts.

Usage: python -I slice_assets.py <raw_dir> <out_dir>
 - Removes the white background (flood-fill from image border, so white areas
   enclosed by outlines - clouds, steam - survive).
 - Soft alpha on edges + white de-fringing.
 - Sheets are split into connected components -> <sheet>/NN.png (row-major order)
   and a labeled preview <sheet>_preview.png for picking parts.
"""
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

RAW, OUT = sys.argv[1], sys.argv[2]

SHEETS = ["kurdish_headgear", "kurdish_weapons", "mongol_headgear", "mongol_weapons",
          "siege_engines", "fx_projectiles", "horse_parts", "general_sheet_A",
          "general_sheet_B", "portraits_kurdish", "portraits_mongol",
          "kurdish_torsos", "mongol_torsos", "ballista_parts", "flame_frames"]
SPRITES = ["erbil_citadel", "mongol_camp"]          # whole object, full border flood
SKY = ["battlefield_bg"]                              # only remove sky (flood from top)
PLAIN = ["menu_art", "map_parchment"]                 # copy as-is


def bg_candidates(rgb):
    mn = rgb.min(axis=2).astype(np.int16)
    mx = rgb.max(axis=2).astype(np.int16)
    return (mn > 232) & ((mx - mn) < 22)


def border_flood(cand, top_only=False):
    lab, n = ndi.label(cand)
    edge = set(np.unique(lab[0, :]))
    if not top_only:
        edge |= set(np.unique(lab[-1, :])) | set(np.unique(lab[:, 0])) | set(np.unique(lab[:, -1]))
    edge.discard(0)
    return np.isin(lab, list(edge))


def make_rgba(rgb, bg):
    fg = ~bg
    rgbf = rgb.astype(np.float32)
    mn = rgbf.min(axis=2)
    band = ndi.binary_dilation(bg, iterations=2) & fg | ndi.binary_dilation(fg, iterations=1) & bg
    alpha = fg.astype(np.float32)
    soft = np.clip((255.0 - mn) / 70.0, 0, 1)
    alpha[band] = soft[band]
    # de-fringe: remove white contribution
    a = np.clip(alpha, 1e-3, 1)[..., None]
    col = np.clip((rgbf - 255.0 * (1 - a)) / a, 0, 255)
    col = np.where(alpha[..., None] > 0.999, rgbf, col)
    out = np.dstack([col, alpha * 255]).astype(np.uint8)
    return out, fg


def split(rgba, fg, name, min_area=350):
    merged = ndi.binary_dilation(fg, iterations=7)
    lab, n = ndi.label(merged)
    objs = ndi.find_objects(lab)
    parts = []
    for i, sl in enumerate(objs):
        if sl is None:
            continue
        area = int((fg[sl] & (lab[sl] == i + 1)).sum())
        if area < min_area:
            continue
        parts.append((i + 1, sl, area))
    # row-major ordering: bucket by vertical center
    def key(p):
        sl = p[1]
        cy = (sl[0].start + sl[0].stop) / 2
        cx = (sl[1].start + sl[1].stop) / 2
        return (round(cy / 140), cx)
    parts.sort(key=key)
    d = os.path.join(OUT, name)
    os.makedirs(d, exist_ok=True)
    meta = []
    prev = Image.fromarray(np.dstack([rgba[..., :3], rgba[..., 3]])).convert("RGBA")
    bgp = Image.new("RGBA", prev.size, (200, 200, 200, 255))
    bgp.alpha_composite(prev)
    dr = ImageDraw.Draw(bgp)
    for idx, (lid, sl, area) in enumerate(parts):
        ys, xs = sl
        y0, y1 = max(ys.start - 3, 0), min(ys.stop + 3, fg.shape[0])
        x0, x1 = max(xs.start - 3, 0), min(xs.stop + 3, fg.shape[1])
        crop = rgba[y0:y1, x0:x1].copy()
        own = (lab[y0:y1, x0:x1] == lid)
        crop[..., 3] = np.where(own, crop[..., 3], 0)
        # tight crop on alpha
        ay, ax = np.nonzero(crop[..., 3] > 8)
        crop = crop[ay.min():ay.max() + 1, ax.min():ax.max() + 1]
        fn = f"{idx:02d}.png"
        Image.fromarray(crop, "RGBA").save(os.path.join(d, fn), optimize=True)
        meta.append({"file": fn, "x": int(x0), "y": int(y0), "w": int(crop.shape[1]), "h": int(crop.shape[0])})
        dr.rectangle([x0, y0, x1, y1], outline=(255, 0, 0, 255), width=2)
        dr.rectangle([x0, y0, x0 + 30, y0 + 22], fill=(255, 0, 0, 255))
        dr.text((x0 + 4, y0 + 4), str(idx), fill=(255, 255, 255, 255))
    bgp.convert("RGB").save(os.path.join(OUT, f"_preview_{name}.jpg"), quality=80)
    with open(os.path.join(d, "parts.json"), "w") as f:
        json.dump(meta, f, indent=1)
    return len(parts)


os.makedirs(OUT, exist_ok=True)
for name in SHEETS + SPRITES + SKY + PLAIN:
    p = os.path.join(RAW, name + ".jpg")
    if not os.path.exists(p):
        print("missing", name)
        continue
    img = Image.open(p).convert("RGB")
    if name in PLAIN:
        img.save(os.path.join(OUT, name + ".jpg"), quality=90)
        print(name, "copied")
        continue
    rgb = np.asarray(img)
    cand = bg_candidates(rgb)
    bg = border_flood(cand, top_only=(name in SKY))
    if name in SHEETS and name != "fx_projectiles":
        # enclosed pure-white pockets (inside bows, reins, ladders) are background too
        pure = (rgb.min(axis=2) > 243) & ~bg
        lab, n = ndi.label(pure)
        if n:
            sizes = ndi.sum(pure, lab, range(1, n + 1))
            big = np.isin(lab, np.nonzero(sizes > 150)[0] + 1)
            bg = bg | big
    rgba, fg = make_rgba(rgb, bg)
    if name in SHEETS:
        print(name, split(rgba, fg, name), "parts")
    else:
        if name in SPRITES:
            ay, ax = np.nonzero(rgba[..., 3] > 8)
            rgba = rgba[ay.min():ay.max() + 1, ax.min():ax.max() + 1]
        Image.fromarray(rgba, "RGBA").save(os.path.join(OUT, name + ".png"), optimize=True)
        print(name, "sprite", rgba.shape)
