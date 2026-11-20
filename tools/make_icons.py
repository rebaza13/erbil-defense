"""Build Android launcher icons from the Flow-generated Kurdish general head.
Usage: python -I make_icons.py <sliced_dir> <android_res_dir>"""
import sys, os
from PIL import Image, ImageDraw

SRC, RES = sys.argv[1], sys.argv[2]
head = Image.open(os.path.join(SRC, "general_sheet_A", "01.png")).convert("RGBA")


def icon(size, round_=False, fg_only=False):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if not fg_only:
        bg = Image.new("RGBA", (size, size), (30, 92, 52, 255))
        d = ImageDraw.Draw(bg)
        d.ellipse([size * 0.06, size * 0.06, size * 0.94, size * 0.94], outline=(214, 170, 74, 255), width=max(2, size // 24))
        if round_:
            mask = Image.new("L", (size, size), 0); ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
            bg.putalpha(mask)
        im.alpha_composite(bg)
    inner = 0.62 if fg_only else 0.78
    h = int(size * inner); w = int(head.width * h / head.height)
    hd = head.resize((w, h), Image.LANCZOS)
    im.alpha_composite(hd, ((size - w) // 2, (size - h) // 2 + int(size * 0.02)))
    return im


SIZES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
FG = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
for dens, s in SIZES.items():
    d = os.path.join(RES, f"mipmap-{dens}")
    if not os.path.isdir(d):
        continue
    icon(s).save(os.path.join(d, "ic_launcher.png"))
    icon(s, round_=True).save(os.path.join(d, "ic_launcher_round.png"))
    icon(FG[dens], fg_only=True).save(os.path.join(d, "ic_launcher_foreground.png"))
# adaptive icon background color
vals = os.path.join(RES, "values", "ic_launcher_background.xml")
with open(vals, "w") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#1E5C34</color>\n</resources>\n')
print("icons written")
