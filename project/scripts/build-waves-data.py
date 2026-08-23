#!/usr/bin/env python3
"""
build-waves-data.py — read ../waves.svg and re-emit it as a field the browser
can animate.

waves.svg is the artwork; nothing here changes it.  This only reads the numbers
already in that file and repacks them, because the file is 1.1 MB of path text
and the hero has to redraw the whole surface every frame.

What comes out is exactly what went in:

  contours    the 123 wave contours the wash bands are bounded by, as the
              y value at each of the file's own 71 sample columns (x = -120 to
              1700, step 26).  Band i is the strip between contour i and
              contour i+1; that is how the file already draws it.
  gradients   each band's horizontal tone ramp, the file's own 30 stops.
  rows        the 58 dot rows: the lattice x origin and pitch, the dot y at
              every node, and the per-chunk colour/width/opacity chunking the
              file uses.
  speed       a per-contour perspective factor, read off the measured lattice
              pitch — the same factor the illustration uses to scale the wave
              amplitude with depth.  It is the only number here that is not
              literally in the file, and it carries no geometry: it only tells
              the animation how much faster the near water travels than the
              far water.

Everything is little-endian.  y values are stored as int16 tenths of a px, so
the surface is reproduced to 0.05px — well under a device pixel at any width.

Run from project/:  python3 scripts/build-waves-data.py
"""
import os
import re
import struct
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "waves.svg")
OUT = os.path.join(ROOT, "project", "public", "hero-waves.bin")

MAGIC = b"WAVE"
VERSION = 1

# The reference frame the illustration was measured in.  The folds of the
# periodic surface the animation advects through must sit OUTSIDE the visible
# frame (viewBox x 0..1560), or travelling wave shapes reflect off the screen
# edges — compressing against them and bouncing back instead of flowing out.
# So the window is the full measured grid, which is exactly the artwork's own
# bleed: build-waves-svg.py carries the surface 120px past each frame edge,
# and folding about those outer columns keeps every reflection off-screen.
MIRROR_LO = -120.0
MIRROR_HI = 1700.0


def nums(s):
    return [float(v) for v in re.findall(r"-?[\d.]+", s)]


def attr(s, name):
    return float(re.search(r'\b%s="(-?[\d.]+)"' % name, s).group(1))


