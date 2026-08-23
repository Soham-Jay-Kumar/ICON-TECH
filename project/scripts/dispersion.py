#!/usr/bin/env python3
"""
dispersion.py — speed as a function of wavelength, for either sea.

One number for "how fast is the water" is not enough to match the reference,
because the reference is dispersive: its long formations travel several times
faster than its fine texture, and the *ordering* is as much of the look as the
speed. This measures each spatial scale separately, at the four strips
check-sea-flow.js uses, on frames from either grab-reference.js or grab-hero.js.

Band-passing before correlating is what makes the answer meaningful: correlate
the raw strip and the result is whichever scale happens to carry the most
contrast, which is not a property of the water so much as of the renderer.

Usage from project/:
  python3 scripts/dispersion.py <framedir> <ref|hero> [step_frames]
"""
import sys
import glob
import numpy as np
from PIL import Image

FPS = 24.0

#: The reference's page and water band, in its own video px, and the plate band
#: they map onto.
REF_X0, REF_X1 = 566, 2377
REF_WY0, REF_WY1 = 780, 1140
BAND_Y0, BAND_Y1 = 340, 570

#: The hero canvas is WATER_VIEW — plate y 298..658, full 1560 wide.
HERO_VIEW_Y, HERO_VIEW_H = 298, 360

STRIPS = {
    "port": (90, 470, 340, 90),
    "starboard": (1130, 470, 340, 90),
    "port-far": (60, 356, 340, 44),
    "starboard-far": (1150, 356, 340, 44),
}
WANT = {"port": -1, "starboard": +1, "port-far": -1, "starboard-far": +1}

#: Wavelength bands, in plate px.
BANDS = [("8-25", 8, 25), ("25-60", 25, 60), ("60-140", 60, 140),
         ("140-320", 140, 320), ("320-900", 320, 900)]

#: Widest shift searched, in plate px per step.
MAX_SHIFT = 110


def blur1d(a, sigma):
    if sigma < 0.4:
        return a.copy()
    r = int(sigma * 3) + 1
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    pad = np.pad(a, ((0, 0), (r, r)), mode="edge")
    out = np.zeros_like(a)
    for i, w in enumerate(k):
        out += w * pad[:, i:i + a.shape[1]]
    return out


def shift_between(a, b, ms):
    scores, best = [], (-9.0, 0)
    for s in range(-ms, ms + 1):
        if s < 0:
            x, y = a[:, -s:], b[:, : a.shape[1] + s]
        elif s > 0:
            x, y = a[:, : a.shape[1] - s], b[:, s:]
        else:
            x, y = a, b
        n = np.sqrt((x * x).sum() * (y * y).sum())
        v = float((x * y).sum() / n) if n else 0.0
        scores.append(v)
        if v > best[0]:
            best = (v, s)
    return best[1], best[0] - float(np.median(scores))


def main():
    d, mode = sys.argv[1], sys.argv[2]
    gap = int(sys.argv[3]) if len(sys.argv) > 3 else 2
    fs = sorted(glob.glob(d + "/f*.png"))
    A = [np.asarray(Image.open(f).convert("L"), dtype=np.float32) for f in fs]
    h, w = A[0].shape
    if mode == "ref":
        sx = (REF_X1 - REF_X0) / 1560.0
        sy = (REF_WY1 - REF_WY0) / (BAND_Y1 - BAND_Y0)
        ox, oy, by = REF_X0, REF_WY0, BAND_Y0
    else:
        sx, sy = w / 1560.0, h / HERO_VIEW_H
        ox, oy, by = 0, 0, HERO_VIEW_Y
    dt = gap / FPS
    ms = round(MAX_SHIFT * sx)
    print(f"{mode}: {len(A)} frames, step {dt:.3f}s, {1 / sx:.3f} plate px per source px")
    print(f"{'strip':>14} {'wavelen':>8} {'median':>8} {'mean':>8} {'outward':>8} {'n':>4}")
    for name, want in WANT.items():
        x, y, sw, sh = STRIPS[name]
        x0, x1 = round(ox + x * sx), round(ox + (x + sw) * sx)
        y0 = round(oy + (y - by) * sy)
        y1 = round(oy + (y + sh - by) * sy)
        st = [a[y0:y1, x0:x1] - a[y0:y1, x0:x1].mean(axis=1, keepdims=True) for a in A]
        for bn, lo, hi in BANDS:
            band = [blur1d(s, lo * sx / 6.0) - blur1d(s, hi * sx / 6.0) for s in st]
            if np.mean([b.std() for b in band]) < 0.15:
                print(f"{name:>14} {bn:>8}     -- no signal at this scale")
                continue
            vs, ok, tot = [], 0, 0
            for i in range(0, len(band) - gap, gap):
                s, c = shift_between(band[i], band[i + gap], ms)
                if c < 0.02 or s == 0:
                    continue
                tot += 1
                ok += int(np.sign(s) == want)
                vs.append(abs(s) / sx / dt)
            if not vs:
                print(f"{name:>14} {bn:>8}     -- no measurable travel")
                continue
            print(f"{name:>14} {bn:>8} {np.median(vs):8.1f} {np.mean(vs):8.1f} "
                  f"{ok / tot:8.0%} {tot:4d}")
        print()


if __name__ == "__main__":
    main()
