// ---------------------------------------------------------------------------
// Where the water lives in the hero illustration, and how the plate is split
// into the three things it actually contains.
//
// The hero is one illustration (public/images/hero-ocean.png) carrying content
// that has to behave three different ways, so it is served as three layers,
// all cut from that one file by scripts/build-hero-masks.py:
//
//   1. the plate      — sky and horizon. Still, and the page's LCP element.
//                       Masked by LAND_MASK_URL, which removes both the printed
//                       ocean and the ship.
//   2. the water      — waves.svg's own contours, washes and dot lattice,
//                       redrawn every frame by <HeroWaves> and flowing outward
//                       from the bow. Nothing is masked out of it: the sea runs
//                       continuously across the band and behind the hull. Under
//                       it, WATER_STILL_URL holds the printed ocean until the
//                       canvas has something to show.
//   3. the ship       — SHIP_URL, a cutout of the hull, the superstructure and
//                       both callout leaders, drawn over the water with normal
//                       blending and bobbing on it.
//
// The three sum to the illustration at every pixel, so freeze the animation and
// the hero is the artwork, with the water where waves.svg draws it.
//
// Why the ship is its own layer at all: it has to move, and it cannot move
// while it is a hole in a mask — bob it and the hole stays behind. Cutting it
// out also removes the halo the old split had. That version grew the hull's
// silhouette by 5px so its contact shading survived, which left a ring where
// the plate showed the *printed* ocean and the canvas painted nothing: a soft
// pale fringe hugging the hull. With the water drawn continuously behind the
// ship there is no such ring, and the lattice runs right up to the hull the way
// it does in reference-waves.mp4.
//
// All the geometry below is in the illustration's reference space (1560x630,
// the system hero-metrics.ts uses) and is applied as percentages, so it scales
// fluidly with the plate.
// ---------------------------------------------------------------------------

const REF_W = 1560;
const REF_H = 630;

/**
 * The plate is the reference screenshot cropped at y=392 (build-hero-asset.py);
 * waves.svg is authored in the reference's own coordinates, so its viewBox —
 * y 690..1050, the full 1560 width — lands on this band of the plate. The band
 * runs 28px past the bottom of the plate, which is where the source artwork has
 * already dissolved to white; the section clips it.
 */
export const WATER_VIEW = { x: 0, y: 690, w: 1560, h: 360 };
const CROP_Y = 392;

export const WATER_BAND = {
  /** Top of the water band as a percentage of the plate height. */
  top: `${(((WATER_VIEW.y - CROP_Y) / REF_H) * 100).toFixed(3)}%`,
  /** Its height, likewise. Overflows the plate; the hero section clips it. */
  height: `${((WATER_VIEW.h / REF_H) * 100).toFixed(3)}%`,
};

/**
 * Alpha = 1 above the waterline except under the ship layer; 0 across the whole
 * water band. Masks the base <img>, removing both the printed ocean and the
 * hull. The cut under the ship is binary on purpose — see build-hero-masks.py.
 */
export const LAND_MASK_URL = '/images/hero-land-mask.png';

/** The repacked geometry of waves.svg (scripts/build-waves-data.py). */
export const WATER_FIELD_URL = '/hero-waves.bin';

/**
 * The printed ocean, cropped to the band. It sits under the canvas and is
 * hidden the instant the canvas paints, so it shows only when the canvas has
 * not: before the field has downloaded, if it never does, and with JavaScript
 * off. Without it those all leave the ship on a blank white sea.
 */
export const WATER_STILL_URL = '/images/hero-water-still.jpg';

/**
 * The hull and superstructure, cut out of the plate with a real alpha channel
 * (scripts/build-hero-masks.py) so it composites normally over moving water
 * instead of multiplying with it.
 */
export const SHIP_URL = '/images/hero-ship.png';

/**
 * The cutout's footprint in plate pixels — x0, y0, x1, y1 — measured and printed
 * by build-hero-masks.py and repeated here so the layer can be positioned
 * without loading the image first. Re-run that script and this must follow it;
 * scripts/check-sea-ship.js asserts the two still agree, because a stale value
 * scales the hull against the water it is meant to be sitting in.
 */
export const SHIP_RECT = { x0: 432, y0: 2, x1: 1210, y1: 593 };

/**
 * The ship layer's box as CSS percentages of the plate.
 */
export const SHIP_BOX = {
  left: `${((SHIP_RECT.x0 / REF_W) * 100).toFixed(4)}%`,
  top: `${((SHIP_RECT.y0 / REF_H) * 100).toFixed(4)}%`,
  width: `${(((SHIP_RECT.x1 - SHIP_RECT.x0) / REF_W) * 100).toFixed(4)}%`,
  height: `${(((SHIP_RECT.y1 - SHIP_RECT.y0) / REF_H) * 100).toFixed(4)}%`,
};

/**
 * The hull rotates about its own waterline rather than the middle of the
 * cutout, so a roll pivots the ship where it meets the sea instead of swinging
 * the bulbous bow through it. Plate y 585 is where the silhouette gives out —
 * the foot of the boot-topping, measured by build-hero-masks.py — and the bow
 * centreline is BOW_X = 771 in reference px.
 *
 * Exported in plate reference px as well as the percentage form below, because
 * the two callout labels have to rotate about this same point to stay welded
 * to their leader lines — and those leaders are drawn *inside* the ship raster,
 * so they inherit the hull's transform whether anything else agrees with it or
 * not. Anything that needs to move with the ship reads this rather than
 * repeating the numbers.
 */
export const SHIP_PIVOT_REF = { x: 771, y: 585 };

export const SHIP_PIVOT = `${(((SHIP_PIVOT_REF.x - SHIP_RECT.x0) / (SHIP_RECT.x1 - SHIP_RECT.x0)) * 100).toFixed(2)}% ${(((SHIP_PIVOT_REF.y - SHIP_RECT.y0) / (SHIP_RECT.y1 - SHIP_RECT.y0)) * 100).toFixed(2)}%`;

/**
 * The renderer reports the hull's rise in *reference* px. The plate is REF_H
 * tall, so this converts one to a percentage of the ship layer's own height,
 * which is what a CSS translate resolves against.
 */
export const SHIP_DY_PCT_PER_REF_PX = 100 / (SHIP_RECT.y1 - SHIP_RECT.y0);

export { REF_W, REF_H };
