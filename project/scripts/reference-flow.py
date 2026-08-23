#!/usr/bin/env python3
"""
reference-flow.py — run the hero's own flow measurement on reference-waves.mp4.

check-sea-flow.py answers "which way is the hero's water travelling, and how
fast" from a strip of pixels. This asks the reference the same question with the
same code path, at the same four places on the plate, so the two answers are
directly comparable instead of being two different measurements of two
different things.

The four strips are given in plate reference coordinates, exactly as
check-sea-flow.js has them, and mapped into the video by two anchors measured
off the footage:

    x:  the white page spans 566..2377 video px  <->  0..1560 plate px
    y:  the water spans 780..1140 video px       <->  plate y 340..570

The second is a band-to-band map rather than the first one's scale, because the
video is an AI re-render of this page and its sea is drawn about 14% shallower
relative to the page than the artwork's is. Mapping depth by the page width
instead would put the "far" strips above the video's horizon, in white paper.

It also runs on the hero's own frames, captured at the same cadence by
grab-hero.js, by passing `hero` as the third argument — which is the whole
point: one metric, one code path, two subjects.

Usage from project/:
  python3 scripts/reference-flow.py <framedir> [step_frames] [ref|hero]
"""
import sys
import glob
import numpy as np
from PIL import Image, ImageFilter

FPS = 24.0

#: Page edges and water band in video px, both measured off the frames.
PAGE_X0, PAGE_X1 = 566, 2377
WATER_Y0, WATER_Y1 = 780, 1140

#: The plate-space band the hero's strips are quoted in.
BAND_Y0, BAND_Y1 = 340, 570

SX = (PAGE_X1 - PAGE_X0) / 1560.0
SY = (WATER_Y1 - WATER_Y0) / (BAND_Y1 - BAND_Y0)

#: check-sea-flow.js's strips, in plate reference px.
STRIPS = {
    "port": {"x": 90, "y": 470, "w": 340, "h": 90},
    "starboard": {"x": 1130, "y": 470, "w": 340, "h": 90},
    "port-far": {"x": 60, "y": 356, "w": 340, "h": 44},
    "starboard-far": {"x": 1150, "y": 356, "w": 340, "h": 44},
}
WANT = {"port": -1, "starboard": +1, "port-far": -1, "starboard-far": +1}

#: check-sea-flow.py's constants, carried across in plate px and scaled here.
BLUR_REF = 10.0
#: Raised well above check-sea-flow.py's 40. The reference travels fast enough
#: that 40 plate px per step is a ceiling it hits, not a bound it respects:
#: the first run of this reported a dozen steps at exactly 317 px/s, which is
#: this limit divided by the step, not a speed.
MAX_SHIFT_REF = 130
MIN_CONFIDENCE = 0.02
MIN_SHIFT_REF = 3


#: The hero's canvas is WATER_VIEW: plate y 298..658 across the full 1560 wide,
#: captured at deviceScaleFactor 1, so plate x is 1:1 and plate y is an offset.
HERO_VIEW_Y, HERO_VIEW_H = 298, 360


def crop(frame, s, mode, sx, sy, oy):
    x0 = round(s["x"] * sx + (PAGE_X0 if mode == "ref" else 0))
    x1 = round((s["x"] + s["w"]) * sx + (PAGE_X0 if mode == "ref" else 0))
    y0 = round(oy + (s["y"] - (BAND_Y0 if mode == "ref" else HERO_VIEW_Y)) * sy)
    y1 = round(oy + (s["y"] + s["h"] - (BAND_Y0 if mode == "ref" else HERO_VIEW_Y)) * sy)
    im = Image.fromarray(frame).crop((x0, y0, x1, y1))
    im = im.filter(ImageFilter.GaussianBlur(BLUR_REF * sx))
    a = np.asarray(im, dtype=float)
    return a - a.mean(axis=1, keepdims=True)


def shift_between(a, b, max_shift):
    best, best_score, scores = 0, -np.inf, []
    for s in range(-max_shift, max_shift + 1):
        if s < 0:
            x, y = a[:, -s:], b[:, : a.shape[1] + s]
        elif s > 0:
            x, y = a[:, : a.shape[1] - s], b[:, s:]
        else:
            x, y = a, b
        n = np.sqrt((x * x).sum() * (y * y).sum())
        sc = float((x * y).sum() / n) if n else 0.0
        scores.append(sc)
        if sc > best_score:
            best_score, best = sc, s
    return best, float(best_score - np.median(scores))


def main():
    d = sys.argv[1]
    gap = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    mode = sys.argv[3] if len(sys.argv) > 3 else "ref"
    fs = sorted(glob.glob(d + "/f*.png"))
    A = [np.asarray(Image.open(f).convert("L"), dtype=np.uint8) for f in fs]
    if mode == "ref":
        sx, sy, oy = SX, SY, WATER_Y0
    else:
        sx = A[0].shape[1] / 1560.0
        sy = A[0].shape[0] / HERO_VIEW_H
        oy = 0
    dt = gap / FPS
    max_shift = round(MAX_SHIFT_REF * sx)
    min_shift = MIN_SHIFT_REF * sx
    print(f"{mode}: {len(A)} frames, step {gap} frames ({dt:.3f}s)")
    print(f"1 source px = {1 / sx:.4f} plate px horizontally\n")
    for side, want in WANT.items():
        frames = [crop(a, STRIPS[side], mode, sx, sy, oy) for a in A]
        signs, speeds, still = [], [], 0
        for i in range(0, len(frames) - gap, gap):
            s, conf = shift_between(frames[i], frames[i + gap], max_shift)
            if conf < MIN_CONFIDENCE or abs(s) < min_shift:
                still += 1
                continue
            speeds.append(abs(s) / sx / dt)
            signs.append(1 if s > 0 else -1)
        if not signs:
            print(f"{side:<14} no measurable travel ({still} still)")
            continue
        agreed = sum(1 for g in signs if g == want)
        run = worst = 0
        for g in signs:
            run = run + 1 if g != want else 0
            worst = max(worst, run)
        print(f"{side:<14} {agreed}/{len(signs)} steps outward, "
              f"longest wrong-way run {worst}, {still} still, "
              f"mean {np.mean(speeds):.1f} plate px/s "
              f"(median {np.median(speeds):.1f}, max {np.max(speeds):.1f})")


if __name__ == "__main__":
    main()
