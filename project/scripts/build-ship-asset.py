"""Extract the top-down ship watermark behind the Who We Are copy.

The paragraph is drawn over the ship in the reference, so the dark text pixels
are removed and inpainted from the nearest clean pixel in the same column. The
ship is a soft, near-vertical shape, so column-wise repair is invisible at the
opacity this watermark is used at.
"""

from PIL import Image

SRC = "reference/02-who-we-are.png"
DST = "public/images/who-we-are-ship.png"

BOX = (695, 440, 821, 1026)  # ship bbox with a little margin
TEXT_MAX_SUM = 660  # anything darker than this is copy, not ship


def main():
    im = Image.open(SRC).convert("RGB").crop(BOX)
    px = im.load()
    w, h = im.size

    dirty = [[sum(px[x, y]) < TEXT_MAX_SUM for y in range(h)] for x in range(w)]

    repaired = 0
    for x in range(w):
        col = dirty[x]
        for y in range(h):
            if not col[y]:
                continue
            up = next((yy for yy in range(y - 1, -1, -1) if not col[yy]), None)
            dn = next((yy for yy in range(y + 1, h) if not col[yy]), None)
            if up is None and dn is None:
                px[x, y] = (255, 255, 255)
            elif up is None:
                px[x, y] = px[x, dn]
            elif dn is None:
                px[x, y] = px[x, up]
            else:
                a, b = px[x, up], px[x, dn]
                t = (y - up) / (dn - up)
                px[x, y] = tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
            repaired += 1

    im.save(DST)
    print(f"{DST} {w}x{h}, repaired {repaired} text px")


if __name__ == "__main__":
    main()
