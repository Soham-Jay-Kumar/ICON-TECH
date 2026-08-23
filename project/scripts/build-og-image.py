"""Builds public/images/og-default.png — the link-preview card.

Same one-off asset-tooling role as the other scripts here (needs Pillow, which
is not a project dependency): run it when the source art changes, commit the
result. Composed purely from existing raster assets so it needs no font files
and therefore renders identically wherever it is run.

Output is exactly 1200x630, the size Open Graph and Twitter's
summary_large_image both expect.
"""

from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "public", "images")

OG_W, OG_H = 1200, 630

ocean = Image.open(os.path.join(IMAGES, "hero-ocean.png")).convert("RGBA")
logo = Image.open(os.path.join(IMAGES, "icon-technology-logo.png")).convert("RGBA")

# The illustration is 1560x630 (2.48:1); the card is 1.90:1. Crop horizontally
# rather than scaling, so the ship keeps its drawn size. The hull sits at
# x 545-1019, comfortably inside a centred 1200px window.
left = (ocean.width - OG_W) // 2
card = Image.new("RGBA", (OG_W, OG_H), (255, 255, 255, 255))
card.alpha_composite(ocean.crop((left, 0, left + OG_W, OG_H)), (0, 0))

# Logo top-left, sized to ~62px tall to echo the navbar's reference height.
logo_h = 62
logo_w = round(logo.width * (logo_h / logo.height))
card.alpha_composite(logo.resize((logo_w, logo_h), Image.LANCZOS), (56, 44))

out = os.path.join(IMAGES, "og-default.png")
card.convert("RGB").save(out, "PNG", optimize=True)
print(f"wrote {out} ({OG_W}x{OG_H})")
