#!/usr/bin/env python3
"""
build-ship1-svg.py — regenerate ../../ship1.svg from reference/09-ai-solutions.png.

The reference is the "Our AI Solutions" plate: an aerial photograph of a
container ship under way, with a vector overlay composited on top of it (three
glowing callout capsules, a field of data risers, the headline block and the
wordmark).

Those two halves are not equally recoverable, and this script does not pretend
otherwise:

  * The OVERLAY is synthetic, so it is reconstructed exactly.  Every capsule
    bound, corner radius, stroke, glow falloff, fill opacity, type size,
    baseline and colour below is a measurement off the reference, not a
    guess.  The capsules in particular measure as pure white at 0.60 alpha
    over the water (predicted vs actual error 1.6-4.1/255, against 45-51 for
    an opaque fill), so that is how they are emitted.

  * The PHOTOGRAPH has no geometry to recover — only pixels.  It is therefore
    reconstructed the way build-waves-svg.py reconstructs the hero ocean:
    by measuring the image's own structure and re-emitting it as vector.
    The sea becomes a sampled tonal field plus its traced crest lines; the
    vessel becomes its traced silhouette filled with colour regions recovered
    by k-means over the hull's own pixels.  No bitmap is embedded in the
    output.  This is a faithful reconstruction, not a pixel-exact copy, and
    a photograph cannot be made into one.

Every element is a separately addressable, id-bearing group so the overlay can
be animated later without touching the plate.

Needs Pillow + numpy.  Run from the repo root:
    python3 project/scripts/build-ship1-svg.py
"""
import os
import sys
import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_ship1_lib import (runmean_x, runmean_y, components, fill_holes,
                             trace_outline, dp, kmeans)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REF = os.path.join(ROOT, "project", "reference", "09-ai-solutions.png")
OUT = os.path.join(ROOT, "ship1.svg")

im = Image.open(REF).convert("RGB")
W, H = im.size
a = np.asarray(im).astype(np.float32)
R, G, B = a[..., 0], a[..., 1], a[..., 2]
L = a.mean(2)
CYAN = B - R

def hx(c):
    return "#%02X%02X%02X" % tuple(int(round(min(255, max(0, v)))) for v in c)

def f(v):
    return ("%.2f" % v).rstrip("0").rstrip(".")

parts = []
W_ = parts.append

# ================================================================ 1. the sea
# The water's tonal field, sampled on a grid with the vessel and the overlay
# masked out, then re-emitted as horizontal bands each carrying its own
# left-to-right gradient. This is the same idea as the "washes" in
# build-waves-svg.py: the large-scale colour structure is what the eye reads
# as depth and haze, and it is genuinely smooth, so it vectorises honestly.
bluish = (B - R) / (B + R + 1.0)
notwater = (bluish <= 0.20)
mi = Image.fromarray((notwater * 255).astype(np.uint8))
for _ in range(2):
    mi = mi.filter(ImageFilter.MaxFilter(15))
for _ in range(2):
    mi = mi.filter(ImageFilter.MinFilter(15))
ship_mask = fill_holes(np.asarray(mi) > 127)
comps = components(ship_mask, min_area=2000)
comps.sort(key=lambda c: -len(c[0]))
ship_only = np.zeros_like(ship_mask)
ship_only[comps[0][0], comps[0][1]] = True

# overlay pixels to exclude from the sea sampling
overlay = np.zeros_like(ship_mask)
overlay[30:115, 560:800] = True       # Systems
overlay[195:265, 805:965] = True      # Data
overlay[145:215, 1000:1235] = True    # Workflows
overlay[380:640, 40:830] = True       # headline block
overlay[10:90, 1225:1355] = True      # wordmark
overlay[740:760, 440:630] = True      # bottom capsule
sea_ok = ~(ship_only | overlay)

