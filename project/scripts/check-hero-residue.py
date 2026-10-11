#!/usr/bin/env python3
"""Guard the hero assets against a full-size ship ghost after CSS scaling.

This check is intentionally browser-free: it verifies the generated mask and
the dimensions of the companion water/ship assets directly.

Usage from project/:  python3 scripts/check-hero-residue.py
"""

import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "public" / "images"

PLATE_SIZE = (1560, 630)
WATER_BAND_TOP = 298
SHIP_CLEAN_X = (384, 1250)  # Reference columns 384..1249, inclusive.

# The old raw crop contained the ship's red/dark lower hull throughout this
# crop-relative area. The canonical ship-free waves render contains virtually
# none of either signature, so generous ceilings catch a reverted raw crop
# without coupling this check to exact JPEG bytes or browser versions.
WATER_OLD_HULL_ROI = (505, 0, 1080, 302)
MAX_WARM_HULL_PIXELS = 250
MAX_DARK_HULL_PIXELS = 1000

SHIP_RECT = (533, 2, 1040, 593)
SHIP_SIZE = (SHIP_RECT[2] - SHIP_RECT[0], SHIP_RECT[3] - SHIP_RECT[1])
SHIP_ALPHA_BBOX = (6, 6, 501, 585)


def empty_alpha(alpha, box):
    """Return whether a mask crop is transparent and its nonzero-pixel count."""
    crop = alpha.crop(box)
    nonzero = sum(crop.histogram()[1:])
    return nonzero == 0, nonzero


def main():
    results = []

    def check(name, passed, detail):
        results.append(passed)
        print(f"{'PASS' if passed else 'FAIL'} {name}: {detail}")

    with Image.open(IMAGES / "hero-land-mask.png") as mask:
        mask.load()
        check(
            "land mask format",
            mask.mode == "RGBA" and mask.size == PLATE_SIZE,
            f"mode={mask.mode}, size={mask.size}; expected RGBA {PLATE_SIZE}",
        )
        if "A" in mask.getbands() and mask.size == PLATE_SIZE:
            alpha = mask.getchannel("A")
            clean_box = (SHIP_CLEAN_X[0], 0, SHIP_CLEAN_X[1], WATER_BAND_TOP)
            clean, count = empty_alpha(alpha, clean_box)
            check(
                "full-size ship footprint removed",
                clean,
                f"{count} nontransparent pixels in x=384..1249, y=0..297",
            )
            water, count = empty_alpha(
                alpha, (0, WATER_BAND_TOP, PLATE_SIZE[0], PLATE_SIZE[1])
            )
            check(
                "water band remains transparent",
                water,
                f"{count} nontransparent pixels at y>={WATER_BAND_TOP}",
            )
        else:
            check("full-size ship footprint removed", False, "mask has no RGBA alpha")
            check("water band remains transparent", False, "mask has no RGBA alpha")

    with Image.open(IMAGES / "hero-water-still.jpg") as water:
        water.load()
        check(
            "water still format and dimensions",
            water.mode == "RGB" and water.size == (1560, 332),
            f"mode={water.mode}, size={water.size}; expected RGB (1560, 332)",
        )
        roi = water.crop(WATER_OLD_HULL_ROI).convert("RGB")
        warm = 0
        dark = 0
        pixels = roi.tobytes()
        for red, green, blue in zip(pixels[0::3], pixels[1::3], pixels[2::3]):
            warm += red > green + 15 and red > blue + 15 and red < 230
            dark += red < 80 and green < 90 and blue < 100
        check(
            "water fallback contains no old hull",
            warm <= MAX_WARM_HULL_PIXELS and dark <= MAX_DARK_HULL_PIXELS,
            f"warm={warm} (max {MAX_WARM_HULL_PIXELS}), "
            f"dark={dark} (max {MAX_DARK_HULL_PIXELS})",
        )

    with Image.open(IMAGES / "hero-ship.png") as ship:
        ship.load()
        check(
            "ship format and dimensions",
            ship.mode == "RGBA" and ship.size == SHIP_SIZE,
            f"mode={ship.mode}, size={ship.size}; expected RGBA {SHIP_SIZE}",
        )
        bbox = ship.getchannel("A").getbbox() if "A" in ship.getbands() else None
        check(
            "ship alpha geometry",
            bbox == SHIP_ALPHA_BBOX,
            f"alpha bbox={bbox}; expected {SHIP_ALPHA_BBOX} for plate rect {SHIP_RECT}",
        )

    ok = all(results)
    print("hero residue assets:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
