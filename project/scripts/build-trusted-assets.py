"""Lift the trusted-by strip out of reference/05.

The band is a flat teal wash with a faint white wave mesh over it, and the
partner wordmarks are white at varying opacities. Both are recovered by
treating white coverage over the teal base as an alpha channel.
"""

from PIL import Image

SRC = 'reference/05-product3-trusted-results.png'
BAND = (0, 616, 1416, 715)
TEAL = (36, 148, 149)

# x0, y0, x1, y1 per wordmark, padded a couple of px past the measured ink.
LOGOS = {
    'crunchbase': (372, 650, 526, 681),
    'isolved': (622, 647, 756, 682),
    'workato': (856, 649, 1011, 681),
    'ramp': (1102, 644, 1235, 686),
}


def alpha_of(px, floor):
    """White coverage of a pixel over the teal base, 0..255."""
    a = max((px[i] - TEAL[i]) / (255 - TEAL[i]) for i in range(3))
    return 0 if a < floor else round(min(1.0, (a - floor) / (1 - floor)) * 255)


def main():
    band = Image.open(SRC).convert('RGB').crop(BAND)
    w, h = band.size
    src = band.load()

    # Wave mesh only. Anything opaque enough to be type rather than mesh is
    # cut out and refilled by interpolating across the gap; the gaps are
    # letter-stroke wide, so the seam is invisible at 6% contrast.
    mesh = Image.new('LA', (w, h))
    mp = mesh.load()
    MESH_CEILING = 0.10
    cov = [[max((src[x, y][i] - TEAL[i]) / (255 - TEAL[i]) for i in range(3))
            for x in range(w)] for y in range(h)]
    R = 4
    hot = [[any(cov[j][i] >= MESH_CEILING
                for j in range(max(0, y - R), min(h, y + R + 1))
                for i in range(max(0, x - R), min(w, x + R + 1)))
            for x in range(w)] for y in range(h)]
    for y in range(h):
        row = cov[y]
        keep = [None if hot[y][x] else row[x] for x in range(w)]
        x = 0
        while x < w:
            if keep[x] is not None:
                x += 1
                continue
            start = x
            while x < w and keep[x] is None:
                x += 1
            left = keep[start - 1] if start > 0 else 0.0
            right = keep[x] if x < w else 0.0
            for i, gx in enumerate(range(start, x)):
                t = (i + 1) / (x - start + 1)
                keep[gx] = left * (1 - t) + right * t
        for x in range(w):
            mp[x, y] = (255, round(min(1.0, keep[x]) * 255))
    mesh.save('public/images/trusted-mesh.png')

    for name, (x0, y0, x1, y1) in LOGOS.items():
        out = Image.new('LA', (x1 - x0, y1 - y0))
        op = out.load()
        for y in range(y1 - y0):
            for x in range(x1 - x0):
                op[x, y] = (255, alpha_of(src[x0 + x, y0 - BAND[1] + y], 0.13))
        out.save(f'public/images/partner-{name}.png')
        print(name, out.size)


main()
