#!/usr/bin/env python3
"""
check-sea-frame0.py — compare the frozen hero water with waves.svg itself.

Reads the two captures made by check-sea-frame0.js and asks the question the
whole design rests on: with the clock stopped, is the canvas still drawing the
artwork?

It is a correlation, not a pixel diff.  The canvas paints over the plate's white
page and the semi-transparent watermark behind it, and it rasterises a
round-capped dot differently from the SVG renderer, so identical output was never
the bar.  Both sides are high-passed first, which drops the page, the watermark
and the depth haze and leaves the contours, the wash steps and the lattice —
the things that would change if the surface had stopped being waves.svg.

The threshold is calibrated against a control printed beside it: the same
comparison with the artwork slid sideways, which is what "a different sea"
scores on this measure.

Usage:  python3 scripts/check-sea-frame0.py <dir>
"""
import sys
import os
import numpy as np
from PIL import Image, ImageFilter

#: waves.svg's own width, the space HULL is measured in.
REF_W = 1560

#: Columns the hull occupies, excluded from the compare.
HULL = (500, 1070)

#: The foreground dissolves to white below this fraction of the band; the two
#: rasterisers disagree most there and there is least left to compare.
KEEP = 0.86

#: High-pass radius, in px.  The hero's washes are semi-transparent, so the
#: "AI DRIVEN / SHIPPING" watermark and the white page show through the water —
#: neither of which exists behind a bare waves.svg.  Those are all low-frequency,
#: so subtracting a heavy blur from both sides drops them.
HIGHPASS = 20.0

#: How far, in px, to hunt for the alignment between the two crops.
SEARCH = 4

#: Negative control: the artwork against itself, rolled by this much.  Both axes,
#: because the lattice is a regular grid — slide it sideways alone and a good
#: fraction of the dots still land on dots, which flatters the control.
CONTROL_SHIFT = (23, 9)   # x, y

#: Correlation the aligned comparison must reach.  Sits well above the control
#: and well below 1.0 — the gap to 1.0 is the two rasterisers' antialiasing, not
#: the geometry.
MIN_CORR = 0.70


def highpass(im):
    a = np.asarray(im, dtype=float)
    lo = np.asarray(im.filter(ImageFilter.GaussianBlur(HIGHPASS)), dtype=float)
    return a - lo


def corr(x, y):
    x = x - x.mean()
    y = y - y.mean()
    den = np.sqrt((x * x).sum() * (y * y).sum())
    return float((x * y).sum() / den) if den else -1.0


def main():
    d = sys.argv[1]
    ref = Image.open(os.path.join(d, "svg.png")).convert("L")
    hero = Image.open(os.path.join(d, "hero.png")).convert("L")

    # Put the hero's crop on the artwork's own scale — WIDTH only, and the
    # height by the same factor.  Resizing it to the SVG's full 360 rows instead
    # stretches the band by 8%, which is enough on its own to decorrelate a
    # lattice at this pitch.
    hero = hero.resize(
        (ref.width, max(1, round(hero.height * ref.width / hero.width))),
        Image.LANCZOS,
    )

    a, b = highpass(ref), highpass(hero)
    rows = min(int(ref.height * KEEP), b.shape[0])
    a, b = a[:rows], b[:rows]

    s = ref.width / REF_W
    keep = np.ones(ref.width, bool)
    keep[int(HULL[0] * s):int(HULL[1] * s)] = False

    # The plate's top edge and the artwork's viewBox agree in theory; in
    # practice the crop lands within a pixel or two of it, so find the offset
    # rather than assume it.
    best = (-2.0, 0, 0)
    for dy in range(-SEARCH, SEARCH + 1):
        av = a[max(0, dy):rows + min(0, dy)]
        bv = b[max(0, -dy):rows + min(0, -dy)]
        n = min(av.shape[0], bv.shape[0])
        for dx in range(-SEARCH, SEARCH + 1):
            x, y = av[:n], bv[:n]
            m = keep
            if dx > 0:
                x, y, m = x[:, dx:], y[:, :-dx], keep[dx:] & keep[:-dx]
            elif dx < 0:
                x, y, m = x[:, :dx], y[:, -dx:], keep[:dx] & keep[-dx:]
            c = corr(x[:, m], y[:, m])
            if c > best[0]:
                best = (c, dx, dy)

    got, dx, dy = best
    rolled = np.roll(np.roll(a, CONTROL_SHIFT[0], axis=1), CONTROL_SHIFT[1], axis=0)
    control = corr(a[:, keep], rolled[:, keep])
    mad = float(np.abs(np.asarray(ref, float)[:rows][:, keep]
                       - np.asarray(hero, float)[:rows][:, keep]).mean())
    ok = got >= MIN_CORR and got > control
    print(
        "%s frame zero vs waves.svg: correlation %.4f (>= %.2f, control %.4f) "
        "at offset (%+d, %+d)px, mean abs difference %.1f/255"
        % ("PASS" if ok else "FAIL", got, MIN_CORR, control, dx, dy, mad)
    )
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
