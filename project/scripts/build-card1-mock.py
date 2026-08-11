"""Build a transparent, 2x card-1 mock from the user-supplied FuelSense artwork.

The source is a white-plated screenshot with real drop-shadows under the
callout pills. We recover a soft alpha matte so the artwork composites onto
the tinted card (#FEF9F5) without a white box edge, and export at 2x for
Retina density via next/image.
"""

from PIL import Image, ImageFilter

SRC = ('/Users/tulikaprasad/.cursor/projects/'
       'Users-tulikaprasad-Desktop-ICON-TECH-WEBSITE/assets/'
       'Screenshot_2026-08-04_at_8.03.22_PM-9e0408ec-be75-48cc-817d-6b1cc4460e75.png')
OUT = 'public/images/product-erp-mock.png'
BG = (254, 254, 254)      # baked white plate
CARD = (254, 249, 245)    # #FEF9F5 card tint we composite over


def build():
    im = Image.open(SRC).convert('RGB')
    px = im.load()
    w, h = im.size

    # Soft alpha: distance from the baked white plate, so dark text/shadows are
    # opaque and pure white background is transparent.
    alpha = Image.new('L', (w, h))
    ap = alpha.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            # 0 when exactly plate-white, rising as the pixel darkens/tints
            d = max(BG[0] - r, BG[1] - g, BG[2] - b)
            ap[x, y] = 255 if d >= 26 else round(d / 26 * 255)
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.6))

    # Un-premultiply against the card tint so edge pixels blend correctly.
    out = Image.new('RGBA', (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            a = alpha.getpixel((x, y))
            if a == 0:
                op[x, y] = (0, 0, 0, 0)
                continue
            r, g, b = px[x, y]
            f = a / 255
            # invert the white-plate composite: pixel = fg*f + BG*(1-f)
            fg = tuple(min(255, max(0, round((c - (1 - f) * BG[i]) / f)))
                       for i, c in enumerate((r, g, b)))
            op[x, y] = (*fg, a)

    # 2x for density
    out = out.resize((w * 2, h * 2), Image.LANCZOS)
    out.save(OUT)
    print('wrote', OUT, out.size)


build()