NB = 76                                 # horizontal bands
NS = 26                                 # gradient stops across each band
band_h = H / NB
grads = []
prev_stops = None
W_('<g id="sea">')
for i in range(NB):
    y0 = int(round(i * band_h)); y1 = int(round((i + 1) * band_h))
    # Cells the overlay covers have no water to sample. Interpolating across
    # them from their neighbours continues the sea's own left-to-right ramp;
    # substituting a row median instead (the obvious fallback) painted the
    # whole headline block a flat, brighter rectangle that was plainly visible
    # through the type.
    stops = np.full((NS, 3), np.nan)
    for j in range(NS):
        x0 = int(j * W / NS); x1 = int((j + 1) * W / NS)
        cell = a[y0:y1, x0:x1]
        ok = sea_ok[y0:y1, x0:x1]
        if ok.sum() > 24:
            stops[j] = np.median(cell[ok], 0)
    good = ~np.isnan(stops[:, 0])
    if good.sum() == 0:
        stops[:] = prev_stops if i else np.array([40., 80., 120.])
    else:
        idx = np.arange(NS)
        for ch in range(3):
            stops[:, ch] = np.interp(idx, idx[good], stops[good, ch])
    prev_stops = stops.copy()
    # smooth along x so band-to-band sampling noise does not become banding
    k = np.array([1., 2., 3., 2., 1.]); k /= k.sum()
    sm = np.stack([np.convolve(np.pad(stops[:, ch], 2, mode="edge"), k, "valid")
                   for ch in range(3)], 1)
    gid = "sg%d" % i
    body = "".join('<stop offset="%s" stop-color="%s"/>' %
                   (f(j / (NS - 1) * 100) + "%", hx(sm[j])) for j in range(NS))
    grads.append('<linearGradient id="%s" x1="0" y1="0" x2="1" y2="0">%s</linearGradient>' % (gid, body))
    W_('<rect x="0" y="%s" width="%d" height="%s" fill="url(#%s)"/>' %
       (f(y0), W, f(y1 - y0 + 0.6), gid))
W_('</g>')

# ---- crest lines: the sea's own wave structure, traced from a high-pass ----
# Same principle as the hero's contour rows — the crests are a real, traceable
# structure in the image, and they are what stops the tonal field above from
# reading as flat paint.
hp = L - runmean_y(runmean_x(L, 9), 5)
crest = (hp > 3.2) & sea_ok
W_('<g id="sea-crests" fill="none" stroke="#DCEEF7" stroke-linecap="round">')
segs = 0
for ys, xs in components(crest, min_area=26):
    if len(xs) > 12000:
        continue
    order = np.argsort(xs)
    xs, ys = xs[order], ys[order]
    pts = []
    for x in np.unique(xs):
        m = xs == x
        pts.append((float(x), float(ys[m].mean())))
    if len(pts) < 4:
        continue
    pts = dp(pts, 0.6)
    if len(pts) < 2:
        continue
    y_mid = np.mean([p[1] for p in pts])
    # crests fade with depth exactly as they do in the reference
    op = 0.03 + 0.11 * min(1.0, max(0.0, (y_mid - 60) / 620.0))
    d = "M" + " ".join("%s %s" % (f(px), f(py)) for px, py in pts)
    W_('<path d="%s" stroke-opacity="%s" stroke-width="%s"/>' %
       (d, f(op), f(0.7 + 0.5 * (y_mid / H))))
    segs += 1
W_('</g>')

# ============================================================== 2. the vessel
# Silhouette traced off the segmentation, then filled with colour regions
# recovered by k-means over the vessel's own pixels — the container blocks,
# the hull bands and the superstructure are all really there in the photo as
# areas of near-constant colour, so they come back as polygons.
ys, xs = np.nonzero(ship_only)
sy0, sy1, sx0, sx1 = ys.min(), ys.max(), xs.min(), xs.max()
sub = ship_only[sy0:sy1 + 1, sx0:sx1 + 1]
outline = trace_outline(sub)
poly = dp([(x + sx0, y + sy0) for y, x in outline], 1.1)

