#!/usr/bin/env python3
"""
build-waves-svg.py — regenerate ../../waves.svg from reference/01-hero.png.

The ocean in the hero reference is a point-cloud surface: a quasi-regular dot
lattice lying on a wave height field, drawn in perspective and dissolving to
white in the foreground.  This script measures that surface off the reference
and re-emits it as vector geometry.

What is measured (nothing here is a generic sine wave, and no bitmap is
embedded in the output):

  * the crest silhouette      — the water's top edge, per column, full width
  * the wave field S(x, y)    — the reference's own tonal banding, low-passed
                                and detrended; correlates +0.96 with the
                                measured silhouette, so it is what carries the
                                large wave formations
  * the lattice pitch         — autocorrelation of the high-passed image per
                                depth band; the column pitch runs ~2.9px at
                                the horizon to ~9.8px in the foreground, which
                                is the perspective signature of the surface
  * colour and contrast       — sampled from the reference at every dot and
                                every wash band, so the depth haze, the teal
                                cast and the crest highlights are the
                                reference's own values

The surface is evaluated over a domain wider than the frame and straight
through the span the hull occludes, so the water runs off both edges and is
continuous behind the ship.

Needs Pillow + numpy.  Run from the repo root:  python3 project/scripts/build-waves-svg.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REF = os.path.join(ROOT, "project", "reference", "01-hero.png")
OUT = os.path.join(ROOT, "waves.svg")

# ---------------------------------------------------------------- constants
Y_TOP, Y_BOT = 704, 958        # band where the dot lattice is resolvable
Y_FADE_END = 1030              # where the water has dissolved to white
VIEW = (0, 690, 1560, 360)     # viewBox: the hero frame
BLEED = 120                    # px of geometry carried past each side


def g1(a, s, ax):
    """1-D gaussian blur along one axis (numpy only)."""
    r = max(1, int(3 * s))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2)
    k /= k.sum()
    pad = [(0, 0), (0, 0)]
    pad[ax] = (r, r)
    ap = np.pad(a, pad, mode="edge")
    out = np.zeros_like(a)
    for i, w in enumerate(k):
        sl = [slice(None), slice(None)]
        sl[ax] = slice(i, i + a.shape[ax])
        out += w * ap[tuple(sl)]
    return out


def local_max_y(col):
    return (col[1:-1] >= col[:-2]) & (col[1:-1] > col[2:])


# ================================================================= load
im = Image.open(REF).convert("RGB")
W, H = im.size
RGB = np.array(im).astype(float)
L = np.array(im.convert("L")).astype(float)
HI = L - np.array(im.convert("L").filter(ImageFilter.GaussianBlur(3.0))).astype(float)

# ---------------------------------------------------------- exclusion mask
# The ship, the two callouts and their markers are not water; they must not
# contaminate any measurement, and the surface is reconstructed through them.
excl = np.zeros((H, W), bool)
seed = np.zeros((H, W), bool)
bx, by = slice(440, 1130), slice(700, 1015)
seed[by, bx] = (RGB[by, bx, 0] > RGB[by, bx, 1] + 14) | (L[by, bx] < 72)
for y in range(700, 1015):
    xs = np.nonzero(seed[y])[0]
    if len(xs) >= 12:
        excl[y, xs.min():xs.max() + 1] = True
hy, hx = np.nonzero(excl.copy())
for dy in range(-6, 7):
    for dx in range(-6, 7):
        excl[np.clip(hy + dy, 0, H - 1), np.clip(hx + dx, 0, W - 1)] = True
for x0, y0, x1, y1 in [(100, 694, 570, 730), (596, 726, 660, 790),
                       (1188, 602, 1486, 642), (1008, 674, 1066, 742),
                       (1040, 620, 1200, 700)]:
    excl[y0:y1, x0:x1] = True

# =============================================== 1. the crest silhouette
# Detect the waterline by hue, not by luminance.  The hero's "AI DRIVEN /
# SHIPPING" wordmark sits directly behind the crest and reaches down to y=708;
# a luminance threshold picks up its warm letters and tracks those instead of
# the water, which silently decorrelates the whole silhouette.  The water is
# the only cool thing up there, so B > R separates them cleanly.
Rb = g1(g1(RGB[..., 0], 1.5, 0), 1.5, 1)
Bb = g1(g1(RGB[..., 2], 1.5, 0), 1.5, 1)
Lb = g1(g1(L, 1.5, 0), 1.5, 1)
# The callout text and its leader are dark navy — also cool, so they would be
# picked up as waterline.  They sit on white *above* the water, so masking the
# glyphs lets the scan continue down to the real crest instead of blanking a
# 470px span of it and interpolating the crest away.
callout = np.zeros((H, W), bool)
for x0, y0, x1, y1 in [(100, 692, 578, 732), (1186, 600, 1490, 646),
                       (1038, 616, 1204, 704)]:
    callout[y0:y1, x0:x1] = True
# text is near-black and crisp; the crest under it is a soft mid grey, so the
# threshold separates them without touching the water
glyph = callout & (Lb < 178) & (Bb > Rb)
gy, gx = np.nonzero(glyph)
gm = np.zeros((H, W), bool)
for dy in range(-7, 8):
    for dx in range(-7, 8):
        gm[np.clip(gy + dy, 0, H - 1), np.clip(gx + dx, 0, W - 1)] = True
water = (Bb > Rb + 5) & (Lb < 246) & ~gm
top = np.full(W, np.nan)
for x in range(W):
    m = np.nonzero(water[Y_TOP - 4:Y_BOT, x])[0]
    if len(m):
        top[x] = m[0] + Y_TOP - 4
xs = np.arange(W)
clean = ~np.isnan(top)
clean[440:1130] = False         # hull
top = np.interp(xs, xs[clean], top[clean])
# light smoothing only — the crests are the point, so they must survive
top = np.convolve(np.pad(top, 11, mode="edge"), np.ones(23) / 23, "same")[11:-11]

# =============================================== 2. the wave field S(x, y)
# Inpaint the occluders horizontally, then low-pass and remove the vertical
# depth trend: what is left is the wave banding.
src = L.copy()
for y in range(Y_TOP - 40, min(H, Y_FADE_END + 10)):
    ok = np.nonzero(~excl[y])[0]
    if len(ok) >= 20:
        src[y] = np.interp(xs, ok, L[y, ok])
RGBs = RGB.copy()
for y in range(Y_TOP - 40, min(H, Y_FADE_END + 10)):
    ok = np.nonzero(~excl[y])[0]
    if len(ok) >= 20:
        for c in range(3):
            RGBs[y, :, c] = np.interp(xs, ok, RGB[y, ok, c])

FY0 = Y_TOP - 40
band = src[FY0:Y_FADE_END + 10]
lp = g1(g1(band, 15.0, 1), 7.0, 0)
Sfield = lp - np.array([np.median(r) for r in lp])[:, None]
# Normalise per depth, not globally: the reference's tonal contrast falls away
# toward the foreground even though the waves there are the largest on screen,
# so a single global scale flattens exactly the relief that should be boldest.
# Amplitude is then owned entirely by k(y) below.
rs = np.array([np.percentile(np.abs(r), 90) for r in Sfield])
rs = np.convolve(np.pad(rs, 14, mode="edge"), np.ones(29) / 29, "same")[14:-14]
Sfield /= np.maximum(rs, 0.55 * np.median(rs))[:, None]
Sfield = np.clip(Sfield, -2.4, 2.4)

# Colour ground.  The blur has to be wider than the lattice pitch (~5-10px) or
# the reference's own dots survive in the field and the wash bands alias against
# them into horizontal light/dark stripes.  It is deliberately anisotropic:
# vertically the water goes from 231 to 114 in 24px at the horizon, and a blur
# wide enough to matter there washes that edge out.
TONE = np.stack([g1(g1(RGBs[..., c], 4.0, 0), 8.5, 1) for c in range(3)], -1)


def bilerp(F, x, y, y0=0):
    """sample F at (x, y); x mirror-extends past the frame so the surface bleeds"""
    xx = np.abs(np.asarray(x, float))
    xx = np.where(xx > W - 1, 2 * (W - 1) - xx, xx)
    xx = np.clip(xx, 0, W - 1)
    yy = np.clip(np.asarray(y, float) - y0, 0, F.shape[0] - 1)
    x0 = np.floor(xx).astype(int); y0i = np.floor(yy).astype(int)
    x1 = np.minimum(x0 + 1, W - 1); y1 = np.minimum(y0i + 1, F.shape[0] - 1)
    fx = (xx - x0)[..., None] if F.ndim == 3 else xx - x0
    fy = (yy - y0i)[..., None] if F.ndim == 3 else yy - y0i
    return ((F[y0i, x0] * (1 - fx) + F[y0i, x1] * fx) * (1 - fy) +
            (F[y1, x0] * (1 - fx) + F[y1, x1] * fx) * fy)


def Sof(x, y):
    return bilerp(Sfield, x, y, FY0)


# ------------------------------------------- calibrate displacement k(y)
# k is fixed at the silhouette by least squares against the measured top edge,
# then carried through depth by the perspective scale (see pitch below): the
# same projection that stretches the lattice stretches the wave amplitude.
sil = top - top.mean()
sv = Sof(xs[clean], top[clean])
k_sil = float(sv @ sil[clean]) / max(1e-9, float(sv @ sv))
y_sil = float(top[clean].mean())
print("silhouette: std %.2f px   k_sil %.2f px" % (sil.std(), k_sil))

# =============================================== 3. lattice pitch vs depth
FLANK = [slice(40, 470), slice(1100, 1520)]


def acf_pitch(patch, axis, lo, hi_):
    p = patch - patch.mean(axis=axis, keepdims=True)
    n = p.shape[axis]
    F = np.fft.rfft(p, axis=axis, n=2 * n)
    ac = np.fft.irfft(F * np.conj(F), axis=axis)
    ac = (ac[:n] if axis == 0 else ac[:, :n]).mean(axis=1 - axis)
    if ac[0]:
        ac = ac / ac[0]
    idx = np.arange(len(ac))
    m = (idx >= lo) & (idx <= hi_)
    return float(np.argmax(np.where(m, ac, -9))) if m.any() else np.nan


py_, pv_ = [], []
for y in range(722, 950, 8):
    v = np.nanmedian([acf_pitch(HI[y:y + 14, f], 1, 3, 18) for f in FLANK])
    if np.isfinite(v):
        py_.append(y); pv_.append(v)
py_ = np.array(py_, float); pv_ = np.array(pv_, float)
A = np.vstack([np.ones_like(py_), py_ - Y_TOP, (py_ - Y_TOP) ** 2]).T
pc, *_ = np.linalg.lstsq(A, pv_, rcond=None)
print("pitchX(y) = %.3f %+.5f t %+.7f t^2  (t = y-%d)" % (pc[0], pc[1], pc[2], Y_TOP))


def pitch_x(y):
    t = np.asarray(y, float) - Y_TOP
    return np.clip(pc[0] + pc[1] * t + pc[2] * t * t, 2.9, 13.0)


# The lattice is NOT square.  A 2-D FFT of the reference's high-passed flanks
# returns a reciprocal basis with no axis-aligned peaks — the two dominant
# vectors are diagonal — which is the signature of a staggered (quincunx)
# lattice, and inverting that basis puts the rows at ~0.6 of the column pitch
# with alternate rows offset half a column.  Drawn square and column-aligned
# instead, the same nodes read as a coarse halftone screen with visible
# vertical files, and that screen is what ends up competing with the waves.
ROW_RATIO = 0.62
ROW_STAGGER = 0.5               # alternate rows step half a column


def pitch_y(y):
    return pitch_x(y) * ROW_RATIO


# Colour is sampled at the position each band is drawn, so the displacement
# has to be the reference's own: exaggerating it would drag horizon tone down
# into the mid-field.  Long-contour fits agree with the silhouette calibration.
AMP = 1.0


def kof(y):
    """wave amplitude at depth y — scales with the same perspective factor"""
    return AMP * k_sil * pitch_x(y) / pitch_x(y_sil)


# ------------------------------------------- dot polarity and contrast
# In the mid-field the lattice reads light-on-dark; in the foreground it flips.
pol, con = [], []
ys_p = np.arange(Y_TOP, Y_BOT, 10)
for y in ys_p:
    v = np.concatenate([HI[y:y + 10, f][~excl[y:y + 10, f]] for f in FLANK])
    v = v[np.abs(v) > 0.5]
    if len(v) < 200:
        pol.append(0.0); con.append(2.0); continue
    pol.append(float(np.mean(v ** 3)) / max(1e-6, float(np.mean(v ** 2)) ** 1.5))
    con.append(float(np.percentile(np.abs(v), 92)))
pol = np.convolve(np.pad(pol, 3, mode="edge"), np.ones(7) / 7, "same")[3:-3]
con = np.convolve(np.pad(con, 2, mode="edge"), np.ones(5) / 5, "same")[2:-2]
print("dot contrast: %.1f .. %.1f   polarity %.2f .. %.2f" %
      (min(con), max(con), min(pol), max(pol)))


def polarity(y):
    return np.interp(y, ys_p, pol)


# The far field is defocused in the reference: the lattice there is a smear,
# not dots, so the raw measurement picks up the waterline edge rather than dot
# contrast.  This envelope holds the mesh down until it actually resolves.
CL_A, CL_B, CL_P = 0.8, 30.0, 2.1


def contrast(y):
    c = np.interp(y, ys_p, con)
    # the far field is defocused in the reference — the raw measurement there
    # picks up the waterline edge, not dot contrast
    return np.minimum(c, CL_A + CL_B * np.clip((np.asarray(y, float) - Y_TOP) / 175.0, 0, 1) ** CL_P)


# =============================================== 4. build the surface
def SIL(x):
    """the measured crest silhouette, mirror-extended past both frame edges"""
    xx = np.abs(np.asarray(x, float))
    xx = np.where(xx > W - 1, 2 * (W - 1) - xx, xx)
    return np.interp(np.clip(xx, 0, W - 1), xs, top)


def raw_row(base, x):
    # At base == y_sil this evaluates to the measured silhouette (that is what
    # k_sil was fitted to), so the stack is anchored to the real waterline and
    # steps down from it.
    return base + kof(base) * Sof(x, np.full_like(np.asarray(x, float), base))


def tone_at(x, y):
    """reference tone, never sampled above the waterline (the hero wordmark
    sits just above it and must not tint the water)"""
    return bilerp(TONE, x, np.clip(np.maximum(y, SIL(x) + 2.0), 0, H - 1))


# row baselines, spaced by the measured row pitch
bases = []
y = y_sil
while y < Y_FADE_END - 8:
    bases.append(y)
    y += pitch_y(y)
print("rows:", len(bases), " first pitch %.2f  last %.2f" % (pitch_y(bases[0]), pitch_y(bases[-1])))

XL, XR = VIEW[0] - BLEED, VIEW[0] + VIEW[2] + BLEED
XC = VIEW[0] + VIEW[2] / 2.0

# ------------------------------------------------------- the row stack
# Every contour is resolved once, on a shared grid, with the one constraint a
# height field cannot violate: rows may not swap order.  Where the amplified
# field would make two contours cross, the lower one is pushed down to keep a
# minimum gap — that is what stops the near field from knotting into clumps.
_GX = np.arange(XL, XR + 1e-6, 4.0)
_STACK = []
for _i, _b in enumerate(bases):
    _y = raw_row(_b, _GX)
    if _STACK:
        _y = np.maximum(_y, _STACK[-1] + 0.34 * pitch_y(_b))
    _STACK.append(_y)
_STACK = np.array(_STACK)


def row_at(idx, x):
    """contour `idx` of the stack, sampled at x (fractional idx interpolates)"""
    i0 = int(np.floor(np.clip(idx, 0, len(bases) - 1)))
    i1 = min(i0 + 1, len(bases) - 1)
    f = np.clip(idx, 0, len(bases) - 1) - i0
    row = _STACK[i0] * (1 - f) + _STACK[i1] * f
    return np.interp(np.asarray(x, float), _GX, row)


def idx_for(y):
    """where a given baseline depth sits in the stack"""
    return float(np.interp(y, bases, np.arange(len(bases))))


def columns_for(base, ri=0):
    """dot x-positions on a row, converging on the frame centre with depth;
    alternate rows step half a column, which is the reference's stagger"""
    p = pitch_x(base)
    n = int(np.ceil((XR - XL) / p)) + 2
    j = np.arange(-n // 2, n // 2 + 1)
    return XC + (j + (ri % 2) * ROW_STAGGER) * p


# opacity envelope: the mesh fades in at the crest and out into the foreground
def dot_alpha(y):
    # the far field is defocused, so the lattice resolves in gradually
    a = np.clip((y - Y_TOP + 10) / 26.0, 0, 1) ** 0.8
    b = np.clip((Y_FADE_END - 34 - y) / 120.0, 0, 1)
    return a * np.clip(b, 0, 1) ** 1.25


# ------------------------------------------- dot size, softness, strength
# Three knobs, all calibrated against the reference rather than chosen: the
# reference's lattice is a *defocused* point cloud, so its dots nearly touch
# and sit only a few levels off the water around them.  Drawn at full contrast
# with hard edges the same lattice reads as a halftone screen and swamps the
# wave formations it is supposed to sit on.
DOT_R_FRAC = 0.30               # dot radius, as a fraction of the column pitch
DOT_DASH = 0.10                 # and its elongation along the row
DOT_GAIN = 1.35                 # how far a dot sits from the water around it
DOT_MAX = 68.0                  # ceiling on that
SEAM = 0.8                      # wash-band overlap, px (see emit_washes)

# fraction of each lattice cell the dots actually cover:
#   dot area  = pi*(DOT_R_FRAC*p)^2
#   cell area = pitch_x * pitch_y = ROW_RATIO * p^2
DOT_COVER = min(1.0, (np.pi * DOT_R_FRAC ** 2 +
                      2.0 * DOT_R_FRAC * DOT_DASH) / ROW_RATIO)


def dot_push(y):
    """how far a dot sits from the ground tone at depth y, signed by polarity"""
    pol_ = polarity(y)
    return (np.clip(contrast(y) * DOT_GAIN, 3, DOT_MAX) *
            (1.0 if pol_ >= 0 else -1.0) * dot_alpha(y))


def hexc(rgb):
    return "#%02x%02x%02x" % tuple(int(round(np.clip(c, 0, 255))) for c in rgb)


# =============================================== 5. emit
parts = []
CH = 26                     # dots per colour chunk


def emit_mesh():
    out = []
    for ri, base in enumerate(bases):
        cx = columns_for(base, ri)
        cx = cx[(cx >= XL) & (cx <= XR)]
        if len(cx) < 4:
            continue
        cy = row_at(ri, cx)
        alpha = dot_alpha(base)
        if alpha <= 0.012:
            continue
        pol_ = polarity(base)
        amp = contrast(base)
        r = max(0.64, DOT_R_FRAC * pitch_x(base))
        # The reference's nodes are not round stamps: the lattice is
        # smeared along the row, so neighbouring dots nearly touch and the
        # rows read as broken contour lines rather than a polka-dot grid.
        dash = DOT_DASH * pitch_x(base)
        tone = tone_at(cx, cy)
        # push the ground tone toward the dot's own value
        push = np.clip(amp * DOT_GAIN, 3, DOT_MAX) * (1 if pol_ >= 0 else -1)
        _ = pol_
        col = np.clip(tone + push, 0, 255)
        for i in range(0, len(cx), CH):
            sx, sy = cx[i:i + CH], cy[i:i + CH]
            c = col[i:i + CH].mean(0)
            dd = "".join("M%s %sh%s" % (f2(a - dash / 2), f2(b), f2(dash))
                         for a, b in zip(sx, sy))
            out.append('<path d="%s" stroke="%s" stroke-width="%s" opacity="%s"/>'
                       % (dd, hexc(c), f2(r * 2), f3(alpha)))
    return out


def f2(v):
    s = ("%.2f" % v).rstrip("0").rstrip(".")
    return s if s not in ("-0", "") else "0"


def f1(v):
    s = ("%.1f" % v).rstrip("0").rstrip(".")
    return s if s not in ("-0", "") else "0"


def f3(v):
    s = ("%.3f" % v).rstrip("0").rstrip(".")
    return s if s not in ("-0", "") else "0"


def path_for_row(idx, step=26.0):
    """smooth cubic path along a stack contour, full bleed"""
    x = np.arange(XL, XR + step, step)
    return x, row_at(idx, x)


def cubic(x, y, fmt=None):
    """Catmull-Rom -> cubic bezier"""
    fmt = fmt or f2
    d = ["M%s %s" % (fmt(x[0]), fmt(y[0]))]
    n = len(x)
    for i in range(n - 1):
        x0, y0 = x[max(i - 1, 0)], y[max(i - 1, 0)]
        x1, y1 = x[i], y[i]
        x2, y2 = x[i + 1], y[i + 1]
        x3, y3 = x[min(i + 2, n - 1)], y[min(i + 2, n - 1)]
        c1x, c1y = x1 + (x2 - x0) / 6.0, y1 + (y2 - y0) / 6.0
        c2x, c2y = x2 - (x3 - x1) / 6.0, y2 - (y3 - y1) / 6.0
        d.append("C%s %s %s %s %s %s" % (fmt(c1x), fmt(c1y), fmt(c2x), fmt(c2y), fmt(x2), fmt(y2)))
    return "".join(d)


def emit_washes():
    """Smooth tonal bands between successive wave contours.

    Each band is one closed path bounded above and below by real contours of
    the surface, so the boundaries curve with the water instead of being
    marching-squares iso-lines of a noisy field — no shards, no stacked
    horizontal smears.  The band is filled with a horizontal gradient sampled
    from the reference along its own mid-contour, which is what carries the
    left-to-right tonal variation the wave formations are made of.
    """
    defs, out = [], []
    edges = list(np.arange(0.0, len(bases) - 1 + 1e-6, 0.5))
    for i, (a, b) in enumerate(zip(edges, edges[1:])):
        mid = (a + b) / 2.0
        midy = float(np.interp(mid, np.arange(len(bases)), bases))
        if midy > Y_FADE_END + 4:
            continue
        xa, ya = path_for_row(a)
        if i == 0:
            ya = SIL(xa)
        xb, yb = path_for_row(b)
        # bands are adjacent and opaque, so the reproduced tone is the
        # reference's own rather than a pile of translucent averages
        sx = np.arange(XL, XR + 1, 62.0)
        sy = row_at(mid, sx)
        # The mesh only ever paints the dot, never the gap, so laying it over a
        # ground set to the reference's mean pushes the result off by the dots'
        # own coverage.  Back that out of the ground: ground + cover*push then
        # averages to the reference's value.
        cols_ = tone_at(sx, sy) - DOT_COVER * dot_push(midy)
        stops = "".join(
            '<stop offset="%s" stop-color="%s"/>' %
            (f3((x - XL) / (XR - XL)), hexc(c)) for x, c in zip(sx, cols_))
        gid = "w%d" % i
        defs.append('<linearGradient id="%s" x1="%s" y1="0" x2="%s" y2="0" '
                    'gradientUnits="userSpaceOnUse">%s</linearGradient>'
                    % (gid, f2(XL), f2(XR), stops))
        # The sampled tone already dissolves to white on its own — this is
        # only the last few px of cleanup, not the dissolve itself.
        fade = np.clip((Y_FADE_END + 6 - midy) / 34.0, 0, 1)
        if fade < 0.01:
            continue
        # Adjacent bands share an edge, and two antialiased coverages either
        # side of one edge sum to less than 1 — the white page shows through as
        # a hairline, and 80 of those read as horizontal banding that the eye
        # picks out before it sees the waves.  Carry each band a hair past its
        # lower contour; the next band paints over the overlap.
        d = (cubic(xa, ya, f1) +
             cubic(xb[::-1], yb[::-1] + SEAM, f1).replace("M", "L", 1) + "Z")
        out.append('<path d="%s" fill="url(#%s)" opacity="%s"/>'
                   % (d, gid, f3(fade)))
    return defs, out


wash_defs, washes = emit_washes()
mesh = emit_mesh()
print("washes:", len(washes), " mesh chunks:", len(mesh))

hdr = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{VIEW[0]} {VIEW[1]} {VIEW[2]} {VIEW[3]}" width="{VIEW[2]}" height="{VIEW[3]}">
<!--
  waves.svg — vector reconstruction of the point-cloud ocean in
  project/reference/01-hero.png.  Generated by project/scripts/build-waves-svg.py;
  edit that script rather than this file.

  Coordinates are the hero illustration's own (x 0..1560, source y), so this
  drops straight onto the hero plate.  Geometry runs from x {XL:.0f} to x {XR:.0f} —
  past both edges of the viewBox — so the water leaves the frame instead of
  ending at it, and the surface is continuous through the span the hull
  occludes (x 509..1034) rather than stopping either side of the ship.

  The surface is one height field, not a stack of independent shapes:
    row contours   y(x) = base + k(base) * S(x, base)
  where S is the reference's own low-passed, depth-detrended tonal banding
  (+0.96 correlation with the measured crest silhouette) and k is the wave
  amplitude, fixed at the silhouette by least squares and carried through
  depth by the perspective factor.

    "washes"  — smooth tonal bands between successive contours; they carry the
                overlapping wave formations and the depth haze.  Colour is the
                reference's own local value.
    "mesh"    — the dot lattice, one dot per node, at the measured pitch
                (columns run {pitch_x(Y_TOP + 40):.1f}px near the horizon to {pitch_x(940):.1f}px in the
                foreground; rows at {ROW_RATIO:.2f} of that, with alternate rows
                staggered half a column — the reference's lattice is a
                quincunx weave, not a square grid).  Dots are short
                round-capped subpaths, so each is ~12 bytes and lands exactly
                on its node.  Colour, contrast and light/dark polarity are
                sampled per chunk from the reference.
    "fade"    — the foreground dissolve, a gradient rather than an edge.
-->
<defs>
<linearGradient id="wfade" x1="0" y1="{VIEW[1]}" x2="0" y2="{VIEW[1] + VIEW[3]}" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#fff" stop-opacity="1"/>
<stop offset="0.88" stop-color="#fff" stop-opacity="1"/>
<stop offset="0.96" stop-color="#fff" stop-opacity="0.55"/>
<stop offset="1" stop-color="#fff" stop-opacity="0"/>
</linearGradient>
<mask id="wmask" maskUnits="userSpaceOnUse" x="{XL}" y="{VIEW[1]}" width="{XR - XL}" height="{VIEW[3]}">
<rect x="{XL}" y="{VIEW[1]}" width="{XR - XL}" height="{VIEW[3]}" fill="url(#wfade)"/>
</mask>
{chr(10).join(wash_defs)}
</defs>
<g mask="url(#wmask)">
'''

body = ('<g id="washes">\n' + "\n".join(washes) + '\n</g>\n'
        '<g id="mesh" fill="none" stroke-linecap="round">\n' + "\n".join(mesh) + '\n</g>\n')

svg = hdr + body + "</g>\n</svg>\n"
with open(OUT, "w") as f:
    f.write(svg)
print("wrote %s  (%.0f KB)" % (OUT, len(svg) / 1024))