def main():
    svg = open(SRC).read()
    view = nums(re.search(r'viewBox="([^"]+)"', svg).group(1))

    # ---------------------------------------------------------------- washes
    body = svg.split('<g id="washes">', 1)[1].split("</g>", 1)[0]
    bands = re.findall(
        r'<path d="([^"]*)" fill="url\(#(w\d+)\)" opacity="([^"]*)"/>', body)

    def contours(d):
        """the two bounding contours of a wash band, as (x, y) sample lists"""
        top, bot, cur = [], [], None
        for cmd, arg in re.findall(r"([MCLZ])([^MCLZ]*)", d):
            n = nums(arg)
            if cmd == "M":
                cur = top
                cur.append((n[0], n[1]))
            elif cmd == "C":
                cur.append((n[4], n[5]))       # on-curve endpoint
            elif cmd == "L":
                cur = bot
                cur.append((n[0], n[1]))
        return np.array(top), np.array(bot)

    tops = []
    for d, _, _ in bands:
        t, _ = contours(d)
        tops.append(t)
    _, last = contours(bands[-1][0])
    seam_pair = (contours(bands[0][0])[1][::-1], tops[1])
    seam = float(np.median(seam_pair[0][:, 1] - seam_pair[1][:, 1]))

    grid_x = tops[0][:, 0]
    for t in tops:
        assert np.allclose(t[:, 0], grid_x), "wash contours are off the shared grid"
    cy = [t[:, 1] for t in tops] + [last[::-1, 1] - seam]
    CY = np.array(cy)
    nx = len(grid_x)

    # gradients — the file's own stops, uniform in x
    grads, opac = [], []
    for _, gid, op in bands:
        g = re.search(r'<linearGradient id="%s"([^>]*)>(.*?)</linearGradient>'
                      % gid, svg, re.S)
        gx = (attr(g.group(1), "x1"), attr(g.group(1), "x2"))
        stops = re.findall(r'<stop offset="([^"]*)" stop-color="#([0-9a-f]{6})"/>',
                           g.group(2))
        offs = np.array([float(o) for o, _ in stops])
        xs = gx[0] + offs * (gx[1] - gx[0])
        grads.append((xs, [tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))
                           for _, c in stops]))
        opac.append(float(op))
    # The stop offsets in the file are rounded to 3 decimals, so recover the
    # sampling step by fitting rather than differencing — the ramp is uniform by
    # construction and a per-pair difference would carry the rounding into it.
    idx = np.arange(nstops := len(grads[0][1]))
    gdx, gx0 = np.polyfit(idx, grads[0][0], 1)
    gdx, gx0 = float(gdx), float(gx0)
    g0 = re.search(r'<linearGradient id="w0"([^>]*)>', svg).group(1)
    gspan = attr(g0, "x2") - attr(g0, "x1")
    for xs, st in grads:
        assert len(st) == nstops and abs(xs[0] - grads[0][0][0]) < 1e-6

    # ------------------------------------------------------------------ mesh
    body = svg.split('<g id="mesh"', 1)[1].split("</g>", 1)[0]
    chunks = re.findall(
        r'<path d="([^"]*)" stroke="#([0-9a-f]{6})" stroke-width="([^"]*)" '
        r'opacity="([^"]*)"/>', body)

    rows, cur, prev = [], [], None
    for d, col, w, op in chunks:
        dots = re.findall(r"M(-?[\d.]+) (-?[\d.]+)h([\d.]+)", d)
        x0 = float(dots[0][0])
        if prev is not None and x0 < prev:
            rows.append(cur)
            cur = []
        cur.append((dots, col, float(w), float(op)))
        prev = float(dots[-1][0])
    rows.append(cur)

    row_meta, row_y, chunk_cols, chunk_len = [], [], [], []
    for r in rows:
        xs = np.array([float(p[0]) for c in r for p in c[0]])
        ys = np.array([float(p[1]) for c in r for p in c[0]])
        dash = float(r[0][0][0][2])
        pitch = float(np.mean(np.diff(xs)))
        assert np.std(np.diff(xs)) < 0.05, "lattice row is not uniform"
        row_meta.append((float(xs[0]), pitch, len(xs), dash,
                         r[0][2], r[0][3], len(r), float(ys.mean())))
        row_y.append(ys)
        for dots, col, w, op in r:
            chunk_cols.append(tuple(int(col[i:i + 2], 16) for i in (0, 2, 4)))
            chunk_len.append(len(dots))

    # --------------------------------------------------- perspective / speed
    # The lattice pitch is the illustration's own measure of depth: it runs
    # from ~4px at the horizon to ~10px in the foreground.  Water at a given
    # world speed crosses that many more pixels per second when it is nearer,
    # so this ratio is exactly how much faster the near surface has to travel.
    ry = np.array([m[7] for m in row_meta])
    rp = np.array([m[1] for m in row_meta])
    ref = float(np.interp(CY[0].mean(), ry, rp))

    def speed(y):
        return np.interp(y, ry, rp, left=rp[0], right=rp[-1]) / ref

    c_speed = speed(CY.mean(axis=1))
    r_speed = speed(ry)

    # ----------------------------------------------------------------- write
    ndots = sum(len(y) for y in row_y)
    buf = bytearray()
    buf += MAGIC
    buf += struct.pack("<HHHHHHII", VERSION, nx, len(CY), len(bands), len(rows),
                       nstops, len(chunk_cols), ndots)
    buf += struct.pack("<12f", grid_x[0], float(np.median(np.diff(grid_x))),
                       gx0, gdx, gspan, seam, MIRROR_LO, MIRROR_HI,
                       view[0], view[1], view[2], view[3])
    buf += np.round(CY * 10).astype("<i2").tobytes()
    buf += c_speed.astype("<f4").tobytes()
    buf += np.round(np.array(opac) * 255).astype(np.uint8).tobytes()
    buf += np.array([c for _, st in grads for c in st], np.uint8).tobytes()
    for (x0, pitch, count, dash, w, op, nch, _), sp in zip(row_meta, r_speed):
        buf += struct.pack("<ffHfffHf", x0, pitch, count, dash, w, op, nch, sp)
    buf += np.round(np.concatenate(row_y) * 10).astype("<i2").tobytes()
    buf += np.array(chunk_cols, np.uint8).tobytes()
    buf += np.array(chunk_len, "<u2").tobytes()

    with open(OUT, "wb") as f:
        f.write(buf)
    print("contours %d x %d  bands %d  rows %d  dots %d  chunks %d  seam %.2f"
          % (len(CY), nx, len(bands), len(rows), ndots, len(chunk_cols), seam))
    print("speed x%.2f (far) .. x%.2f (near)" % (c_speed.min(), c_speed.max()))
    print("wrote %s (%.0f KB)" % (OUT, len(buf) / 1024))


if __name__ == "__main__":
    main()
