#!/usr/bin/env python3
"""
build-hero-masks.py — split the hero plate into its static and moving layers.

The hero starts as one illustration (public/images/hero-ocean.png), but its
content has to behave three different ways. This script cuts the static plate
and moving ship from it; the water layers come from the canonical waves.svg.

  hero-land-mask.png   alpha = 1 above the waterline except across the original
                       full-size ship footprint; 0 across the whole water band.
                       Applied to the base <img>, it leaves only the clean sky
                       and horizon behind the independently scaled ship.

  hero-ship.png        the ship and both leaders, as an RGBA cutout with the
                       white page unmultiplied out of it.  Drawn over the water
                       with normal blending and bobbed by <HeroWaves>'s pose.

  (the water)          mostly not written here — the canvas redraws waves.svg's
                       own geometry across the whole band, with nothing masked
                       out of it.

  hero-water-still.jpg is generated separately from the ship-free waves.svg by
                       scripts/build-hero-water-still.js. It sits under the
                       canvas until the first animated frame paints, and remains
                       available when the wave field or JavaScript is absent.

The layers intentionally no longer sum to the original flattened illustration:
the foreground ship is scaled independently, so every trace of its old full-size
footprint must be absent from both the static plate and the water fallback.

Why the ship is cut out rather than held in place by a mask: it has to move, and
a hole in a mask cannot.  Cutting it out also removed the halo the old two-mask
split had — that version grew the hull by 5px so its contact shading survived,
which left a ring where the plate showed the *printed* ocean and the canvas
painted nothing: a soft pale fringe hugging the hull.  There is no such ring
now; the water runs continuously behind the ship, and the lattice reaches the
hull the way it does in reference-waves.mp4.

Needs Pillow + numpy. Run the complete workflow from project/ with:
  npm run assets:hero
"""
import numpy as np
from PIL import Image, ImageFilter

SRC = "public/images/hero-ocean.png"
LAND = "public/images/hero-land-mask.png"
SHIP = "public/images/hero-ship.png"

# The plate is the reference cropped at y=392 (see build-hero-asset.py), and
# waves.svg is authored in reference coordinates, so its viewBox — y 690..1050
# — is this band of the plate.  The water canvas covers exactly that band.
CROP_Y = 392
BAND_TOP = 690 - CROP_Y          # 298

# The moving ship uses a tight matte so it does not carry the page or a pale
# halo with it. That matte deliberately ignores near-white/cyan pixels, so the
# static plate needs a separate, broader cut: otherwise those original-size
# pixels become visible as soon as the foreground ship is scaled down. The sky
# throughout this box is the page's solid white, making a deterministic alpha
# cut both cleaner and safer than lowering the sprite's ink threshold.
STATIC_SHIP_CLEANUP_BOX = (384, 0, 1250, BAND_TOP)

# Where the ship can be.  Deliberately generous; the silhouette is measured
# inside it, not assumed to fill it.
SHIP_BOX = (505, 262, 1080, 600)  # x0, y0, x1, y1 in plate px

# The two callout leaders.  They are annotation, not ocean, and they are drawn
# onto the hull at their inner ends — so they ride with the ship rather than
# staying pinned to the plate while it moves.  (Their far ends are arrowheads
# pointing at <Callout> text that already drifts on scroll, so a few px of
# travel there is invisible.)
LEADER_BOXES = (
    (432, 309, 592, 330),         # left: crosses open water into the bow
    (1080, 215, 1240, 235),       # right: over sky, into the hull
)
LEADER_MAX_L = 140

# The two callout markers, in plate px: centre x, centre y, radius.
#
# They are pale discs — a white core inside a dusty-rose ring — drawn over the
# hull in the source artwork, and that is exactly what the sky matte below
# cannot see. That matte reads alpha as distance from white
# (`alpha = 1 - min(RGB)/255`), which is the right model for a hull against the
# white page and the wrong one for a deliberately pale mark ON the hull: the
# white core came out at alpha 0 and the ring at 0.45-0.58, so the finished
# cutout let the moving water show straight through the marker. Measured by
# radial profile off hero-ocean.png, both discs run to r~21 before they reach
# hull red, and the artwork itself is fully opaque there.
#
# So the discs are forced to alpha 1 after the matte is assembled. The
# unmultiply that follows turns alpha 1 back into the source colour exactly, so
# this restores the reference's own marker rather than inventing one.
CALLOUT_MARKERS = ((979, 274, 21), (629, 364, 21))

# Ink floor for the tight matte above the waterline.  hero-ocean.png has a very
# faint copy of the "AI DRIVEN / SHIPPING" watermark baked into it at ~0.07 ink;
# that belongs to the plate, so the ship's matte starts above it.
INK_FLOOR = 0.12
# How far the ship's own region is grown before the soft matte is read inside
# it, so rigging and railings keep their antialiasing.
REGION_GROW = 9

