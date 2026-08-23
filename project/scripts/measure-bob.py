#!/usr/bin/env python3
"""
measure-bob.py — measure the reference ship's vertical motion, frame by frame.

Correlates a column strip through the hull against the same strip in frame 0
and reports the vertical offset, sub-pixel. The strip is taken across the
topsides, where the boot-top line and the deck edge give strong horizontal
features, and stops short of the waterline so the moving water does not drag
the correlation.

Reports the trace in video px and in plate reference px under two mappings,
because they answer different questions and disagree by about 20%:

  * by page width  — how far the water moved the ship across the page;
  * by ship size   — the same bob as a fraction of the ship's own height,
                     which is what makes a bob read as the same bob when the
                     two ships are drawn at different scales.

Usage from project/:  python3 scripts/measure-bob.py <framedir>
"""
import sys
import glob
import numpy as np
from PIL import Image

FPS = 24.0

#: video px -> plate reference px, by the white page's width (1812 -> 1560).
S_PAGE = 1560 / 1812.0

#: The same, by the ship: the reference hull is 457 video px at its widest
#: clean row, the hero's cutout 465 ref px at its own. A bob that is the same
#: fraction of the hull is the same bob to the eye.
S_SHIP = 465 / 457.0

#: Column strip through the hull, and the rows to correlate: topsides only.
X0, X1 = 1300, 1660
Y0, Y1 = 700, 980

#: Half-height of the vertical search, in video px. Generous: the first run of
#: this at 40 pinned three consecutive samples at exactly -40.50, which is the
#: search limit, not a measurement.
SEARCH = 110

#: A control strip on furniture that cannot bob: the headline block. Any motion
#: found here is the camera, not the ship, and is subtracted below. AI-rendered
#: footage drifts, and an uncorrected drift would be read as bob.
CX0, CX1, CY0, CY1 = 900, 2050, 150, 330


def main():
    fs = sorted(glob.glob(sys.argv[1] + "/f*.png"))
    A = np.stack([np.asarray(Image.open(f).convert("L"), dtype=np.float32) for f in fs])
    n = A.shape[0]
    def track(y0, y1, x0, x1, search):
        ref = A[0, y0:y1, x0:x1]
        ref = ref - ref.mean()
        out, peak = [], []
        for i in range(n):
            cs = {}
            best = (-2.0, 0)
            for dy in range(-search, search + 1):
                if y0 + dy < 0 or y1 + dy > A.shape[1]:
                    continue
                b = A[i, y0 + dy:y1 + dy, x0:x1]
                b = b - b.mean()
                den = np.sqrt((ref * ref).sum() * (b * b).sum())
                c = float((ref * b).sum() / den) if den > 1e-9 else -2.0
                cs[dy] = c
                if c > best[0]:
                    best = (c, dy)
            c0, dy = best
            l, r = cs.get(dy - 1, c0), cs.get(dy + 1, c0)
            den = l - 2 * c0 + r
            sub = 0.5 * (l - r) / den if abs(den) > 1e-9 else 0.0
            out.append(dy + float(np.clip(sub, -1, 1)))
            peak.append(c0)
        return np.array(out), np.array(peak)

    raw, conf = track(Y0, Y1, X0, X1, SEARCH)
    cam, ccon = track(CY0, CY1, CX0, CX1, 24)
    print(f"camera drift on the headline: {cam.min():+.2f} .. {cam.max():+.2f} "
          f"video px (confidence {ccon.mean():.3f})")
    print(f"hull track confidence {conf.mean():.3f}, worst {conf.min():.3f}")
    if abs(raw).max() >= SEARCH - 0.6:
        print("!! hull track hit the search limit -- widen SEARCH")
    t = raw - cam
    print(f"raw hull p2p {raw.max() - raw.min():.2f}, after removing camera "
          f"{t.max() - t.min():.2f}")
    p2p = t.max() - t.min()
    print(f"{n} frames @ {FPS}fps = {n / FPS:.3f}s")
    print(f"bob, video px:  {t.min():+.2f} .. {t.max():+.2f}   peak-to-peak {p2p:.2f}")
    print(f"bob, ref px (by page width): {p2p * S_PAGE:.2f}")
    print(f"bob, ref px (by ship size):  {p2p * S_SHIP:.2f}")

    # Dominant period, from the FFT of the detrended trace.
    d = t - t.mean()
    sp = np.abs(np.fft.rfft(d * np.hanning(n)))
    k = int(np.argmax(sp[1:])) + 1
    print(f"dominant period: {n / k / FPS:.3f}s  ({k} cycle(s) in the clip)")
    print("\nspectrum (cycles in clip -> period -> power):")
    for j in range(1, min(9, len(sp))):
        print(f"  {j}  {n / j / FPS:6.3f}s  {sp[j] / sp[1:].max():.3f}")

    print("\ntrace, video px (one line per 4 frames):")
    for i in range(0, n, 4):
        bar = int(round((t[i] - t.min()) * 2))
        print(f"  t={i / FPS:5.3f}s {t[i]:+7.2f} " + "#" * bar)


if __name__ == "__main__":
    main()
