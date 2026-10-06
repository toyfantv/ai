"""Generate Roblox classic Shirt / Pants images on the official 585x559 template.

Face rectangles (x, y, w, h) follow Roblox's classic clothing template exactly.
Pants use the same layout: torso region = hips/waist, "arms" regions = legs.
"""
import random
from PIL import Image, ImageDraw, ImageFont

W, H = 585, 559

TORSO = {
    "U": (231, 8, 128, 64),
    "R": (165, 74, 64, 128),
    "F": (231, 74, 128, 128),
    "L": (361, 74, 64, 128),
    "B": (427, 74, 128, 128),
    "D": (231, 204, 128, 64),
}
# Right arm / right leg (left side of image)
RIGHT_LIMB = {
    "U": (217, 289, 64, 64),
    "L": (19, 355, 64, 128),
    "B": (85, 355, 64, 128),
    "R": (151, 355, 64, 128),
    "F": (217, 355, 64, 128),
    "D": (217, 485, 64, 64),
}
# Left arm / left leg (right side of image)
LEFT_LIMB = {
    "U": (308, 289, 64, 64),
    "F": (308, 355, 64, 128),
    "L": (374, 355, 64, 128),
    "B": (440, 355, 64, 128),
    "R": (506, 355, 64, 128),
    "D": (308, 485, 64, 64),
}
ALL = [("TORSO", TORSO), ("RIGHT", RIGHT_LIMB), ("LEFT", LEFT_LIMB)]


def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c[:3]) + (255,)


def fabric(img, rect, base, amount=10, seed=0, twill=False):
    """Fill a rect with base colour plus fine knit (or denim twill) noise."""
    rnd = random.Random(seed)
    x, y, w, h = rect
    px = img.load()
    for j in range(h):
        for i in range(w):
            if twill:
                n = rnd.randint(-amount, amount) + (14 if (i + j) % 4 == 0 else 0)
            else:
                n = rnd.randint(-amount, amount) + (3 if (i + j) % 2 else -3)
            px[x + i, y + j] = tuple(max(0, min(255, base[k] + n)) for k in range(3)) + (255,)


def layer(img, draw_fn):
    """Draw translucent effects on a separate layer, then composite them."""
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(lay))
    img.alpha_composite(lay)


def vgrad(img, rect, strength=40):
    """Soft light-at-top, dark-at-bottom shading."""
    x, y, w, h = rect

    def f(d):
        for j in range(h):
            t = j / max(1, h - 1)
            if t < 0.5:
                d.line([(x, y + j), (x + w - 1, y + j)], fill=(255, 255, 255, int(strength * (0.5 - t))))
            else:
                d.line([(x, y + j), (x + w - 1, y + j)], fill=(0, 0, 0, int(strength * 1.6 * (t - 0.5))))
    layer(img, f)


def stitch(d, x0, y0, x1, y1, color, dash=3, gap=2):
    """Dashed stitch line (horizontal or vertical)."""
    if y0 == y1:
        x = x0
        while x < x1:
            d.line([(x, y0), (min(x + dash, x1), y0)], fill=color)
            x += dash + gap
    else:
        y = y0
        while y < y1:
            d.line([(x0, y), (x0, min(y + dash, y1))], fill=color)
            y += dash + gap


def edge_shadow(img, rect, width=4):
    x, y, w, h = rect

    def f(d):
        for k in range(width):
            a = 60 - k * 14
            d.line([(x + k, y), (x + k, y + h - 1)], fill=(0, 0, 0, a))
            d.line([(x + w - 1 - k, y), (x + w - 1 - k, y + h - 1)], fill=(0, 0, 0, a))
    layer(img, f)


def font(size):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"]:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


def star(d, cx, cy, r_out, r_in, fill):
    import math
    pts = []
    for i in range(10):
        r = r_out if i % 2 == 0 else r_in
        a = -math.pi / 2 + i * math.pi / 5
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    d.polygon(pts, fill=fill)