# Softness on the hull's cut edge, in px, on top of the coverage antialiasing
# below.  Just enough to take the measurement's own jitter off the outline —
# the old 1.2 with a 5px grow is what read as a halo.
FEATHER = 0.4

# Dark/warm pixels a row needs before it counts as hull.  Low, so the outline
# follows the bulb down to its tip.
MIN_ROW = 8

# Vertical sub-samples per row when rasterising the silhouette.
SUB_Y = 4

# Alpha below which the ship layer is treated as absent, both for the plate's
# cut and for the sprite's bounding box.
MATTE_EPS = 0.004

# Padding around the measured content, in px, for the sprite's own box.
PAD = 6


def save_rgba(rgb, a, path):
    h, w = a.shape
    out = np.zeros((h, w, 4), np.uint8)
    out[..., :3] = np.round(np.clip(rgb, 0, 255)).astype(np.uint8)
    out[..., 3] = np.round(np.clip(a, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(out, "RGBA").save(path, optimize=True)


def save_alpha(a, path):
    """CSS mask-image reads the alpha channel, so the mask has to live there —
    a plain grayscale PNG is opaque everywhere and masks nothing."""
    save_rgba(np.full(a.shape + (3,), 255.0), a, path)


def blur(a, r):
    return np.array(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
                    .filter(ImageFilter.GaussianBlur(r))).astype(float) / 255.0


def grow(mask, k):
    return np.array(Image.fromarray((mask * 255).astype(np.uint8))
                    .filter(ImageFilter.MaxFilter(k))) > 127


def main():
    im = Image.open(SRC).convert("RGB")
    A = np.array(im).astype(float)
    H, W, _ = A.shape
    R, B = A[..., 0], A[..., 2]
    L = np.array(im.convert("L")).astype(float)

    # ---- ship silhouette, below the waterline ----------------------------
    # The water is a desaturated teal (B >= R) that never goes truly black in
    # the hull's depth range; the ship is either warm (the red topsides and the
    # bulb) or near-black (the boot-topping).  Everything between those two on
    # a given row is hull, so the silhouette is the row's filled extent.
    x0, y0, x1, y1 = SHIP_BOX
    seed = np.zeros((H, W), bool)
    sl = (slice(y0, y1), slice(x0, x1))
    seed[sl] = (R[sl] > B[sl] + 18) | (L[sl] < 78)

    # Open the seed before measuring it: the water carries warm iridescent
    # specks a few px across, and a bare row extent would rope one of those
    # into the hull and blow the silhouette hundreds of px sideways.  An
    # erode/dilate pair removes them and leaves the hull untouched.
    seed = np.array(Image.fromarray((seed * 255).astype(np.uint8))
                    .filter(ImageFilter.MinFilter(5))
                    .filter(ImageFilter.MaxFilter(5))) > 127

    lo = np.full(H, np.nan)
    hi = np.full(H, np.nan)
    for y in range(y0, y1):
        xs = np.nonzero(seed[y])[0]
        # Low enough to follow the hull all the way down to the bulb's tip,
        # where it is only a few px across; the opening above is what keeps a
        # stray speck of water from qualifying.
        if len(xs) >= MIN_ROW:
            lo[y], hi[y] = xs.min(), xs.max()

    rows = np.nonzero(~np.isnan(lo))[0]

    # Median-filter the two edges so one ragged row cannot notch the outline.
    # Short window: a long one drags the widening rows above the bulb down over
    # the taper and squares off the bottom of the hull.
    def med(a, k=5):
        p = np.pad(a, k // 2, mode="edge")
        return np.array([np.median(p[i:i + k]) for i in range(len(a))])

    lo_s, hi_s = med(lo[rows]), med(hi[rows])

    # Rasterise the silhouette with real coverage rather than rounded extents.
    # Rounding put a 1px staircase down both flanks and along the bottom of the
    # hull — obvious against water this crisp, and not something a blur can fix
    # without bringing the halo back. Each pixel gets the fraction of itself the
    # hull actually covers: exact horizontally, SUB_Y sub-rows vertically for
    # the near-horizontal bottom edge.
    cols = np.arange(W, dtype=float)
    hull = np.zeros((H, W), float)
    n = len(rows)
    for i, y in enumerate(rows):
        acc = np.zeros(W)
        for k in range(SUB_Y):
            u = (k + 0.5) / SUB_Y - 0.5     # -0.5 .. +0.5 within the row
            j = min(n - 1, max(0, i + (1 if u > 0 else -1)))
            # neighbour only counts if it really is the adjacent scanline
            f = abs(u) if abs(int(rows[j]) - int(y)) == 1 else 0.0
            a = lo_s[i] + (lo_s[j] - lo_s[i]) * f
            b = hi_s[i] + (hi_s[j] - hi_s[i]) * f
            acc += np.clip(np.minimum(cols + 1, b + 1) - np.maximum(cols, a), 0, 1)
        hull[y] = acc / SUB_Y
    bot = rows[-1]

    # ---- the leaders -----------------------------------------------------
    ink = np.zeros((H, W), float)
    for lx0, ly0, lx1, ly1 in LEADER_BOXES:
        sub = L[ly0:ly1, lx0:lx1]
        ink[ly0:ly1, lx0:lx1] = np.maximum(
            ink[ly0:ly1, lx0:lx1], (sub < LEADER_MAX_L).astype(float))
    # 1px grow, so each line keeps its own antialiasing
    ink = np.array(Image.fromarray((ink * 255).astype(np.uint8)).filter(
        ImageFilter.MaxFilter(3))).astype(float) / 255.0

    # ---- the ship's matte above the waterline ----------------------------
    # Up there the background is the white page, so the true matte is simply how
    # far a pixel is from white: alpha = 1 - min(RGB)/255.  Restricted to the
    # region the ship's own strong ink occupies, so the faint baked watermark
    # stays with the plate.
    ink_amt = (255.0 - A.min(axis=2)) / 255.0
    region = grow(ink_amt > INK_FLOOR, REGION_GROW)
    region[BAND_TOP:] = False
    region[:, :SHIP_BOX[0] - 80] = False      # nothing out here but watermark
    region[:, SHIP_BOX[2] + 80:] = False
    sky = ink_amt * region

    # ---- assemble the ship layer ----------------------------------------
    ship = np.zeros((H, W), float)
    ship[:BAND_TOP] = sky[:BAND_TOP]
    ship[BAND_TOP:] = hull[BAND_TOP:]
    ship = np.maximum(ship, ink)              # the leaders, either side of the line
    # Antialias the hull's cut, and only the hull's: the sky matte is already
    # continuous and blurring it would soften the rigging.
    cut = np.zeros((H, W), float)
    cut[BAND_TOP:] = ship[BAND_TOP:]
    cut = blur(cut, FEATHER)
    ship[BAND_TOP:] = cut[BAND_TOP:]

    # The callout markers are pale by design, and the mattes above measure ink,
    # so they read as holes. Stamp them solid before the unmultiply — see
    # CALLOUT_MARKERS.
    yy, xx = np.ogrid[:H, :W]
    for mx, my, mr in CALLOUT_MARKERS:
        ship[(xx - mx) ** 2 + (yy - my) ** 2 <= mr * mr] = 1.0

    # Unmultiply the white page out of the colours, so the cutout composites
    # normally over moving water instead of darkening it.  Over white this is
    # identical to the multiply blend the plate uses; over water it gives the
    # hull its own colour back.
    a = np.clip(ship, 0, 1)[..., None]
    rgb = np.where(a > 1e-3, 255.0 - (255.0 - A) / np.maximum(a, 1e-3), 255.0)

    ys, xs = np.nonzero(ship > MATTE_EPS)
    bx0 = max(0, xs.min() - PAD)
    bx1 = min(W, xs.max() + 1 + PAD)
    by0 = max(0, ys.min() - PAD)
    by1 = min(H, ys.max() + 1 + PAD)
    save_rgba(rgb[by0:by1, bx0:bx1], ship[by0:by1, bx0:bx1], SHIP)

    # ---- assemble the plate ---------------------------------------------
    # Everything the ship layer took, the plate gives up; the original ship's
    # complete sky-side footprint goes too, including pale pixels that were too
    # close to white to belong in the moving sprite. The whole water band also
    # goes, because the canvas paints all of it.
    #
    # The cut is BINARY, not `1 - ship`.  The plate is a multiply layer, and a
    # multiply at partial alpha does not subtract cleanly from a normal-blended
    # one on top: partitioning a soft matte between the two reconstructs the
    # artwork to only ~2 levels, and up to 38 wrong on the red topsides.  Handing
    # the ship layer the whole matte and cutting the plate to nothing under it is
    # exact instead, and costs nothing visually, because a plate pixel with any
    # ship ink over it is the white page — and white is multiply's identity, so
    # removing it changes nothing at all.
    land = 1.0 - (ship > MATTE_EPS).astype(float)
    cx0, cy0, cx1, cy1 = STATIC_SHIP_CLEANUP_BOX
    land[cy0:cy1, cx0:cx1] = 0.0
    land[BAND_TOP:, :] = 0.0

    # Generation-time invariants for the regions whose transparency keeps an
    # unscaled ship from resurfacing in either sky or water.
    assert not np.any(land[cy0:cy1, cx0:cx1])
    assert not np.any(land[BAND_TOP:, :])
    save_alpha(land, LAND)

    print("%s %dx%d" % (LAND, W, H))
    print("%s %dx%d at plate (%d, %d)-(%d, %d)   <- SHIP_RECT" %
          (SHIP, bx1 - bx0, by1 - by0, bx0, by0, bx1, by1))
    print("hull rows %d..%d, waterline (boot-topping foot) %d" %
          (rows[0], rows[-1], bot))


if __name__ == "__main__":
    main()
