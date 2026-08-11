"""Extract the hero ocean/ship illustration from the reference screenshot.

The ship and wave mesh are rendered artwork that cannot be reproduced in DOM,
so they stay a raster. Everything that is genuinely text -- the "AI DRIVEN
SHIPPING" wordmark behind the ship and the two callout labels -- is painted out
here and re-created as real markup in hero.tsx. The asset keeps its white
background and is composited with mix-blend-mode: multiply, so the DOM text
beneath shows through and the ship still occludes it.
"""

from PIL import Image

SRC = "reference/01-hero.png"
DST = "public/images/hero-ocean.png"

# Illustration band within the reference, in reference pixels.
CROP = (0, 392, 1560, 1022)

WHITE = (255, 255, 255)

# Tight boxes around the two callout labels (crop-relative).
LABEL_BOXES = [
    (100, 303, 440, 337),   # ANCHOR CHANGE SUGGESTED
    (1205, 210, 1490, 244),  # FUEL ANOMALY DETECTED
]


def is_peach(p):
    r, g, b = p
    return r > 248 and 225 < g < 252 and 205 < b < 245 and (r - b) > 12


def main():
    im = Image.open(SRC).convert("RGB").crop(CROP)
    px = im.load()
    w, h = im.size

    peach = 0
    for y in range(min(h, 420)):
        for x in range(w):
            if is_peach(px[x, y]):
                px[x, y] = WHITE
                peach += 1

    for x0, y0, x1, y1 in LABEL_BOXES:
        for y in range(y0, y1):
            for x in range(x0, x1):
                px[x, y] = WHITE

    im.save(DST)
    print(f"{DST} {w}x{h}, cleared {peach} wordmark px, {len(LABEL_BOXES)} labels")


if __name__ == "__main__":
    main()