W_('<g id="vessel">')
base = np.median(a[ship_only], 0)
W_('<path id="vessel-silhouette" fill="%s" d="M%s Z"/>' %
   (hx(base), " ".join("%s %s" % (f(px), f(py)) for px, py in poly)))

px_all = a[ship_only]
K = 30
lab, cent = kmeans(px_all.astype(np.float64), K)
labels = np.full(ship_only.shape, -1, np.int16)
labels[ship_only] = lab
W_('<g id="vessel-regions">')
nreg = 0
# Collected then drawn largest-first: sorting by brightness (the first cut)
# put every pale region on top and buried the deck detail under it, and any
# area the regions do not cover falls back to the silhouette's flat median —
# which is what left the hull reading as one mauve mass.
regions = []
for ci in range(K):
    m = labels == ci
    if m.sum() < 22:
        continue
    for rys, rxs in components(m, min_area=22):
        regions.append((len(rys), rys, rxs))
regions.sort(key=lambda t: -t[0])
for _n, rys, rxs in regions:
    if True:
        rm = np.zeros(ship_only.shape, bool)
        rm[rys, rxs] = True
        y0, y1 = rys.min(), rys.max()
        x0, x1 = rxs.min(), rxs.max()
        cont = trace_outline(rm[y0:y1 + 1, x0:x1 + 1])
        if len(cont) < 8:
            continue
        p = dp([(x + x0, y + y0) for y, x in cont], 0.9)
        if len(p) < 3:
            continue
        col = np.median(a[rys, rxs], 0)
        W_('<path fill="%s" d="M%s Z"/>' %
           (hx(col), " ".join("%s %s" % (f(qx), f(qy)) for qx, qy in p)))
        nreg += 1
W_('</g>')
W_('</g>')

print("sea bands=%d  crest paths=%d  vessel regions=%d" % (NB, segs, nreg))

# ======================================================== 3. the data risers
# Thin cyan verticals rising off the deck toward the capsules. Detected as
# narrow ridges in a horizontally high-passed cyan channel, so their columns,
# extents and colours are the reference's own.
# G+B-2R, not B-R: the risers are cyan (green AND blue over red), and the
# two-channel measure separates them from the water's plain blueness far
# better than blue alone.
CYANV = G + B - 2 * R


def _shift_x(A, d):
    out = np.empty_like(A)
    if d > 0:
        out[:, d:] = A[:, :-d]; out[:, :d] = A[:, :1]
    elif d < 0:
        out[:, :d] = A[:, -d:]; out[:, d:] = A[:, -1:]
    else:
        out = A.copy()
    return out


# A true vertical RIDGE, not a high-pass: brighter than the columns 3px to
# BOTH sides. A plain high-pass is elevated across the whole band here — the
# hull and the wake ripples carry just as much cyan-over-red contrast as the
# risers do — so 641 of 720 columns cleared it and the run-merger returned one
# 501px-wide "riser". Requiring a local maximum in x is what actually isolates
# a thin vertical line from a broad bright area.
ridge = np.minimum(CYANV - _shift_x(CYANV, 3), CYANV - _shift_x(CYANV, -3))


def longest_run(flags):
    best = (0, 0, 0)
    i = 0
    while i < len(flags):
        if flags[i]:
            j = i
            while j < len(flags) and flags[j]:
                j += 1
            if j - i > best[0]:
                best = (j - i, i, j - 1)
            i = j
        else:
            i += 1
    return best


