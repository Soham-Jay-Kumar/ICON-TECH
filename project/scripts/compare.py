"""Stack a reference screenshot above the matching implementation capture.

References were shot at several window widths (1560, 1418, 1414), so the
implementation capture is rescaled to the reference width before stacking.
That makes proportions comparable even though absolute pixels are not.

Usage: python3 scripts/compare.py <reference.png> <shot.png> <out.png> [refY0 refY1]
"""

import sys
from PIL import Image, ImageDraw

GAP = 24
LABEL = 22


def main():
    ref = Image.open(sys.argv[1]).convert("RGB")
    shot = Image.open(sys.argv[2]).convert("RGB")
    out = sys.argv[3]

    if len(sys.argv) > 5:
        y0, y1 = int(sys.argv[4]), int(sys.argv[5])
        ref = ref.crop((0, y0, ref.width, y1))

    scale = ref.width / shot.width
    shot = shot.resize(
        (ref.width, max(1, round(shot.height * scale))), Image.LANCZOS
    )

    w = ref.width
    h = LABEL + ref.height + GAP + LABEL + shot.height
    canvas = Image.new("RGB", (w, h), (235, 235, 235))
    d = ImageDraw.Draw(canvas)

    d.text((8, 6), "REFERENCE", fill=(0, 0, 0))
    canvas.paste(ref, (0, LABEL))
    y = LABEL + ref.height + GAP
    d.text((8, y - LABEL + 6), "IMPLEMENTATION", fill=(0, 0, 0))
    canvas.paste(shot, (0, y + LABEL - LABEL))

    canvas.save(out)
    print(f"{out}  ref {ref.width}x{ref.height}  shot {shot.width}x{shot.height}")


if __name__ == "__main__":
    main()
