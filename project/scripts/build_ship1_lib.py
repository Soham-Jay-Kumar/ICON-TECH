"""Geometry helpers for build-ship1-svg.py — tracing, simplification, quantisation."""
import numpy as np
from collections import deque


def runmean_x(A, k):
    """Running mean along x, edge-padded."""
    c = np.cumsum(np.pad(A, ((0, 0), (k, k)), mode="edge"), axis=1)
    return (c[:, 2 * k:] - c[:, :-2 * k]) / (2 * k)


def runmean_y(A, k):
    c = np.cumsum(np.pad(A, ((k, k), (0, 0)), mode="edge"), axis=0)
    return (c[2 * k:] - c[:-2 * k]) / (2 * k)


def components(mask, min_area=1):
    """
    4-connected components of a boolean mask -> list of (ys, xs).

    Run-length + union-find rather than a per-pixel flood fill: the naive BFS
    is a Python-level loop over every set pixel, and on a full-frame crest mask
    (hundreds of thousands of pixels across thousands of components) it does
    not finish in reasonable time. Encoding each row as runs collapses the work
    to the number of runs, which is smaller by two orders of magnitude here.
    """
    H, W = mask.shape
    parent = [0]
    def find(i):
        r = i
        while parent[r] != r:
            r = parent[r]
        while parent[i] != r:
            parent[i], i = r, parent[i]
        return r
    def union(i, j):
        ri, rj = find(i), find(j)
        if ri != rj:
            parent[max(ri, rj)] = min(ri, rj)

    runs = []          # (row, x0, x1, label)
    prev = []          # runs of the previous row
    for y in range(H):
        row = mask[y]
        if not row.any():
            prev = []
            continue
        d = np.diff(np.concatenate(([0], row.view(np.int8), [0])))
        starts = np.nonzero(d == 1)[0]
        ends = np.nonzero(d == -1)[0] - 1
        cur = []
        for x0, x1 in zip(starts, ends):
            parent.append(len(parent))
            lab = len(parent) - 1
            for py0, py1, plab in prev:
                if px_overlap(x0, x1, py0, py1):
                    union(lab, plab)
            cur.append((x0, x1, lab))
            runs.append((y, x0, x1, lab))
        prev = cur

    buckets = {}
    for y, x0, x1, lab in runs:
        r = find(lab)
        buckets.setdefault(r, []).append((y, x0, x1))

    out = []
    for r, rr in buckets.items():
        n = sum(x1 - x0 + 1 for _, x0, x1 in rr)
        if n < min_area:
            continue
        ys = np.empty(n, np.int32)
        xs = np.empty(n, np.int32)
        i = 0
        for y, x0, x1 in rr:
            w = x1 - x0 + 1
            ys[i:i + w] = y
            xs[i:i + w] = np.arange(x0, x1 + 1)
            i += w
        out.append((ys, xs))
    return out


def px_overlap(a0, a1, b0, b1):
    """4-connectivity: runs touch only if their x spans actually overlap."""
    return a0 <= b1 and b0 <= a1


def fill_holes(mask):
    """
    Fill enclosed holes: label the background and keep only the components
    that reach the border. Uses the run-length labeller above rather than a
    flood fill, for the same speed reason.
    """
    H, W = mask.shape
    bg = ~mask
    filled = mask.copy()
    for ys, xs in components(bg, min_area=1):
        if ys.min() == 0 or ys.max() == H - 1 or xs.min() == 0 or xs.max() == W - 1:
            continue                      # touches the frame: real background
        filled[ys, xs] = True
    return filled


# ---------------------------------------------------------------- tracing
# Moore-neighbour boundary following on a binary mask. Returns a closed
# pixel-corner polygon per region, which is exact: it walks the boundary
# between set and unset cells rather than through pixel centres, so the
# result is the region's true outline and not a shape inset by half a pixel.
_D8 = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]


def trace_outline(mask):
    """Outer boundary of the (single, hole-free enough) region in `mask`."""
    ys, xs = np.nonzero(mask)
    if len(ys) == 0:
        return []
    H, W = mask.shape
    # start at the topmost-leftmost set pixel
    y0 = ys.min()
    x0 = xs[ys == y0].min()
    start = (y0, x0)
    contour = [start]
    b = 7  # incoming direction index
    cur = start
    for _ in range(400000):
        found = False
        for k in range(8):
            d = (b + 1 + k) % 8
            dy, dx = _D8[d]
            ny, nx = cur[0] + dy, cur[1] + dx
            if 0 <= ny < H and 0 <= nx < W and mask[ny, nx]:
                b = (d + 4 + 1) % 8
                cur = (ny, nx)
                contour.append(cur)
                found = True
                break
        if not found:
            break
        if cur == start and len(contour) > 2:
            break
    return contour


def dp(points, eps):
    """Douglas-Peucker simplification of a list of (x, y)."""
    if len(points) < 3:
        return points
    pts = np.asarray(points, float)
    keep = np.zeros(len(pts), bool)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        p, q = pts[i], pts[j]
        seg = q - p
        n = np.hypot(*seg)
        if n < 1e-9:
            d = np.hypot(*(pts[i + 1:j] - p).T)
        else:
            # 2-D cross product written out: numpy 2 removed the 2-vector
            # form of np.cross.
            v = pts[i + 1:j] - p
            d = np.abs(seg[0] * v[:, 1] - seg[1] * v[:, 0]) / n
        m = int(np.argmax(d))
        if d[m] > eps:
            k = i + 1 + m
            keep[k] = True
            stack.append((i, k))
            stack.append((k, j))
    return [tuple(p) for p in pts[keep]]


def kmeans(px, k, iters=14, seed=7):
    """Tiny k-means over Nx3 float pixels."""
    rng = np.random.default_rng(seed)
    c = px[rng.choice(len(px), k, replace=False)].copy()
    for _ in range(iters):
        d = ((px[:, None, :] - c[None, :, :]) ** 2).sum(2)
        lab = d.argmin(1)
        for i in range(k):
            m = lab == i
            if m.any():
                c[i] = px[m].mean(0)
    d = ((px[:, None, :] - c[None, :, :]) ** 2).sum(2)
    return d.argmin(1), c