Y0, Y1, X0, X1 = 100, 470, 545, 1265
band = ridge[Y0:Y1, X0:X1]
score = (band > 16).sum(0)
risers = []
i = 0
while i < len(score):
    if score[i] >= 10:
        j = i
        while j < len(score) and score[j] >= 5:
            j += 1
        if j - i <= 10:                     # narrow: a riser, not the hull
            cx = X0 + i + int(np.argmax(score[i:j]))
            col = ridge[Y0:Y1, max(0, cx - 1):cx + 2].max(1)
            # longest CONTIGUOUS run, not min..max of everything above
            # threshold — the latter stretched two risers into full-height
            # lines straight down open water.
            # The risers are dashed in the reference, so a strictly
            # contiguous run of any length does not exist — closing gaps of
            # up to 7px first is what makes "how far does this riser reach"
            # answerable at all. Without it this found three risers, not forty.
            flags = col > 9
            closed = flags.copy()
            gap = 0
            for t in range(len(flags)):
                if flags[t]:
                    if 0 < gap <= 7:
                        closed[t - gap:t] = True
                    gap = 0
                else:
                    gap += 1
            n, r0, r1 = longest_run(closed)
            if n >= 20:
                st = float(np.clip(col[r0:r1 + 1].mean() / 46.0, 0.2, 0.72))
                risers.append((cx, Y0 + r0, Y0 + r1, st))
        i = j
    else:
        i += 1

W_('<g id="data-risers" fill="none" stroke="#7FE9F5" stroke-linecap="round">')
for cx, ry0, ry1, st in risers:
    W_('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke-width="1.1" stroke-opacity="%s"/>'
       % (cx, ry1, cx, ry0, f(st)))
    W_('<circle cx="%d" cy="%d" r="2" fill="#CFF8FC" stroke="none" fill-opacity="%s"/>'
       % (cx, ry0, f(min(0.9, st + 0.25))))
W_('</g>')
print("data risers=%d" % len(risers))

# ========================================================== 4. the capsules
# Measured: outer bound, capsule radius (= h/2), the cyan rim and its outward
# falloff, the fill (white at 0.60 over the water) and the label's cap height.
# Bounds are the RIM CENTRELINES: the median sub-pixel peak of the cyan ridge
# taken across every straight-section column (and row) of each capsule, not
# the outer edge of the glow. An SVG stroke is centred on its path, so
# measuring the outer edge drew every capsule about 4px too low and too large.
# Rim thickness is that ridge full-width-at-half-max: 4-5px.
# Label size is fitted from the reference text widths - all three come out at
# 27px, which independently predicts the Systems y-descender and the Data cap
# height correctly.
CAPSULES = [
    # id,           x0,     y0,      x1,     y1,  label,        text cx, baseline
    ("systems",   576.9,  49.0,  768.9,  96.2, "Systems",     673.0,  83.0),
    ("data",      824.4, 205.5,  938.3, 251.1, "Data",        881.0, 238.5),
    ("workflows",1009.3, 157.1, 1214.0, 202.8, "Workflows",  1111.5, 190.5),
]
W_('<g id="callouts">')
for cid, x0, y0, x1, y1, label, tcx, base in CAPSULES:
    w, h = x1 - x0, y1 - y0
    r = h / 2.0
    W_('<g id="callout-%s">' % cid)
    # Outer glow: the measured falloff peaks 4-6px outside the rim and is gone
    # by about 13px, which is what this blur and width reproduce.
    W_('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="none" '
       'stroke="#46F0F9" stroke-width="9" stroke-opacity="0.17" filter="url(#capsule-glow)"/>'
       % (f(x0), f(y0), f(w), f(h), f(r)))
    # Fill measured as pure white at 0.60 alpha over the water.
    W_('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="#FFFFFF" fill-opacity="0.60" '
       'stroke="#46F0F9" stroke-width="4" stroke-opacity="0.95"/>'
       % (f(x0), f(y0), f(w), f(h), f(r)))
    W_('<text x="%s" y="%s" text-anchor="middle" font-family="Poppins, sans-serif" '
       'font-size="27" font-weight="600" letter-spacing="0.2" fill="#16303F">%s</text>'
       % (f(tcx), f(base), label))
    W_('</g>')
W_('</g>')

