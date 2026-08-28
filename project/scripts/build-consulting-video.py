#!/usr/bin/env python3
"""Paint the baked-in headline out of the What We Do consulting clip.

The teal card (components/what-we-do/reveal-consulting.tsx) sets its own
headline over this footage as real DOM text in the site's font. The clip as
delivered carries a *second* copy of that headline burned into its pixels, and
at `lg` widths -- where the card is single-column at ~2.7:1 and the crop shows
essentially the whole frame -- the baked copy read as a blurry duplicate behind
the real one. No crop can hide it: the card's own aspect ratio swings from 1.13
to 2.76 across the breakpoints, and the text spans x 420-1674, straight through
the middle of every framing that also keeps the ship. So it comes out of the
asset instead.

Everything else the clip has burned in stays: the "Systems"/"Data"/"Workflows"
pills are the footage's subject matter, the ICON logo is the company's own, and
the MINIMAX/Hailuo AI watermark (y 1110-1175) is already below the component's
y<1050 crop window and never reaches the screen.

WHY THIS IS THE EASY CASE FOR INPAINTING. The headline sits on open water with
nothing behind it -- no drop shadow, no backing panel, no ripple detail to
reconstruct. Column-mean luminance either side of the text block is flat
(45.2 / 45.4 / 46.2 / 46.1 / 46.3 at x 410, 400, 350, 250, 150 across the
text's own rows), and inside the four line boxes the histogram splits cleanly:
p80 = 64 (water), p90 = 242 (glyph). A brightness threshold at 120 lands in
that gap with room on both sides, and Telea then has to fill ~10px strokes out
of a smooth vertical gradient.

TWO THINGS THAT DID *NOT* WORK, so they don't get tried again:

  - Masking on temporal variance ("the text is static, the water is not").
    Compression flattens smooth water too, so 21% of the region reads as static
    and the mask came back as mottled stroke interiors rather than glyphs.
  - One bounding box for the whole block. The ship's bow intrudes past x 1450
    in the upper rows while the subtitle runs out to x 1674, so a single box
    either clips the subtitle or eats hull. Hence four per-line boxes.

The mask is derived from the temporal *median* frame -- moving ripple sparkle
averages away, so a bright crest passing through a box on one frame cannot
punch a hole in the mask -- and then applied unchanged to every frame, which is
what keeps the repaint from shimmering.

Input is ../ship1video.mp4 at the repo root, the pristine delivery (byte
-identical to what public/ shipped before this script existed). It is read-only
here; rerunning always starts from the original, never from a previous output.

    python3 scripts/build-consulting-video.py

Needs opencv-python, numpy and imageio-ffmpeg (a static ffmpeg binary --
Homebrew is not required). None are project dependencies; this is a one-off
asset tool like the other scripts/build-*.py.
"""

import os
import subprocess
import sys

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(HERE)
REPO = os.path.dirname(PROJECT)

SRC = os.path.join(REPO, "ship1video.mp4")
OUT_MP4 = os.path.join(PROJECT, "public", "what-we-do-consulting.mp4")
OUT_POSTER = os.path.join(PROJECT, "public", "what-we-do-consulting-poster.jpg")
OUT_MASK = os.path.join(HERE, "out", "consulting-text-mask.png")

# The window the headline lives in, with margin. Everything below is measured
# in source-frame pixels (the clip is 2944x1248).
RX0, RX1, RY0, RY1 = 350, 1760, 600, 1090

# One box per line of the baked headline, right edges set by where each line
# actually ends so the ship never falls inside one.
BOXES = [
    (400, 1140, 640, 730),   # "Our AI Solutions"
    (400, 1390, 730, 840),   # "Consulting & Custom"
    (400, 1470, 840, 950),   # "Solutions Development"
    (400, 1700, 960, 1050),  # "Empowering Enterprises with Intelligent AI Solutions"
]

THRESH = 120       # glyph vs water on the median frame; the gap is 64 -> 242
DILATE = 13        # ellipse diameter: pulls antialiased edges inside the hole
INPAINT_RADIUS = 8

# The poster is the frame the component shows before the first decode lands.
# Frame 2 is what the existing poster was cut from (mean abs diff 2.455, the
# closest of the first twelve), so keeping it means the crop math in the
# component still frames the poster exactly as it frames the video.
POSTER_FRAME = 2
POSTER_QUALITY = 85

# Regions that must survive untouched -- asserted against the output.
KEEP = {
    "pills": (1200, 2500, 40, 430),
    "icon-logo": (2350, 2700, 30, 130),
    "watermark": (2100, 2944, 1090, 1200),
}


def read_frames(path):
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        sys.exit(f"cannot open {path}")
    frames = []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        frames.append(frame)
    cap.release()
    if not frames:
        sys.exit(f"no frames decoded from {path}")
    return frames


def build_mask(frames):
    """The static glyph mask, in full-frame coordinates."""
    region = np.stack([f[RY0:RY1, RX0:RX1] for f in frames])
    median = np.median(region, 0).astype(np.uint8)
    gray = cv2.cvtColor(median, cv2.COLOR_BGR2GRAY)

    boxed = np.zeros(gray.shape, np.uint8)
    for x0, x1, y0, y1 in BOXES:
        boxed[y0 - RY0:y1 - RY0, x0 - RX0:x1 - RX0] = 1

    mask = ((gray > THRESH).astype(np.uint8)) * boxed
    mask = cv2.morphologyEx(
        mask, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    )
    mask = cv2.dilate(
        mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (DILATE, DILATE))
    )

    full = np.zeros(frames[0].shape[:2], np.uint8)
    full[RY0:RY1, RX0:RX1] = mask
    return full