# ---------------------------------------------------------------- outfits

def midnight_hoodie():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    base = (34, 44, 82)
    dark = shade(base, 0.7)
    light = shade(base, 1.35)
    accent = (255, 196, 61, 255)
    seed = 1
    for _, faces in ALL:
        for r in faces.values():
            fabric(img, r, base, seed=seed)
            seed += 1
    d = ImageDraw.Draw(img, "RGBA")

    # Torso shading + hem rib
    for k in ("F", "B", "L", "R"):
        x, y, w, h = TORSO[k]
        vgrad(img, TORSO[k])
        d.rectangle([x, y + h - 14, x + w - 1, y + h - 1], fill=dark)
        for i in range(x, x + w, 3):
            d.line([(i, y + h - 14), (i, y + h - 1)], fill=shade(base, 0.55))
    edge_shadow(img, TORSO["F"])
    edge_shadow(img, TORSO["B"])

    # Front: hood opening, drawstrings, pocket, logo
    fx, fy, fw, fh = TORSO["F"]
    cx = fx + fw // 2
    d.polygon([(cx - 26, fy), (cx + 26, fy), (cx + 10, fy + 20), (cx - 10, fy + 20)], fill=dark)
    d.line([(cx - 26, fy), (cx - 10, fy + 20), (cx + 10, fy + 20), (cx + 26, fy)], fill=light, width=2)
    for sx in (cx - 8, cx + 8):
        d.line([(sx, fy + 20), (sx + (1 if sx > cx else -1), fy + 50)], fill=(235, 235, 235, 255), width=2)
        d.rectangle([sx - 2, fy + 50, sx + 2, fy + 55], fill=(200, 200, 200, 255))
    # kangaroo pocket
    py = fy + 72
    pocket = [(fx + 22, py + 42), (fx + 30, py), (fx + fw - 30, py), (fx + fw - 22, py + 42)]
    d.polygon(pocket, fill=shade(base, 0.85))
    d.line(pocket, fill=light, width=1)
    d.line([(fx + 30, py), (fx + 22, py + 42)], fill=dark, width=2)
    d.line([(fx + fw - 30, py), (fx + fw - 22, py + 42)], fill=dark, width=2)
    stitch(d, fx + 32, py + 3, fx + fw - 32, py + 3, light)
    # chest logo
    star(d, cx, fy + 42, 11, 5, accent)
    f = font(8)
    d.text((cx, fy + 58), "MIDNIGHT", font=f, fill=accent, anchor="mm")

    # Back: hood draped + big print
    bx, by, bw, bh = TORSO["B"]
    bc = bx + bw // 2
    d.ellipse([bc - 40, by - 30, bc + 40, by + 40], fill=shade(base, 0.9))
    d.arc([bc - 40, by - 30, bc + 40, by + 40], 0, 180, fill=dark, width=3)
    d.line([(bc, by + 18), (bc, by + 40)], fill=dark, width=2)
    star(d, bc, by + 72, 18, 8, accent)
    d.text((bc, by + 96), "NIGHT CREW", font=font(10), fill=accent, anchor="mm")

    # Top (shoulders) & bottom
    ux, uy, uw, uh = TORSO["U"]
    d.rectangle([ux + 34, uy + 10, ux + uw - 34, uy + uh - 10], fill=dark)  # hood seen from above

    # Sleeves: side seam, accent stripe, rib cuffs
    for faces in (RIGHT_LIMB, LEFT_LIMB):
        for k in ("F", "B", "L", "R"):
            x, y, w, h = faces[k]
            vgrad(img, faces[k])
            d.rectangle([x, y + h - 16, x + w - 1, y + h - 1], fill=dark)
            for i in range(x, x + w, 3):
                d.line([(i, y + h - 16), (i, y + h - 1)], fill=shade(base, 0.55))
            stitch(d, x + 2, y + 6, x + w - 2, y + 6, light)  # shoulder seam
        # accent stripe down the outer side
        ox, oy, ow, oh = faces["R"] if faces is RIGHT_LIMB else faces["L"]
        d.rectangle([ox + ow // 2 - 4, oy + 8, ox + ow // 2 + 3, oy + oh - 18], fill=accent)
        d.rectangle([ox + ow // 2 - 1, oy + 8, ox + ow // 2, oy + oh - 18], fill=(255, 255, 255, 255))
        dx, dy, dw, dh = faces["D"]
        d.rectangle([dx, dy, dx + dw - 1, dy + dh - 1], fill=dark)
    return img


def cargo_joggers():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    base = (38, 40, 44)
    dark = shade(base, 0.6)
    light = shade(base, 1.6)
    accent = (255, 196, 61, 255)
    seed = 50
    for _, faces in ALL:
        for r in faces.values():
            fabric(img, r, base, amount=8, seed=seed)
            seed += 1
    d = ImageDraw.Draw(img, "RGBA")

    # Torso = hips: waistband + belt sits at the bottom of the torso panels
    for k in ("F", "B", "L", "R"):
        x, y, w, h = TORSO[k]
        band = y + h - 26
        d.rectangle([x, band, x + w - 1, band + 12], fill=dark)
        stitch(d, x + 1, band + 2, x + w - 1, band + 2, light)
        stitch(d, x + 1, band + 10, x + w - 1, band + 10, light)
        # belt loops
        for lx in range(x + 10, x + w - 4, 26):
            d.rectangle([lx, band - 1, lx + 3, band + 13], fill=shade(base, 0.85))
    fx, fy, fw, fh = TORSO["F"]
    cx = fx + fw // 2
    band = fy + fh - 26
    # buckle + drawcords
    d.rectangle([cx - 9, band - 1, cx + 9, band + 13], outline=accent, width=2)
    d.line([(cx - 4, band + 13), (cx - 6, fy + fh - 1)], fill=(230, 230, 230, 255), width=2)
    d.line([(cx + 4, band + 13), (cx + 6, fy + fh - 1)], fill=(230, 230, 230, 255), width=2)
    # fly seam & front pocket curves
    stitch(d, cx, band + 14, cx, fy + fh, light)
    d.arc([fx - 6, band + 6, fx + 30, band + 50], 270, 360, fill=light, width=1)
    d.arc([fx + fw - 30, band + 6, fx + fw + 6, band + 50], 180, 270, fill=light, width=1)
    # back yoke + brand patch
    bx, by, bw, bh = TORSO["B"]
    bband = by + bh - 26
    d.rectangle([bx + bw // 2 - 14, bband + 1, bx + bw // 2 + 14, bband + 11], fill=accent)
    d.text((bx + bw // 2, bband + 6), "NC", font=font(8), fill=dark, anchor="mm")

    # Legs
    for faces in (RIGHT_LIMB, LEFT_LIMB):
        for k in ("F", "B", "L", "R"):
            x, y, w, h = faces[k]
            vgrad(img, faces[k])
            # jogger cuff (gathered)
            d.rectangle([x, y + h - 16, x + w - 1, y + h - 1], fill=dark)
            for i in range(x, x + w, 3):
                d.line([(i, y + h - 16), (i, y + h - 1)], fill=shade(base, 0.45))
            # knee darts
            for i in range(3):
                d.line([(x + 10, y + 66 + i * 4), (x + w - 10, y + 66 + i * 4)], fill=shade(base, 0.8))
        # cargo pocket on the outer side
        outer = faces["R"] if faces is RIGHT_LIMB else faces["L"]
        ox, oy, ow, oh = outer
        d.rectangle([ox + 8, oy + 34, ox + ow - 9, oy + 70], fill=shade(base, 1.15), outline=dark)
        d.rectangle([ox + 6, oy + 30, ox + ow - 7, oy + 40], fill=shade(base, 1.25), outline=dark)
        stitch(d, ox + 10, oy + 66, ox + ow - 10, oy + 66, light)
        d.rectangle([ox + ow // 2 - 3, oy + 36, ox + ow // 2 + 2, oy + 39], fill=accent)
        # side piping stripe
        d.line([(ox + 2, oy), (ox + 2, oy + oh - 17)], fill=accent, width=2)
        # front crease
        f = faces["F"]
        stitch(d, f[0] + f[2] // 2, f[1] + 4, f[0] + f[2] // 2, f[1] + 70, shade(base, 0.75), dash=4, gap=3)
        dx, dy, dw, dh = faces["D"]
        d.rectangle([dx, dy, dx + dw - 1, dy + dh - 1], fill=(20, 20, 22, 255))  # sole area
    return img


def varsity_jacket():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    body = (150, 24, 36)
    sleeve = (238, 232, 218)
    trim = (24, 24, 28, 255)
    gold = (232, 178, 48, 255)
    seed = 100
    for name, faces in ALL:
        for r in faces.values():
            fabric(img, r, body if name == "TORSO" else sleeve, amount=7, seed=seed)
            seed += 1
    d = ImageDraw.Draw(img, "RGBA")

    def rib(rect, y0, hgt):
        x, y, w, h = rect
        d.rectangle([x, y0, x + w - 1, y0 + hgt - 1], fill=trim)
        d.rectangle([x, y0 + 4, x + w - 1, y0 + 6], fill=gold)
        d.rectangle([x, y0 + 10, x + w - 1, y0 + 12], fill=gold)

    for k in ("F", "B", "L", "R"):
        x, y, w, h = TORSO[k]
        vgrad(img, TORSO[k])
        rib(TORSO[k], y + h - 17, 17)
    edge_shadow(img, TORSO["F"])
    edge_shadow(img, TORSO["B"])

    fx, fy, fw, fh = TORSO["F"]
    cx = fx + fw // 2
    # V collar with tee underneath
    d.polygon([(cx - 22, fy), (cx + 22, fy), (cx, fy + 26)], fill=(245, 245, 245, 255))
    d.line([(cx - 24, fy), (cx, fy + 28), (cx + 24, fy)], fill=trim, width=6)
    d.line([(cx - 24, fy + 1), (cx, fy + 29), (cx + 24, fy + 1)], fill=gold, width=1)
    # snap placket
    d.line([(cx, fy + 28), (cx, fy + fh - 17)], fill=shade(body, 0.6), width=2)
    for sy in range(fy + 36, fy + fh - 20, 18):
        d.ellipse([cx - 3, sy - 3, cx + 3, sy + 3], fill=(210, 210, 210, 255), outline=(120, 120, 120, 255))
    # chenille letter patch on left chest (viewer's right)
    px, py = cx + 30, fy + 44
    d.rounded_rectangle([px - 15, py - 17, px + 15, py + 17], 4, fill=gold)
    d.text((px, py + 1), "R", font=font(26), fill=body + (255,), anchor="mm",
           stroke_width=2, stroke_fill=sleeve + (255,))
    # welt pockets
    for sx in (fx + 16, fx + fw - 40):
        d.rounded_rectangle([sx, fy + 84, sx + 24, fy + 89], 2, fill=trim)

    bx, by, bw, bh = TORSO["B"]
    bc = bx + bw // 2
    d.rectangle([bx, by, bx + bw - 1, by + 6], fill=trim)
    d.text((bc, by + 34), "VARSITY", font=font(17), fill=sleeve + (255,), anchor="mm",
           stroke_width=2, stroke_fill=gold)
    d.text((bc, by + 70), "26", font=font(40), fill=gold, anchor="mm",
           stroke_width=3, stroke_fill=sleeve + (255,))

    ux, uy, uw, uh = TORSO["U"]
    d.rectangle([ux + 30, uy + uh - 12, ux + uw - 30, uy + uh - 1], fill=trim)
    dx, dy, dw, dh = TORSO["D"]
    d.rectangle([dx, dy, dx + dw - 1, dy + dh - 1], fill=trim)

    for faces in (RIGHT_LIMB, LEFT_LIMB):
        for k in ("F", "B", "L", "R"):
            x, y, w, h = faces[k]
            vgrad(img, faces[k])
            rib(faces[k], y + h - 18, 18)
            stitch(d, x + 1, y + 5, x + w - 1, y + 5, shade(sleeve, 0.75))
        outer = faces["R"] if faces is RIGHT_LIMB else faces["L"]
        ox, oy, ow, oh = outer
        d.rectangle([ox, oy + 50, ox + ow - 1, oy + 54], fill=body + (255,))
        d.rectangle([ox, oy + 58, ox + ow - 1, oy + 62], fill=body + (255,))
        d.rectangle([faces["D"][0], faces["D"][1], faces["D"][0] + 63, faces["D"][1] + 63], fill=trim)
    # small sleeve star on left arm front
    f = LEFT_LIMB["F"]
    star(d, f[0] + 32, f[1] + 30, 10, 4, gold)
    return img


def light_jeans():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    base = (96, 140, 196)
    dark = shade(base, 0.62)
    thread = (232, 160, 60, 255)
    seed = 200
    for _, faces in ALL:
        for r in faces.values():
            fabric(img, r, base, amount=12, seed=seed, twill=True)
            seed += 1
    d = ImageDraw.Draw(img, "RGBA")
    belt = (70, 44, 28, 255)
    for k in ("F", "B", "L", "R"):
        x, y, w, h = TORSO[k]
        band = y + h - 28
        d.rectangle([x, band, x + w - 1, band + 12], fill=shade(base, 0.85))
        d.rectangle([x, band + 3, x + w - 1, band + 9], fill=belt)
        stitch(d, x, band + 13, x + w, band + 13, thread)
    fx, fy, fw, fh = TORSO["F"]
    cx = fx + fw // 2
    band = fy + fh - 28
    d.rectangle([cx - 8, band + 1, cx + 8, band + 11], outline=(200, 200, 205, 255), width=2)
    # fly J-stitch, front pockets, rivets, coin pocket
    stitch(d, cx + 10, band + 14, cx + 10, fy + fh - 4, thread)
    d.line([(cx, band + 14), (cx, fy + fh)], fill=dark, width=1)
    d.arc([fx - 14, band + 4, fx + 30, band + 44], 270, 360, fill=thread, width=1)
    d.arc([fx + fw - 30, band + 4, fx + fw + 14, band + 44], 180, 270, fill=thread, width=1)
    for rx in (fx + 16, fx + fw - 17):
        d.ellipse([rx - 1, band + 14, rx + 1, band + 16], fill=(210, 180, 90, 255))
    # back pockets with arcuate stitch + leather patch
    bx, by, bw, bh = TORSO["B"]
    bband = by + bh - 28
    d.rectangle([bx + bw - 30, bband + 1, bx + bw - 12, bband + 11], fill=(150, 110, 70, 255))
    for px in (bx + 14, bx + bw - 50):
        d.polygon([(px, bband + 18), (px + 36, bband + 18), (px + 34, by + bh), (px + 2, by + bh)], outline=thread)

    for faces in (RIGHT_LIMB, LEFT_LIMB):
        for k in ("F", "B", "L", "R"):
            x, y, w, h = faces[k]
            vgrad(img, faces[k])
            # fade at the thigh/knee
            layer(img, lambda L, x=x, y=y, w=w: L.ellipse([x + 12, y + 14, x + w - 12, y + 60], fill=(255, 255, 255, 30)))
            # turned-up hem
            d.rectangle([x, y + h - 12, x + w - 1, y + h - 1], fill=shade(base, 0.9))
            stitch(d, x, y + h - 12, x + w, y + h - 12, thread)
        # outseam
        outer = faces["R"] if faces is RIGHT_LIMB else faces["L"]
        stitch(d, outer[0] + outer[2] // 2, outer[1], outer[0] + outer[2] // 2, outer[1] + outer[3] - 12, thread)
        # knee rip on the front
        f = faces["F"]
        kx, ky = f[0] + 20, f[1] + 62
        d.rectangle([kx, ky, kx + 24, ky + 8], fill=(238, 238, 232, 255))
        for i in range(kx, kx + 24, 3):
            d.line([(i, ky), (i + 1, ky + 8)], fill=(200, 210, 225, 255))
        d.rectangle([faces["D"][0], faces["D"][1], faces["D"][0] + 63, faces["D"][1] + 63], fill=(30, 30, 34, 255))
    return img


def guide():
    """Labelled empty template so you can see which part is which."""
    img = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    colors = {"TORSO": (120, 170, 255), "RIGHT": (255, 150, 150), "LEFT": (140, 220, 140)}
    names = {"F": "FRONT", "B": "BACK", "L": "LEFT", "R": "RIGHT", "U": "UP", "D": "DOWN"}
    for name, faces in ALL:
        for k, (x, y, w, h) in faces.items():
            d.rectangle([x, y, x + w - 1, y + h - 1], fill=colors[name], outline=(0, 0, 0))
            d.text((x + w // 2, y + h // 2), names[k], font=font(10), fill=(0, 0, 0), anchor="mm")
    d.text((295, 280), "TORSO", font=font(12), fill=(0, 0, 0), anchor="mm")
    d.text((80, 300), "RIGHT ARM / RIGHT LEG", font=font(11), fill=(0, 0, 0), anchor="mm")
    d.text((470, 300), "LEFT ARM / LEFT LEG", font=font(11), fill=(0, 0, 0), anchor="mm")
    return img


def clip_to_template(img):
    """Make everything outside the official face rectangles fully transparent."""
    mask = Image.new("L", img.size, 0)
    md = ImageDraw.Draw(mask)
    for _, faces in ALL:
        for x, y, w, h in faces.values():
            md.rectangle([x, y, x + w - 1, y + h - 1], fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def preview(pairs, path):
    """Side-by-side preview sheet (not for upload)."""
    pad = 20
    sheet = Image.new("RGBA", (len(pairs) * (W + pad) + pad, H + 60), (230, 230, 235, 255))
    d = ImageDraw.Draw(sheet)
    for i, (label, im) in enumerate(pairs):
        ox = pad + i * (W + pad)
        # checkerboard so transparency is visible
        for yy in range(0, H, 16):
            for xx in range(0, W, 16):
                c = (255, 255, 255, 255) if (xx // 16 + yy // 16) % 2 else (215, 215, 215, 255)
                d.rectangle([ox + xx, 40 + yy, ox + xx + 15, 40 + yy + 15], fill=c)
        sheet.alpha_composite(im, (ox, 40))
        d.text((ox + W // 2, 20), label, font=font(16), fill=(30, 30, 30), anchor="mm")
    sheet.save(path)


if __name__ == "__main__":
    import os
    out = os.path.dirname(os.path.abspath(__file__))
    items = {
        "shirt_midnight_hoodie.png": midnight_hoodie(),
        "pants_cargo_joggers.png": cargo_joggers(),
        "shirt_varsity_jacket.png": varsity_jacket(),
        "pants_light_jeans.png": light_jeans(),
    }
    items = {fn: clip_to_template(im) for fn, im in items.items()}
    for fn, im in items.items():
        assert im.size == (585, 559)
        im.save(os.path.join(out, fn))
    guide().save(os.path.join(out, "template_guide.png"))
    preview([("Midnight Hoodie (shirt)", items["shirt_midnight_hoodie.png"]),
             ("Cargo Joggers (pants)", items["pants_cargo_joggers.png"])],
            os.path.join(out, "preview_set1.png"))
    preview([("Varsity Jacket (shirt)", items["shirt_varsity_jacket.png"]),
             ("Light Jeans (pants)", items["pants_light_jeans.png"])],
            os.path.join(out, "preview_set2.png"))
    print("done")