# =========================================================== 5. the headline
# Body sizes fitted from the reference line widths (558 / 606 / 739 px) and
# x set so the glyph ink starts at the measured x=59, not the text origin.
# Left margin, per-line cap tops and baselines all measured; cap height 37px
# over Poppins' 0.70 cap ratio gives the 53px body, and the baselines sit on a
# measured 64px rhythm.
W_('<g id="headline" font-family="Poppins, sans-serif">')
W_('<text x="57" y="430" font-size="52.4" font-weight="500" fill="#FFFFFF">Our '
   '<tspan fill="#F08134">AI Solutions</tspan></text>')
W_('<text x="57" y="494" font-size="52.4" font-weight="500" fill="#FFFFFF">Consulting &amp; Custom</text>')
W_('<text x="57" y="558" font-size="52.4" font-weight="500" fill="#FFFFFF">Solutions Development</text>')
W_('<text x="57" y="618" font-size="28.7" font-weight="500" fill="#FFFFFF">'
   'Empowering Enterprises with Intelligent AI Solutions</text>')
W_('</g>')

# ======================================================= 6. bottom capsule
# Cropped by the frame: measured x 456..612, top edge y 749, running off the
# bottom. Brighter than the floating capsules (measured fill 230,235,244).
W_('<g id="bottom-capsule">')
W_('<rect x="456" y="749" width="157" height="42" rx="21" fill="#E6EBF4" fill-opacity="0.96"/>')
W_('</g>')

# ============================================================= 7. wordmark
W_('<g id="wordmark" opacity="0.80">')
W_('<text x="1340" y="50" text-anchor="end" font-family="Poppins, sans-serif" '
   'font-size="25" font-weight="600" letter-spacing="0.5" fill="#FFFFFF">IC<tspan fill="#F08134">O</tspan>N</text>')
W_('<text x="1340" y="64" text-anchor="end" font-family="Poppins, sans-serif" '
   'font-size="7" font-weight="500" letter-spacing="3" fill="#FFFFFF" fill-opacity="0.85">TECHNOLOGY</text>')
W_('</g>')

# ================================================================== assemble
defs = ('<defs>'
        '<filter id="capsule-glow" x="-60%" y="-160%" width="220%" height="420%">'
        '<feGaussianBlur stdDeviation="6"/></filter>'
        + "".join(grads) +
        '</defs>')

head = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">\n'
    '<!--\n'
    '  ship1.svg — vector reconstruction of project/reference/09-ai-solutions.png.\n'
    '  Generated by project/scripts/build-ship1-svg.py; edit that script, not this file.\n'
    '\n'
    '  Coordinates are the reference\'s own pixels (0..%d x 0..%d), so anything measured\n'
    '  off the screenshot drops straight in.\n'
    '\n'
    '  The overlay is synthetic and is reconstructed exactly: capsule bounds, radii,\n'
    '  rim, glow falloff, the measured 0.60 white fill, type sizes and baselines are\n'
    '  all measurements, not estimates.\n'
    '\n'
    '  The photograph underneath has no geometry to recover, so — as in\n'
    '  build-waves-svg.py — its structure is measured and re-emitted as vector: the\n'
    '  sea as a sampled tonal field plus its traced crest lines, the vessel as a\n'
    '  traced silhouette filled with colour regions recovered by k-means over its own\n'
    '  pixels. No bitmap is embedded. It is a faithful reconstruction, not a\n'
    '  pixel-exact copy of a photo.\n'
    '\n'
    '  Groups are addressable for animation:\n'
    '    #sea  #sea-crests  #vessel (#vessel-silhouette, #vessel-regions)\n'
    '    #data-risers  #callouts (#callout-systems, -data, -workflows)\n'
    '    #headline  #bottom-capsule  #wordmark\n'
    '-->\n' % (W, H, W, H, W, H))

svg = head + defs + "\n" + "\n".join(parts) + "\n</svg>\n"
with open(OUT, "w") as fh:
    fh.write(svg)
print("wrote %s  (%.0f KB)" % (OUT, len(svg) / 1024))
