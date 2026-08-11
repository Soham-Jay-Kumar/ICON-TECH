"""Inspect reference screenshots: sample colors, crop regions, find edges.

Usage:
  python3 scripts/measure.py px  <img> <x> <y> [<x> <y> ...]
  python3 scripts/measure.py crop <img> <x> <y> <w> <h> <out>
  python3 scripts/measure.py rows <img> [x0 x1]     # row-wise ink profile
  python3 scripts/measure.py cols <img> <y0> <y1>   # column-wise ink profile
  python3 scripts/measure.py size <img>
"""

import sys
from PIL import Image


def load(path):
    return Image.open(path).convert("RGB")


def hexof(t):
    return "#%02X%02X%02X" % t


def cmd_px(args):
    img = load(args[0])
    coords = [int(v) for v in args[1:]]
    for i in range(0, len(coords), 2):
        x, y = coords[i], coords[i + 1]
        print(f"({x},{y}) {hexof(img.getpixel((x, y)))}")


def cmd_crop(args):
    img = Image.open(args[0])
    x, y, w, h = (int(v) for v in args[1:5])
    img.crop((x, y, x + w, y + h)).save(args[5])
    print(f"saved {args[5]} {w}x{h}")


def _bg(img):
    return img.getpixel((2, 2))


def cmd_rows(args):
    """Report bands of rows that differ from the background."""
    img = load(args[0])
    w, h = img.size
    x0 = int(args[1]) if len(args) > 1 else 0
    x1 = int(args[2]) if len(args) > 2 else w
    bg = _bg(img)
    runs, start = [], None
    for y in range(h):
        ink = 0
        for x in range(x0, x1, 3):
            p = img.getpixel((x, y))
            if abs(p[0] - bg[0]) + abs(p[1] - bg[1]) + abs(p[2] - bg[2]) > 24:
                ink += 1
        if ink > 1 and start is None:
            start = y
        elif ink <= 1 and start is not None:
            runs.append((start, y - 1))
            start = None
    if start is not None:
        runs.append((start, h - 1))
    for a, b in runs:
        print(f"rows {a}-{b}  (h={b - a + 1})")


def cmd_cols(args):
    img = load(args[0])
    w, h = img.size
    y0, y1 = int(args[1]), int(args[2])
    bg = _bg(img)
    runs, start = [], None
    for x in range(w):
        ink = 0
        for y in range(y0, y1, 2):
            p = img.getpixel((x, y))
            if abs(p[0] - bg[0]) + abs(p[1] - bg[1]) + abs(p[2] - bg[2]) > 24:
                ink += 1
        if ink > 0 and start is None:
            start = x
        elif ink == 0 and start is not None:
            runs.append((start, x - 1))
            start = None
    if start is not None:
        runs.append((start, w - 1))
    for a, b in runs:
        print(f"cols {a}-{b}  (w={b - a + 1})")


def cmd_size(args):
    for p in args:
        print(p, Image.open(p).size)


if __name__ == "__main__":
    {"px": cmd_px, "crop": cmd_crop, "rows": cmd_rows,
     "cols": cmd_cols, "size": cmd_size}[sys.argv[1]](sys.argv[2:])
