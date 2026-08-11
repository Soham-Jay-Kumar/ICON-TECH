"""Compare the rendered CTA section against the reference screenshot.

The render is 2880px wide (1440 css @2x); the reference is 2048px wide
(1024 css @2x) with its content centred at x=1053.5 due to a scrollbar in
the original capture. We downscale the render to 2048 wide and shift the
reference by the centring offset before diffing.
"""
from PIL import Image, ImageChops
import sys

REF_CENTER_OFFSET = 29  # reference content centre (1053.5) minus 1024

render = Image.open("/tmp/cta-render.png").convert("RGB")
ref = Image.open("public/images/cta-fleet-map.png").convert("RGB")

scale = 2048 / render.width
render = render.resize((2048, round(render.height * scale)), Image.LANCZOS)

h = min(render.height, ref.height)
# Align horizontal centres: crop reference shifted right by offset.
ref_a = ref.crop((REF_CENTER_OFFSET, 0, 2048, h))
ren_a = render.crop((0, 0, 2048 - REF_CENTER_OFFSET, h))

diff = ImageChops.difference(ref_a, ren_a)
gray = diff.convert("L")

# Metrics per horizontal band
import math
px = gray.load()
W, H = gray.size
band = 64
print(f"aligned size {W}x{H}")
total = 0
count = 0
for y0 in range(0, H, band):
    s = 0
    mx = 0
    n = 0
    for y in range(y0, min(y0 + band, H), 2):
        for x in range(0, W, 2):
            v = px[x, y]
            s += v
            mx = max(mx, v)
            n += 1
    total += s
    count += n
    print(f"band y={y0:4d}-{min(y0+band,H):4d}: mean={s/n:6.2f} max={mx}")
print(f"OVERALL mean={total/count:.2f}")

# Save visualisation: amplified diff + side-by-side
amp = gray.point(lambda v: min(255, v * 4))
amp.save("/tmp/cta-diff.png")
sbs = Image.new("RGB", (W, H * 2 + 8), (255, 0, 255))
sbs.paste(ref_a, (0, 0))
sbs.paste(ren_a, (0, H + 8))
sbs.save("/tmp/cta-sbs.png")
