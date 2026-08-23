#!/usr/bin/env python3
"""
compare-motion.py — put the hero's motion and the reference's side by side.

Takes the two frame sets — grab-reference.js's from the clip, grab-hero.js's
from the page, both at 24fps over the clip's own 5.167s — resamples them onto
the same plate-reference grid, and emits their kymographs stacked in pairs.

A kymograph stacks one row of pixels from every frame, so time runs down and
space runs across: a wave train at constant speed draws a straight diagonal
whose slope is its speed. Two of them stacked is the most direct way to see
whether the two seas are doing the same thing — the streaks either match in
angle, spacing and sign, or they do not, and no amount of staring at single
frames answers that.

Usage from project/:
  python3 scripts/compare-motion.py <ref-frames> <hero-frames> <out.png>
"""
import sys
import glob
import numpy as np
from PIL import Image

#: Plate rows to slice, one per depth.
ROWS = {"far": 372, "mid": 470, "near": 540}

#: The reference's page and water band, in its own video px.
REF_X0, REF_X1 = 566, 2377
REF_WY0, REF_WY1 = 780, 1140
#: The plate band those map onto.
BAND_Y0, BAND_Y1 = 340, 570

#: The hero canvas is WATER_VIEW — plate y 298..658, full 1560 wide.
HERO_VIEW_Y, HERO_VIEW_H = 298, 360

#: Width every strip is resampled to, in plate px, and the vertical zoom.
W = 1560
ZOOM_Y = 3


def norm(a):
    a = a.astype(np.float32)
    a -= a.mean(axis=1, keepdims=True)
    a /= a.std() + 1e-6
    a = np.clip(a * 55 + 128, 0, 255).astype(np.uint8)
    return np.repeat(a, ZOOM_Y, axis=0)


def strip(d, plate_y, mode):
    fs = sorted(glob.glob(d + "/f*.png"))
    if not fs:
        sys.exit("no frames in " + d)
    rows = []
    for f in fs:
        im = Image.open(f).convert("L")
        if mode == "ref":
            y = REF_WY0 + (plate_y - BAND_Y0) * (REF_WY1 - REF_WY0) / (BAND_Y1 - BAND_Y0)
            box = (REF_X0, int(round(y)), REF_X1, int(round(y)) + 1)
        else:
            y = (plate_y - HERO_VIEW_Y) * im.height / HERO_VIEW_H
            box = (0, int(round(y)), im.width, int(round(y)) + 1)
        line = im.crop(box).resize((W, 1), Image.LANCZOS)
        rows.append(np.asarray(line)[0])
    return np.stack(rows)


def main():
    ref_d, hero_d, out = sys.argv[1], sys.argv[2], sys.argv[3]
    panels = []
    for name, y in ROWS.items():
        r = strip(ref_d, y, "ref")
        h = strip(hero_d, y, "hero")
        n = min(len(r), len(h))
        print(f"{name:>5} plate y={y}: reference {len(r)} frames, hero {len(h)}"
              f" -> comparing {n}")
        black = np.zeros((3, W), np.uint8)
        white = np.full((12, W), 255, np.uint8)
        panels += [norm(r[:n]), black, norm(h[:n]), white]
    Image.fromarray(np.vstack(panels[:-1])).save(out)
    print(f"\nwrote {out}: per depth, REFERENCE above a black rule, HERO below.")
    print("Streaks should match in slope (speed), sign (outward) and spacing.")


if __name__ == "__main__":
    main()
