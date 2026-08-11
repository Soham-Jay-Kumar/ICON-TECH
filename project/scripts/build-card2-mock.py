"""Build a transparent, 2x card-2 mock from the user-supplied agents-network artwork.

Same technique as build-card1-mock.py: recover a soft alpha matte so the
artwork composites onto the tinted card (#FEF9F5) without a white box edge,
and export at 2x for Retina density via next/image.
"""

from PIL import Image, ImageFilter

SRC = ('/Users/tulikaprasad/.cursor/projects/'
       'Users-tulikaprasad-Desktop-ICON-TECH-WEBSITE/assets/'
       'Screenshot_2026-08-04_at_8.59.56_PM-af365bf9-4e74-4ebe-8f00-93aa641510d5.png')
OUT = 'public/images/product-agents-mock.png'
BG = (255, 255, 255)


def build():
    im = Image.open(SRC).convert('RGB')
    px = im.load()
    w, h = im.size

    alpha = Image.new('L', (w, h))
    ap = alpha.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            d = max(BG[0] - r, BG[1] - g, BG[2] - b)
            ap[x, y] = 255 if d >= 26 else round(d / 26 * 255)
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.6))

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
            fg = tuple(min(255, max(0, round((c - (1 - f) * BG[i]) / f)))
                       for i, c in enumerate((r, g, b)))
            op[x, y] = (*fg, a)

    out = out.resize((w * 2, h * 2), Image.LANCZOS)
    out.save(OUT)
    print('wrote', OUT, out.size)


build()
