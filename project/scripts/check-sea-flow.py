#!/usr/bin/env python3
"""
check-sea-flow.py — measure which way the hero's water is travelling.

Reads the strips captured by check-sea-flow.js and, for each consecutive pair,
finds the horizontal shift that best lines the two up.  The water is a dot
lattice on a smooth wash, so a plain normalised cross-correlation of the
high-passed rows locks on tightly.

It reports, per side, the sign of every step.  A ping-pong loop, a reversing
keyframe or a modulation running against the advection all show up here: each
produces a long contiguous run of steps travelling the wrong way — half the
cycle of them, in the ping-pong case that shipped once already.

What it does NOT do is demand a perfect record.  The wave sets passing a fixed
window make the local speed range from ~3 to ~40 px/s, and in the lulls a single
step can correlate a few px the wrong way: that is the sign of the residual, not
of the water.  So the bar is a sustained reversal, not a solitary one.

  PASS  no run of MAX_RUN or more consecutive wrong-way steps, and at least
        MIN_AGREE of all measured steps travelling away from the bow.

Usage:  python3 scripts/check-sea-flow.py <dir-of-pngs>
"""
import sys
import glob
import json
import os
import numpy as np
from PIL import Image, ImageFilter

#: Widest shift considered, in px.  Comfortably past anything the model can do
#: in one step at the default SEA_STEP.
#:
#: Raised from 40 when the water was set to the reference's measured speed. The
#: near surface now travels ~200 plate px/s, so at the old 0.5s step it moved
#: 100px between captures and this ceiling was reporting its own limit divided
#: by the step as a speed. The step came down with it — see check-sea-flow.js.
MAX_SHIFT = 90

#: Horizontal blur applied before correlating, in px.
#:
#: Load-bearing.  The lattice has a 4.6-9.7px pitch, so a raw correlation of the
#: strip is PERIODIC at that pitch: any step longer than one dot spacing locks
#: onto the neighbouring lobe and reports the travel backwards.  That is an
#: artefact of measuring a regular grid, not of the water, and it is why this
#: blurs the dots away first and follows the wave forms underneath them.  Keep
#: SEA_STEP short enough that the true travel stays inside MAX_SHIFT too.
BLUR = 10.0

#: Steps whose correlation peak is this flat are called "still" rather than
#: given a direction — a strip can sit near a turning point of the swell.
MIN_CONFIDENCE = 0.02

#: Travel, in px, a step needs before its direction is read at all.
#:
#: The strips are blurred by BLUR before correlating, so anything under a couple
#: of px is inside the measurement's own resolution, and the water genuinely does
#: come near a standstill in a given window as a wave set passes through it — the
#: speed here ranges from ~3 to ~40 px/s. Below this the answer would be the sign
#: of the noise, which is not what this check is about: it asks which way the
#: water travels, and it can only answer for the steps where it travels.
MIN_SHIFT = 3

#: Contrast a strip must carry before it is worth correlating.
#:
#: A guard, not a tuning knob. Next's dev server can leave the water worker
#: running a stale chunk after an edit to anything it imports, and the canvas
#: then paints nothing at all — whereupon this happily correlated blank white
#: against blank white and reported a confident PASS at 2 px/s. An empty strip
#: is a broken page, not a slow sea.
MIN_CONTRAST = 1.0

#: Which way each strip must travel for the flow to be outward-going.  Two
#: depths a side: the near pair says the water travels, the far pair says the
#: horizon is not a static band behind it.
WANT = {
    "port": -1,
    "starboard": +1,
    "port-far": -1,
    "starboard-far": +1,
}

#: Consecutive wrong-way steps that count as the water actually turning round.
#: A reversing loop of any kind gives runs far longer than this.
MAX_RUN = 3

#: Fraction of measured steps that must travel outward.
MIN_AGREE = 0.95


def load(path, strip, band, scale):
    """One strip out of a band capture, blurred free of the lattice."""
    im = Image.open(path).convert("L")
    box = (
        round(strip["x"] * scale),
        round((strip["y"] - band["y"]) * scale),
        round((strip["x"] + strip["w"]) * scale),
        round((strip["y"] - band["y"] + strip["h"]) * scale),
    )
    im = im.crop(box).filter(ImageFilter.GaussianBlur(BLUR))
    a = np.asarray(im, dtype=float)
    # Take out the depth gradient so the correlation follows the wave forms.
    return a - a.mean(axis=1, keepdims=True)


def shift_between(a, b):
    """Best horizontal shift taking `a` to `b`, in px, plus a confidence."""
    best, best_score, scores = 0, -np.inf, []
    for s in range(-MAX_SHIFT, MAX_SHIFT + 1):
        if s < 0:
            x, y = a[:, -s:], b[:, : a.shape[1] + s]
        elif s > 0:
            x, y = a[:, : a.shape[1] - s], b[:, s:]
        else:
            x, y = a, b
        n = np.sqrt((x * x).sum() * (y * y).sum())
        score = float((x * y).sum() / n) if n else 0.0
        scores.append(score)
        if score > best_score:
            best_score, best = score, s
    scores = np.array(scores)
    return best, float(best_score - np.median(scores))


def main():
    d = sys.argv[1]
    with open(os.path.join(d, "meta.json")) as fh:
        meta = json.load(fh)
    files = sorted(glob.glob(os.path.join(d, "band-*.png")))
    ts = [t / 1000.0 for t in meta["stamps"]]
    ok = True
    for side, want in WANT.items():
        if len(files) < 3:
            print(f"FAIL {side}: only {len(files)} frames")
            return 1
        frames = [
            load(f, meta["strips"][side], meta["band"], meta["scale"])
            for f in files
        ]
        contrast = float(np.mean([f.std() for f in frames]))
        if contrast < MIN_CONTRAST:
            print(
                f"FAIL {side}: strip is blank (contrast {contrast:.3f}) — "
                "the water is not being drawn at all"
            )
            ok = False
            continue
        signs, speeds, confs, still = [], [], [], 0
        for i in range(len(frames) - 1):
            s, conf = shift_between(frames[i], frames[i + 1])
            dt = ts[i + 1] - ts[i]
            if conf < MIN_CONFIDENCE or s == 0:
                still += 1
                continue
            speeds.append(abs(s) / dt if dt > 0 else 0.0)
            confs.append(conf)
            signs.append(1 if s > 0 else -1)
        if not signs:
            print(f"FAIL {side}: no measurable travel in {len(frames)} frames")
            ok = False
            continue
        agreed = sum(1 for g in signs if g == want)
        run = worst = 0
        for g in signs:
            run = run + 1 if g != want else 0
            worst = max(worst, run)
        span = ts[-1] - ts[0]
        px_s = float(np.mean(speeds)) if speeds else 0.0
        good = worst < MAX_RUN and agreed >= MIN_AGREE * len(signs)
        ok &= good
        print(
            f"{'PASS' if good else 'FAIL'} {side:<10} {agreed}/{len(signs)} steps "
            f"travel {'left' if want < 0 else 'right'} (outward), "
            f"longest wrong-way run {worst} (< {MAX_RUN}), "
            f"{still} too still to call, "
            f"mean {px_s:.1f} px/s over {span:.0f}s"
        )
        if agreed != len(signs):
            wrong = [i for i, g in enumerate(signs) if g != want]
            print(f"      isolated wrong-way step(s) {wrong[:12]}")
        if os.environ.get("SEA_DEBUG"):
            print("      px-per-second / confidence per measured step:")
            print("      " + " ".join(
                f"{v:.0f}/{cf:.3f}" for v, cf in zip(speeds, confs)))
    print("sea flow:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