def repaint(frame, mask):
    """Inpaint only the region the mask lives in, then drop it back in place.

    cv2.inpaint leaves unmasked pixels byte-identical, and the mask is strictly
    interior to the region, so this is the same result as inpainting the whole
    frame at a fifth of the cost.
    """
    out = frame.copy()
    out[RY0:RY1, RX0:RX1] = cv2.inpaint(
        frame[RY0:RY1, RX0:RX1],
        mask[RY0:RY1, RX0:RX1],
        INPAINT_RADIUS,
        cv2.INPAINT_TELEA,
    )
    return out


def encode(frames, ffmpeg, fps, size):
    w, h = size
    cmd = [
        ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
        # the repainted frames
        "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{w}x{h}", "-r", str(fps), "-i", "-",
        # the original, for its audio track only
        "-i", SRC,
        "-map", "0:v:0", "-map", "1:a:0?",
        # accurate_rnd + full_chroma_int halve the levels drift the BGR ->
        # yuv420p conversion otherwise introduces: without them the whole frame
        # comes back ~2/255 darker than the source, with them ~1/255. The output
        # stays untagged like the source, so browsers keep decoding it exactly
        # as they decoded the original -- tagging it full-range ("-color_range
        # pc") measures better here but changes what the decoder is told, which
        # is a far bigger risk than 1/255.
        "-sws_flags", "lanczos+accurate_rnd+full_chroma_int",
        "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-pix_fmt", "yuv420p",
        "-c:a", "copy",
        "-movflags", "+faststart",
        OUT_MP4,
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for frame in frames:
        proc.stdin.write(np.ascontiguousarray(frame).tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        sys.exit("ffmpeg failed")


def verify(src_frames, mask):
    """Check the output: headline gone, everything else where it was."""
    out_frames = read_frames(OUT_MP4)
    ok = True

    def check(label, condition, detail):
        nonlocal ok
        print(f"{'PASS' if condition else 'FAIL'}  {label}: {detail}")
        ok = ok and condition

    check(
        "frame count",
        len(out_frames) == len(src_frames),
        f"{len(out_frames)} (source {len(src_frames)})",
    )
    check(
        "dimensions",
        out_frames[0].shape == src_frames[0].shape,
        f"{out_frames[0].shape[1]}x{out_frames[0].shape[0]}",
    )

    # No glyph survives: nothing in the four boxes crosses the threshold that
    # separated text from water in the first place.
    region = np.stack([f[RY0:RY1, RX0:RX1] for f in out_frames])
    gray = cv2.cvtColor(np.median(region, 0).astype(np.uint8), cv2.COLOR_BGR2GRAY)
    worst = 0
    for x0, x1, y0, y1 in BOXES:
        worst = max(worst, int(gray[y0 - RY0:y1 - RY0, x0 - RX0:x1 - RX0].max()))
    check("headline removed", worst < THRESH, f"brightest pixel left in the boxes is {worst} (threshold {THRESH})")

    # The kept overlays are still where they read today.
    for label, (x0, x1, y0, y1) in KEEP.items():
        bright = (cv2.cvtColor(out_frames[0], cv2.COLOR_BGR2GRAY)[y0:y1, x0:x1] > 200)
        ys, xs = np.nonzero(bright)
        found = len(xs) > 0
        detail = (
            f"bbox x {x0 + xs.min()}-{x0 + xs.max()}, y {y0 + ys.min()}-{y0 + ys.max()}"
            if found else "nothing found"
        )
        check(f"kept: {label}", found, detail)

    # Outside the mask, the only difference should be recompression noise.
    untouched = mask == 0
    diffs = [
        float(np.abs(a.astype(np.int16) - b.astype(np.int16))[untouched].mean())
        for a, b in zip(src_frames[::20], out_frames[::20])
    ]
    worst_diff = max(diffs)
    check("no global shift", worst_diff < 3.0, f"worst mean abs diff outside the mask is {worst_diff:.2f}")

    return ok


def main():
    try:
        import imageio_ffmpeg
    except ImportError:
        sys.exit("need imageio-ffmpeg: python3 -m pip install --user imageio-ffmpeg")
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

    cap = cv2.VideoCapture(SRC)
    fps = cap.get(cv2.CAP_PROP_FPS)
    cap.release()

    print(f"reading {SRC}")
    frames = read_frames(SRC)
    h, w = frames[0].shape[:2]
    print(f"  {len(frames)} frames, {w}x{h}, {fps:g}fps")

    mask = build_mask(frames)
    os.makedirs(os.path.dirname(OUT_MASK), exist_ok=True)
    cv2.imwrite(OUT_MASK, mask * 255)
    print(f"  mask: {int(mask.sum())}px -> {OUT_MASK}  (look at it)")

    print("repainting")
    cleaned = [repaint(f, mask) for f in frames]

    print(f"encoding {OUT_MP4}")
    encode(cleaned, ffmpeg, fps, (w, h))
    print(f"  {os.path.getsize(OUT_MP4) / 1e6:.2f}MB")

    cv2.imwrite(OUT_POSTER, cleaned[POSTER_FRAME], [cv2.IMWRITE_JPEG_QUALITY, POSTER_QUALITY])
    print(f"poster: frame {POSTER_FRAME} -> {OUT_POSTER}  ({os.path.getsize(OUT_POSTER) / 1e6:.2f}MB)")

    print("verifying")
    sys.exit(0 if verify(frames, mask) else 1)


if __name__ == "__main__":
    main()
