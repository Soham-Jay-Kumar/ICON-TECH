// ---------------------------------------------------------------------------
// hero-water-flow — the ocean in waves.svg, made to flow.
//
// waves.svg is not a picture of water, it is a *height field*: 123 wave
// contours, the tonal wash between each pair of them, and a dot lattice whose
// nodes sit on those same contours (see project/scripts/build-waves-svg.py).
// That is what makes it animatable without redesigning anything — a height
// field can be advected, and every mark in the file follows from it.
//
// So nothing here draws a new wave. The renderer reads the file's own numbers
// (repacked by scripts/build-waves-data.py) and redraws the file's own marks —
// same contours, same Catmull-Rom smoothing, same wash gradients, same dot
// pitch, colour, width and opacity — with one thing changed: where each
// contour is sampled.
//
//     y(x, t) = P(x - c(x)·t) + B(r - v·t),   r = outward(x)
//
// P is waves.svg's own profile, carried outward. B is everything travelling
// through it. Both run on `r`, the distance out from the bow, so the whole
// surface propagates away from the ship and nothing on it ever turns round.
//
// What keeps that from reading as a picture being dragged sideways:
//
//   * c scales with depth, by the illustration's own perspective factor (the
//     measured lattice pitch), applied at full strength. Near water crosses
//     ~2.5x the pixels per second that far water does — which is also what the
//     reference measures — so the surface shears continuously and can never
//     translate as one rigid sheet.
//   * P is split into three spectral bands travelling at different speeds —
//     dispersion. The long swell, the mid formations and the fine texture
//     slide past each other, so the contours stretch, compress and re-form as
//     they go instead of holding one frozen shape.
//   * the lattice sways horizontally in quadrature with the surface, the way
//     water particles orbit rather than translate, which is what bunches and
//     spreads the dots as a crest passes.
//
// Five things give that surface the movement of actual seawater:
//
//   * deep-water dispersion ordering. In a real sea phase speed grows with
//     wavelength (c ∝ √λ): the long swell leads while the short chop lingers
//     and flickers on top of it. Both the band speeds and the modulations
//     below follow that ordering — long fastest, fine slowest.
//   * deformation, not transportation. Formations don't hold their shape or
//     amplitude: an envelope breathes the mid and fine relief between calm and
//     full down a ~620px wavelength running outward at ~238px/s, so crests
//     build on the hull's flanks and die towards the frame edges — far more of
//     the visible change is morphing than crossing, as in a measured sea. The
//     envelope is a function of r alone, and BOTH bounding contours of every
//     wash band read the same multiplier at the same column — bands can swell
//     and subside, but adjacent contours can never cross.
//   * orbital motion. Deep-water particles don't translate with the wave,
//     they orbit: the surface surges forward beneath a crest and pulls back
//     in a trough — horizontal displacement proportional to elevation. Each
//     lattice node carries that surge (measured against its own rest height,
//     so it fades in from the artwork), on top of the slope-based bunching.
//     With the crests running outward this is what visibly pushes the dots
//     away from the hull.
//   * a swell the hull can ride. One long ~1180px wave leaving the bow, each
//     depth arriving a touch later down the perspective, on the 5.167s period
//     measured off reference-waves.mp4 — the clip is 124 frames at 24fps and
//     holds exactly one bob of its ship. The finite wavelength and depth lag
//     are load-bearing: a pure global bob is the one motion real water never
//     makes.
//   * micro-life. Between breathes the surface never freezes: a faint,
//     short-lived tremor keeps the fine texture alive the way sunlight chop
//     does, deliberately damped below what would buzz against the crisp dot
//     lattice.
//
// The hull is not drawn here — it is a DOM layer — but it is seated here: the
// renderer reads its own advected contour at the two waterline corners each
// frame and publishes `pose`, so the ship rides the water actually on screen
// rather than running a lookalike animation of its own.
//
// Direction: everything radiates OUTWARD from the bow. `outward(x)` — a
// softened |x - BOW_X| — is the argument of every travelling term, so crests
// build on the hull's flanks and leave towards both frame edges, and the
// advection is signed by which side of the bow a column is on.
//
// That signing is the one place the surface could tear, and it is worth being
// precise about why it does not. Water left of the bow must sample the profile
// at x + c·t and water right of it at x - c·t; both are shear-free (d/dx = 1,
// so nothing ever compresses or folds however long the page is left open), but
// at the bow itself the two coordinates differ by 2·c·t. Tapering the direction
// smoothly instead — one velocity field with a stagnation point — trades that
// step for a shear of 1 - c·t·σ'(x), which folds through zero after a couple of
// minutes and smears the surface into vertical streaks. So the two shear-free
// coordinates are kept, and their *heights* are blended across BLEND_W px of
// the bow: inside that window the water is the mean of two counter-travelling
// copies, which reads as the calm the bow actually makes ahead of itself. The
// window is behind the hull for all but the last few foreground rows, where the
// fade to white has already begun.
//
// Loop: P is periodic because waves.svg's own field is. build-waves-svg.py
// mirrors the wave field about columns 120px OUTSIDE the frame (x=-120 and
// x=1700) to carry the surface past the frame edges; those outer columns are
// the folds of the periodic profile, so reflections happen off-screen and a
// wave shape inside the frame always travels through it and out. (Folding at
// the visible edges instead pins the surface there — crests pile up against
// the frame line and bounce back, which reads as water sloshing against an
// invisible wall.) Nothing ever jumps, resets or reverses — there is no loop
// point to see, and at t=0 the render is waves.svg itself.
// ---------------------------------------------------------------------------

/** Resampling resolution of the periodic profile, ~3px per sample. */
const N = 512;

/**
 * Band split. Long swell above ~SIGMA_LONG px, fine texture below SIGMA_MID.
 *
 * These are the artwork's own scales and they are not a speed knob. Widening
 * SIGMA_MID to 45 to keep the fastest band away from the frame rate looked like
 * a free win and was not: it moves relief out of the mid band into the fine
 * one, and since those two bands travel at different speeds, the surface came
 * apart into thin horizontal strings of lattice with the body gone out of it.
 * The three bands only read as one sea while they stay close enough in scale
 * and speed to hold the artwork's shape between them.
 */
const SIGMA_LONG = 95;
const SIGMA_MID = 26;

/**
 * Reference-x the water radiates from: the bow centreline, measured off the
 * water mask (the hull's silhouette runs x 654..912 at ref y 966, and the
 * bulbous bow sits at 770..800 below that).
 */
const BOW_X = 771;

/**
 * Half-width, in reference px, of the window across the bow where the two
 * counter-travelling coordinates are blended. Wide enough that the crossover
 * is gradual, narrow enough to stay behind the hull down to the last few rows
 * before the foreground dissolve.
 */
const BLEND_W = 120;

/**
 * Rounding on the outward coordinate. |x - BOW_X| has a crease at the bow that
 * would draw every travelling crest as a sharp V; softening it to a hyperbola
 * over this many px rounds the apex into the bow wave it is meant to be.
 */
const BOW_SOFT = 70;

/**
 * Outward transport, reference-px/second for each band, at the far end of the
 * surface (the near water runs the perspective factor faster — see below).
 * Ordering is deep-water dispersion, phase speed growing with wavelength:
 * [long, mid, fine], swell fastest.
 *
 * These are measured off reference-waves.mp4, not chosen. Running the hero's
 * own flow metric over the clip's 124 frames (scripts/reference-flow.py) puts
 * the near water at 185-225 plate px/s and the horizon at 60-120, and breaking
 * that down by wavelength (300-900px, 140-320px, under 60px) gives the ordering
 * and the ratios below.
 *
 * They are an order of magnitude above what this file used to carry, which was
 * the single biggest thing separating the hero from the reference: at 26px/s a
 * crest needed half a minute to cross from the bow to the frame edge, so the
 * surface read as a still with a ripple on it. The reference does that crossing
 * in about four seconds, and so does this now.
 *
 * The long and mid bands keep the ratio this file was already tuned to and are
 * scaled up together (both about eight times what they were). That pairing is
 * deliberate and was learned the hard way: pulling them apart unevenly — long
 * doubled, mid left where it was — slid them past each other fast enough that
 * the composite stopped holding waves.svg's shape at all. The dispersion
 * between them is what makes the contours stretch and re-form as they travel
 * rather than sliding rigidly; too much of it and there is nothing left to
 * stretch.
 *
 * The fine band is the exception: it went up only half again, not eight times,
 * which is a real change of shape rather than a rescaling. See below.
 *
 * The fine band is nearly still on purpose. In the clip the small-scale texture
 * barely travels across the frame at all — scripts/dispersion.py puts its
 * shortest scales near the noise floor while the formations above them sweep
 * through at full speed. That is what makes the reference read as water
 * deforming rather than as a picture sliding, and it is why the lattice here is
 * left to ride up and down in its own columns: the dots keep their x, and what
 * moves under them is the surface.
 */
const SPEED = [210, 176, 24];

/**
 * How much of the illustration's perspective the travel and the lift keep.
 *
 * The lattice pitch runs 4.6px at the horizon to 9.7px in the foreground, so
 * water at one world speed crosses 2.49x as many pixels near as far. Both of
 * these are 1 — the artwork's own factor, unmodified — because the reference
 * turns out to agree with it: measured side by side, its horizon travels at
 * 0.4-0.5 of its foreground, against the 0.40 this factor implies.
 *
 * They were briefly flattened (0.45 and 0.62) to stop the horizon reading as a
 * static band. That was treating the symptom. The horizon looked dead because
 * the whole sea was an order of magnitude too slow, so the far end of it —
 * already the slower end, and drawn with the relief compressed into a few px —
 * fell below the speed at which anything reads as moving at all. With SPEED at
 * the measured values the far water carries itself, and the honest perspective
 * is also what the reference does.
 */
const PERSP_TRAVEL = 1;
const PERSP_LIFT = 1;

/**
 * Relief gain on the mid and fine bands — the formations ride slightly larger
 * than the printed artwork without moving the sea's mean level (the long-swell
 * band and every row baseline are untouched). Modest by intent: bigger than
 * waves.svg, still the same sea.
 */
const AMP_GAIN = 1.2;

/**
 * Deformation envelope: a travelling modulation that breathes the mid and fine
 * relief between 1±DEFORM_MOD down a ~620px wavelength — the scale of the
 * formations in the reference, which are broader than this file first assumed.
 * Running outward at 620/2.6 ≈ 238 ref-px/s it travels in family with the
 * transport rather than crawling under it: when the envelope was left at
 * 55px/s against transport ten times that, the sets stood almost still while
 * the water ran through them, which is the one combination that looks like a
 * texture being dragged. Applied identically to both contours bounding each
 * wash at the same column, so bands breathe without ever crossing.
 */
const DEFORM_MOD = 0.34;
const DEFORM_WAVELENGTH = 620;
const DEFORM_PERIOD = 2.6;

/**
 * Breathing swell: the long rise and fall the hull rides. One ~1180px wave
 * running outward from the bow, each depth arriving late down the perspective,
 * on the period measured off reference-waves.mp4. That period is not a round
 * number by accident: the clip is 124 frames at exactly 24fps, and tracking its
 * hull through all of them (scripts/measure-bob.py) finds precisely one bob, so
 * the swell driving it has the clip's own 5.167s. The amplitude is what puts
 * the hull's travel on the reference's 34.9 plate px — see POSE_GAIN. Scales
 * with depth like every amplitude in the illustration. Written below as
 * bob(t)-bob(0), so t=0 is untouched.
 */
const BREATHE_AMP = 8.5;
const BREATHE_PERIOD = 5.167;
const BREATHE_WAVELENGTH = 1180;
/** rad per px of depth: the swell arrives late down the perspective. */
const BREATHE_DEPTH_PHASE = 0.02;

/**
 * Micro-life: the measured clip's high-frequency shimmer, damped hard so it
 * animates the water without buzzing the crisp dot lattice. Scrambled across
 * depth so rows never pulse together.
 *
 * Amplitude and period are both bounded by the no-reversal rule rather than by
 * taste. Every vertical wiggle becomes a horizontal one through ORBIT and SWAY
 * below, at a speed of roughly amp x 2pi/period; at the original 1.1px over
 * 0.9s that came to ~12 px/s of pure oscillation against ~16 px/s of outward
 * travel, and scripts/check-sea-flow.js duly caught the lattice stepping
 * backwards. Slower and smaller, its swing stays well inside the transport.
 */
const SHIM_AMP = 0.55;
const SHIM_PERIOD = 1.7;
const SHIM_WAVELENGTH = 260;
/** rad per px of depth: de-phases the tremor down the perspective. */
const SHIM_DEPTH_PHASE = 0.05;

/**
 * Orbital surge: fraction of its own crest height a node carries forward.
 * Deep-water orbits are circular — horizontal excursion equals elevation — so
 * this is 1.0 in theory. Held well under that here, because an orbit is the one
 * motion on this surface that genuinely does go backwards: a node returns
 * upstream in every trough. At full strength that return beat the outward
 * transport and the water read as pulsing in and out. At this weight the surge
 * only ever slows the outward travel, never reverses it — the dots still visibly
 * bunch and spread as a crest passes. Measured from each node's rest height, so
 * it fades in from the exact waves.svg state and never displaces at t=0.
 */
const ORBIT = 0.4;

/**
 * Slope-based sway: px of horizontal drift per unit of surface slope change.
 * Second-order Stokes bunching — nodes crowd on the face of a crest and
 * spread behind it — complementing ORBIT's first-order surge, and bounded by
 * the same rule.
 */
const SWAY = 28;

// ---- whitecaps -------------------------------------------------------------
// Sunlight on a real sea lives on the crests: where the surface turns over at
// a sharp-enough crest, the lattice catches a bright, twinkling glint. The
// detection is pure geometry (slope reversal through a node), the timing a
// deterministic hash of the node's position — no state, and identical across
// workers, tabs and reloads.

/** Slope (px/px) a crest must turn through before it can catch light. */
const GLINT_SHARP = 0.16;
/** Saturation width above that threshold. */
const GLINT_RANGE = 0.3;
/** Alpha ceiling of a fully-lit glint, before the row's own opacity. */
const GLINT_MAX = 0.6;
/** Seconds between a given node's sparkles (plus per-node jitter). */
const GLINT_PERIOD = 3.4;
/** How tightly glints cluster into travelling patches of light. */
const GLINT_GROUP_W = 0.37;
/** Foam tint a lit dot lifts toward (pale sun-white, not paper white). */
const GLINT_TINT = [238, 250, 253] as const;
/** Fraction of the way a glint dot moves toward GLINT_TINT. */
const GLINT_LIFT = 0.78;

// ---- the ship's seat --------------------------------------------------------
// The hull is a DOM layer, not something this file draws, but it has to ride
// the water this file *does* draw or it reads as a decal. So the renderer
// samples its own surface at the two waterline corners each frame and publishes
// the pose; nothing about the ship's movement is a separate animation.

/** Reference-x of the port and starboard waterline corners of the hull. */
const HULL_PORT_X = 612;
const HULL_STBD_X = 962;
/** Reference-y of the waterline — the row whose contour the hull sits on. */
const HULL_WATERLINE_Y = 958;

/**
 * Columns sampled across the waterline.
 *
 * Load-bearing, not a resolution knob. A hull cannot follow a wave shorter than
 * itself: it spans the crests and troughs and rides their average. Reading the
 * surface at just the two waterline corners instead made the ship chase every
 * formation that crossed the bow — the raw seat ran to tens of px and sat
 * pinned against its own clamp, which is a square wave, not a bob. Averaging
 * across the beam is what leaves the long swell and damps everything shorter,
 * exactly as the water does it.
 *
 * Two or more; the sampling below spans the beam end to end.
 */
const POSE_SAMPLES = 25;

/**
 * Gain on the averaged rise.
 *
 * Calibrated against the reference rather than chosen. Tracking the hull
 * through all 124 frames of reference-waves.mp4 (scripts/measure-bob.py) gives
 * 40.5 video px peak to peak, on a camera steady to 0.02px, and the clip holds
 * exactly one bob — so both the amplitude and the 5.167s period here are
 * measurements.
 *
 * 40.5 video px is 34.9 plate px by the page's width, which is the mapping used
 * throughout: the water fills the page in both, so it is the one scale the two
 * seas share. The ship's own size gives 41.2 instead — the video's ship is
 * drawn about 18% smaller against its page than this one is — and that reading
 * is just as defensible for a bob, which reads by its size against the hull. It
 * is deliberately not used: the hull here does not run an animation of its own,
 * it sits on the water this file draws, so its travel has to come from the same
 * scale the water does or the two stop agreeing.
 *
 * scripts/check-sea-ship.js reports the travel this actually produces.
 */
const POSE_GAIN = 0.655;

/**
 * Time constant, in seconds, of the waterline the rise is measured against.
 *
 * The wave field is only periodic over 3640px, so the mean surface height at a
 * fixed column wanders as the profile carries past — a 900px formation crossing
 * at ~30px/s is a half-minute of slow rise and fall, and the ship would ride
 * visibly high or low for stretches rather than sitting in the water. Following
 * the mean with a lag is what a hull does anyway: it floats at its own
 * waterline.
 *
 * Chosen against the two periods it has to separate. As a first-order high pass
 * this passes a period T at gain wt/sqrt(1+(wt)^2): at 4s it leaves the 5s
 * swell at 98% and cuts that 30s wander to 64%. Much longer and the wander
 * comes through with the swell; much shorter and it starts eating the bob.
 */
const POSE_SETTLE = 4;

/**
 * Safety rail on the bob, reference px either side of rest. The seat stays well
 * inside this; it exists so a future change to the wave amplitudes cannot throw
 * the ship off the plate. Raised with the swell: the reference's hull travels
 * 35 plate px peak to peak, so a +-14 rail would have been clipping it into a
 * square wave rather than guarding it.
 */
const POSE_MAX = 30;
/**
 * Roll, in degrees per unit of surface slope across the beam. The true tilt
 * would be atan(slope) in degrees, ~57 per unit; this deliberately under-reads
 * it by an order of magnitude, because at this scale a visibly tilting ship
 * reads as a toy. Sized so the measured swing lands near half a degree — enough
 * that the hull is plainly not rigid, little enough that you have to look.
 */
const POSE_ROLL_PER_SLOPE = 6;
/** Safety rail on the roll, degrees either side of level. */
const POSE_ROLL_MAX = 1.2;

/** What the hull is doing this frame. Reference px, degrees. */
export interface ShipPose {
  dy: number;
  roll: number;
}

/** Flatten a raw perspective factor towards 1 by `keep`. */
function persp(k: number, keep: number) {
  return 1 + (k - 1) * keep;
}

/** Deterministic [0,1) from two integers — the same value every process. */
function hash2(a: number, b: number): number {
  let h = (Math.imul(a, 0x9e3779b1) + Math.imul(b, 0x85ebca6b)) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

// Wavenumbers of the three travelling modulations, rad per reference px.
const DEFORM_K = (2 * Math.PI) / DEFORM_WAVELENGTH;
const BREATHE_K = (2 * Math.PI) / BREATHE_WAVELENGTH;
const SHIM_K = (2 * Math.PI) / SHIM_WAVELENGTH;

/**
 * Fade-in for the terms that must not exist at t=0. Smoothstep, not a linear
 * ramp: a linear one grows fastest at the instant the clock starts, and its
 * first half-second of growth moved the surface faster than the transport did —
 * scripts/check-sea-flow.js measured the water setting off backwards for two
 * steps before settling. Easing in means the growth rate starts at zero, so the
 * outward travel is the only thing moving anything when the water first stirs.
 */
function easeIn(time: number, seconds: number) {
  const u = time >= seconds ? 1 : time / seconds;
  return u * u * (3 - 2 * u);
}

/** Seconds each of those terms takes to reach full strength. */
const DEFORM_RAMP = 5;
const SHIM_RAMP = 4;
const GLINT_RAMP = 3;

/**
 * Distance out from the bow, softened. Every travelling term takes this as its
 * spatial argument and subtracts ωt from it, so its phase advances away from
 * the ship on both sides and never, at any point in the cycle, back towards it.
 */
function outward(x: number) {
  const d = x - BOW_X;
  return Math.sqrt(d * d + BOW_SOFT * BOW_SOFT) - BOW_SOFT;
}

/**
 * Which way the water at `x` is being carried: -1 to port, +1 to starboard,
 * ramped smoothly across the bow. Doubles as the blend weight between the two
 * shear-free sampling coordinates ((1 + side) / 2).
 */
function side(x: number) {
  const u = (x - BOW_X) / BLEND_W;
  if (u <= -1) return -1;
  if (u >= 1) return 1;
  // smoothstep, so the crossover has no corner in it
  return 1.5 * u - 0.5 * u * u * u;
}

export type WaveField = ReturnType<typeof parseWaveField>;

// ----------------------------------------------------------------- parsing

export function parseWaveField(buf: ArrayBuffer) {
  const dv = new DataView(buf);
  if (String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== 'WAVE') {
    throw new Error('hero-waves.bin: bad magic');
  }
  let o = 4;
  const u16 = () => { const v = dv.getUint16(o, true); o += 2; return v; };
  const u32 = () => { const v = dv.getUint32(o, true); o += 4; return v; };
  const f32 = () => { const v = dv.getFloat32(o, true); o += 4; return v; };

  u16(); // version
  const nx = u16();
  const nContours = u16();
  const nBands = u16();
  const nRows = u16();
  const nStops = u16();
  const nChunks = u32();
  const nDots = u32();

  const gridX0 = f32();
  const gridDX = f32();
  const gradX0 = f32();
  const gradDX = f32();
  const gradSpan = f32();
  const seam = f32();
  const mirrorLo = f32();
  const mirrorHi = f32();
  const viewX = f32();
  const viewY = f32();
  const viewW = f32();
  const viewH = f32();

  const take = <T>(n: number, make: (b: ArrayBuffer, off: number, len: number) => T, bytes: number) => {
    const v = make(buf, o, n);
    o += n * bytes;
    return v;
  };

  const contourY = take(nContours * nx, (b, p, n) => new Int16Array(b.slice(p, p + n * 2)), 2);
  const contourSpeed = take(nContours, (b, p, n) => new Float32Array(b.slice(p, p + n * 4)), 4);
  const bandOpacity = take(nBands, (b, p, n) => new Uint8Array(b.slice(p, p + n)), 1);
  const gradients = take(nBands * nStops * 3, (b, p, n) => new Uint8Array(b.slice(p, p + n)), 1);

  const rowX0 = new Float32Array(nRows);
  const rowPitch = new Float32Array(nRows);
  const rowCount = new Uint16Array(nRows);
  const rowDash = new Float32Array(nRows);
  const rowWidth = new Float32Array(nRows);
  const rowOpacity = new Float32Array(nRows);
  const rowChunks = new Uint16Array(nRows);
  const rowSpeed = new Float32Array(nRows);
  for (let r = 0; r < nRows; r++) {
    rowX0[r] = f32();
    rowPitch[r] = f32();
    rowCount[r] = u16();
    rowDash[r] = f32();
    rowWidth[r] = f32();
    rowOpacity[r] = f32();
    rowChunks[r] = u16();
    rowSpeed[r] = f32();
  }
  const rowY = take(nDots, (b, p, n) => new Int16Array(b.slice(p, p + n * 2)), 2);
  const chunkColor = take(nChunks * 3, (b, p, n) => new Uint8Array(b.slice(p, p + n)), 1);
  const chunkLen = take(nChunks, (b, p, n) => new Uint16Array(b.slice(p, p + n * 2)), 2);

  // Where each row's dots and chunks start in the flat arrays.
  const rowDotStart = new Uint32Array(nRows + 1);
  const rowChunkStart = new Uint32Array(nRows + 1);
  for (let r = 0; r < nRows; r++) {
    rowDotStart[r + 1] = rowDotStart[r] + rowCount[r];
    rowChunkStart[r + 1] = rowChunkStart[r] + rowChunks[r];
  }

  // Mean depth of every contour and row — the animation's only use for it is
  // phasing the swell, so a mean is enough.
  const contourMid = new Float32Array(nContours);
  for (let c = 0; c < nContours; c++) {
    let s = 0;
    for (let j = 0; j < nx; j++) s += contourY[c * nx + j];
    contourMid[c] = s / (nx * 10);
  }
  const rowMid = new Float32Array(nRows);
  for (let r = 0; r < nRows; r++) {
    let s = 0;
    const a = rowDotStart[r];
    for (let j = 0; j < rowCount[r]; j++) s += rowY[a + j];
    rowMid[r] = s / (rowCount[r] * 10);
  }

  // Each row's dots are shaded by the wash band it lies in, so the travelling
  // tone lifts and drops them as a crest goes past.
  const rowBand = new Uint16Array(nRows);
  for (let r = 0; r < nRows; r++) {
    let best = 0;
    let bestD = Infinity;
    for (let b = 0; b < nBands; b++) {
      const d = Math.abs((contourMid[b] + contourMid[b + 1]) / 2 - rowMid[r]);
      if (d < bestD) { bestD = d; best = b; }
    }
    rowBand[r] = best;
  }

  const field = {
    nx, nContours, nBands, nRows, nStops, nChunks, nDots,
    gridX0, gridDX, gradX0, gradDX, gradSpan, seam, mirrorLo, mirrorHi,
    viewX, viewY, viewW, viewH,
    contourY, contourSpeed, contourMid, bandOpacity, gradients,
    rowX0, rowPitch, rowCount, rowDash, rowWidth, rowOpacity, rowChunks,
    rowSpeed, rowMid, rowBand, rowY, chunkColor, chunkLen,
    rowDotStart, rowChunkStart,
    // filled in below
    tables: new Float32Array(0),
    tableStep: 0,
  };

  field.tables = buildBandTables(field);
  field.tableStep = (mirrorHi - mirrorLo) / (N - 1);
  return field;
}

// ------------------------------------------------------- the periodic field

/**
 * Resample every contour and every dot row onto the shared periodic grid and
 * split it into three spectral bands, ordered [long, mid, fine]. The three
 * always sum back to the profile, so with all three at the same phase the
 * surface is bit-for-bit the one in waves.svg.
 */
function buildBandTables(f: {
  nContours: number; nRows: number; nx: number;
  gridX0: number; gridDX: number; mirrorLo: number; mirrorHi: number;
  contourY: Int16Array; rowY: Int16Array;
  rowX0: Float32Array; rowPitch: Float32Array; rowCount: Uint16Array;
  rowDotStart: Uint32Array;
}) {
  const nProfiles = f.nContours + f.nRows;
  const tables = new Float32Array(nProfiles * 3 * N);
  const step = (f.mirrorHi - f.mirrorLo) / (N - 1);
  const p = new Float32Array(N);
  const lo = new Float32Array(N);
  const mid = new Float32Array(N);

  const resample = (
    dst: Float32Array, src: Int16Array, off: number, count: number,
    x0: number, dx: number
  ) => {
    for (let i = 0; i < N; i++) {
      const t = (f.mirrorLo + i * step - x0) / dx;
      const k = Math.min(count - 2, Math.max(0, Math.floor(t)));
      const g = t - k;
      dst[i] = (src[off + k] * (1 - g) + src[off + k + 1] * g) / 10;
    }
  };

  for (let i = 0; i < nProfiles; i++) {
    if (i < f.nContours) {
      resample(p, f.contourY, i * f.nx, f.nx, f.gridX0, f.gridDX);
    } else {
      const r = i - f.nContours;
      resample(p, f.rowY, f.rowDotStart[r], f.rowCount[r], f.rowX0[r], f.rowPitch[r]);
    }
    blurMirror(p, lo, SIGMA_LONG / step);
    blurMirror(p, mid, SIGMA_MID / step);
    const base = i * 3 * N;
    for (let j = 0; j < N; j++) {
      tables[base + j] = lo[j];
      tables[base + N + j] = mid[j] - lo[j];
      tables[base + 2 * N + j] = p[j] - mid[j];
    }
  }
  return tables;
}

/**
 * Gaussian-ish low pass (three box passes) with mirrored edges — the same
 * symmetry the profile itself has, so the bands stay periodic and the split
 * introduces no seam at the folds.
 */
const blurA = new Float32Array(N);
const blurB = new Float32Array(N);

function blurMirror(src: Float32Array, dst: Float32Array, sigma: number) {
  const r = Math.max(1, Math.round(sigma * 0.9));
  const a = blurA;
  const b = blurB;
  boxMirror(src, a, r);
  boxMirror(a, b, r);
  boxMirror(b, dst, r);
}

function boxMirror(src: Float32Array, dst: Float32Array, r: number) {
  const w = 2 * r + 1;
  const per = 2 * (N - 1);
  let sum = 0;
  for (let k = -r; k <= r; k++) sum += src[foldIndex(k, per)];
  dst[0] = sum / w;
  for (let i = 1; i < N; i++) {
    sum += src[foldIndex(i + r, per)] - src[foldIndex(i - r - 1, per)];
    dst[i] = sum / w;
  }
}

function foldIndex(i: number, per: number) {
  let q = i % per;
  if (q < 0) q += per;
  return q > N - 1 ? per - q : q;
}

// --------------------------------------------------------------- the render

/** Slope of the last sampled band, in px per px. Written by `sampleBand`. */
let lastSlope = 0;

function sampleBand(tables: Float32Array, base: number, x: number, lo: number, step: number, withSlope: boolean) {
  const per = 2 * (N - 1);
  let u = (x - lo) / step;
  u = u % per;
  if (u < 0) u += per;
  let flipped = false;
  if (u > N - 1) { u = per - u; flipped = true; }
  const k = Math.min(N - 2, Math.floor(u));
  const g = u - k;
  const y0 = tables[base + k];
  const y1 = tables[base + k + 1];
  if (withSlope) lastSlope = (flipped ? -(y1 - y0) : y1 - y0) / step;
  return y0 * (1 - g) + y1 * g;
}

const HEX: string[] = [];
for (let i = 0; i < 256; i++) HEX.push(i.toString(16).padStart(2, '0'));

/**
 * Colour strings, memoised per slot. Every stop and every dot chunk is
 * recoloured each frame as the tone travels under it, but the tone moves a
 * fraction of a step per frame, so the same string almost always comes back —
 * and building ~4,000 throwaway strings a frame is what turns a steady 60fps
 * into a sawtooth of GC pauses.
 */
function makeColorCache(n: number) {
  const key = new Int32Array(n).fill(-1);
  const str: string[] = new Array(n).fill('#000000');
  return (slot: number, r: number, g: number, b: number) => {
    const ri = r < 0 ? 0 : r > 255 ? 255 : r | 0;
    const gi = g < 0 ? 0 : g > 255 ? 255 : g | 0;
    const bi = b < 0 ? 0 : b > 255 ? 255 : b | 0;
    const k = (ri << 16) | (gi << 8) | bi;
    if (key[slot] !== k) {
      key[slot] = k;
      str[slot] = '#' + HEX[ri] + HEX[gi] + HEX[bi];
    }
    return str[slot];
  };
}

/** Either canvas flavour — the renderer runs in a worker when it can. */
export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Ceiling on the backing store, in device px. At the 1560px design width this
 * is a full 2x plate; past that the water is drawn slightly softer rather than
 * asking a 5K canvas to redraw 15k dots for a decorative surface.
 */
export const MAX_DEVICE_W = 3200;

/**
 * Redraw cadence. Asking for 30 gets about 19 here, which is what a full
 * redraw of 122 gradient bands and 15,301 round-capped dots costs; the target
 * is what the cadence is aimed at, not a promise. A machine that cannot hold it
 * simply runs slower: elapsed time is real seconds either way, so a dropped
 * frame slows the picture, never the water.
 *
 * The frame rate is now a design constraint rather than a free parameter,
 * because the surface travels at the reference's speed. The foreground crosses
 * ~440 ref px/s, so at ~19fps it moves ~23px between frames, and a wave is
 * sampled unambiguously only while it moves under half a wavelength per frame.
 * That is what sets the floor on SIGMA_MID: the mid band starts at ~52px, so
 * its shortest components sit at 0.44 of a wavelength per frame — inside the
 * limit, but not by much. Raising the speeds further, or widening the mid band
 * downward, would push them past it and the water would start reading as
 * travelling backwards.
 */
export const TARGET_MS = 1000 / 30;

/**
 * Largest step, in seconds, the clock may advance in one frame.
 *
 * A guard against a stalled thread or a throttled timer teleporting the water
 * forward. It has to sit clear of the real frame interval or it stops being a
 * guard and becomes a speed limit: clamped at 0.1s, any machine drawing slower
 * than 10fps would silently run its water slow rather than merely coarse. At
 * the current speeds this still bounds a single jump to about 110px of
 * foreground travel.
 */
export const MAX_STEP = 0.25;

export interface WaveRenderer {
  /** Clear and redraw the whole surface at `time` seconds. */
  draw(time: number): void;
  /** Fit the backing store to a CSS width; true if it changed. */
  resize(cssWidth: number, dpr: number): boolean;
  /**
   * How the hull sits on the surface `draw` last painted. Read after `draw`;
   * before the first one it is dead level, which is the artwork's own state.
   */
  readonly pose: ShipPose;
  readonly view: { x: number; y: number; w: number; h: number };
}

export function createWaveRenderer(ctx: Ctx2D, f: WaveField): WaveRenderer {
  const { nx, nContours, nBands, nRows, nStops } = f;
  const step = f.tableStep;

  // Per-frame scratch: the advected contours, and the dot positions of one row.
  const cx = new Float32Array(nContours * nx);
  const cy = new Float32Array(nContours * nx);
  let maxDots = 0;
  for (let r = 0; r < nRows; r++) maxDots = Math.max(maxDots, f.rowCount[r]);
  const dx = new Float32Array(maxDots);
  const dy = new Float32Array(maxDots);
  /** Per-dot whitecap brightness for the row being drawn (0 = unlit). */
  const gs = new Float32Array(maxDots);
  /** Wave-set envelope per shared contour column — computed once a frame. */
  const envGrid = new Float32Array(nx);

  // The illustration's raw perspective factor, flattened for travel and for
  // lift. Computed once: the inner loops read these instead of the raw factor,
  // so the far water keeps up without costing anything per frame.
  const cTravel = new Float32Array(nContours);
  const cLift = new Float32Array(nContours);
  for (let c = 0; c < nContours; c++) {
    cTravel[c] = persp(f.contourSpeed[c], PERSP_TRAVEL);
    cLift[c] = persp(f.contourSpeed[c], PERSP_LIFT);
  }
  const rTravel = new Float32Array(nRows);
  const rLift = new Float32Array(nRows);
  for (let r = 0; r < nRows; r++) {
    rTravel[r] = persp(f.rowSpeed[r], PERSP_TRAVEL);
    rLift[r] = persp(f.rowSpeed[r], PERSP_LIFT);
  }

  // The surface slope AND height at every node with the water at rest — that
  // is, as waves.svg draws it. Sway and orbit are both measured *from* this
  // state, so at t=0 every mark lands exactly where the file puts it and the
  // animation starts from the artwork rather than near it.
  const contourSlope0 = new Float32Array(nContours * nx);
  const contourRestY = new Float32Array(nContours * nx);
  const rowSlope0 = new Float32Array(f.nDots);
  const rowRestY = new Float32Array(f.nDots);
  const stopHex = makeColorCache(nBands * nStops);
  const chunkHex = makeColorCache(f.nChunks);
  const glintHex = makeColorCache(f.nChunks);

  /**
   * One profile (contour or row) sampled at `x` under a single travel
   * direction. `e` is the wave-set envelope: it scales the mid and fine bands
   * (the formations) while the long swell carries them unchanged, and is 1
   * whenever the water is at rest.
   *
   * The shifts arrive already signed, and this samples at `x - shift` — a plain
   * translation of the profile, so dy/dx is 1 for every t and the surface can
   * never compress, fold or streak however long it runs.
   */
  const carry = (
    profile: number, x: number,
    shift0: number, shift1: number, shift2: number,
    e: number
  ) => {
    const base = profile * 3 * N;
    let y = sampleBand(f.tables, base, x - shift0, f.mirrorLo, step, true);
    y += e * AMP_GAIN * sampleBand(f.tables, base + N, x - shift1, f.mirrorLo, step, false);
    y += e * AMP_GAIN * sampleBand(f.tables, base + 2 * N, x - shift2, f.mirrorLo, step, false);
    return y;
  };

  /**
   * The advected height at `x`: the same profile carried to port left of the
   * bow and to starboard right of it, the two blended over BLEND_W px so the
   * step between their sampling coordinates never becomes an edge. Away from
   * that window — which is to say everywhere the hull does not cover — exactly
   * one of the two is evaluated, and the water there is a pure outward travel.
   */
  const height = (
    profile: number, x: number,
    shift0: number, shift1: number, shift2: number,
    e: number
  ) => {
    const s = side(x);
    if (s >= 1) return carry(profile, x, shift0, shift1, shift2, e);
    if (s <= -1) return carry(profile, x, -shift0, -shift1, -shift2, e);
    const w = (1 + s) / 2;
    const yPort = carry(profile, x, -shift0, -shift1, -shift2, e);
    const slopePort = lastSlope;
    const yStbd = carry(profile, x, shift0, shift1, shift2, e);
    lastSlope = slopePort + (lastSlope - slopePort) * w;
    return yPort + (yStbd - yPort) * w;
  };

  /**
   * The wash tone at `x`, advected with the swell that carries it — outward,
   * on the same signed coordinate as the geometry, or the colour of a band
   * would travel against the shape of it.
   */
  const tone = (band: number, x: number, shift: number, out: Float32Array) => {
    // Fold over the gradient's own span, not the surface's periodic window:
    // the two agree inside the frame but the gradient is what has to wrap.
    const span = f.gradSpan;
    const per = 2 * span;
    let u = (x - shift * side(x) - f.gradX0) % per;
    if (u < 0) u += per;
    if (u > span) u = per - u;
    const t = u / f.gradDX;
    const k = Math.min(nStops - 2, Math.max(0, Math.floor(t)));
    const g = t - k;
    const a = (band * nStops + k) * 3;
    const b = a + 3;
    const G = f.gradients;
    out[0] = G[a] * (1 - g) + G[b] * g;
    out[1] = G[a + 1] * (1 - g) + G[b + 1] * g;
    out[2] = G[a + 2] * (1 - g) + G[b + 2] * g;
  };

  for (let c = 0; c < nContours; c++) {
    for (let j = 0; j < nx; j++) {
      const h = height(c, f.gridX0 + j * f.gridDX, 0, 0, 0, 1);
      contourRestY[c * nx + j] = h;
      contourSlope0[c * nx + j] = lastSlope;
    }
  }
  for (let r = 0; r < nRows; r++) {
    const a = f.rowDotStart[r];
    for (let j = 0; j < f.rowCount[r]; j++) {
      const h = height(nContours + r, f.rowX0[r] + j * f.rowPitch[r], 0, 0, 0, 1);
      rowRestY[a + j] = h;
      rowSlope0[a + j] = lastSlope;
    }
  }

  // ---- the ship's seat, read straight off the contours `draw` just advected
  // (no parallel evaluation of the model, so the hull cannot drift out of step
  // with the water under it).
  let poseContour = 0;
  for (let c = 1; c < nContours; c++) {
    if (
      Math.abs(f.contourMid[c] - HULL_WATERLINE_Y) <
      Math.abs(f.contourMid[poseContour] - HULL_WATERLINE_Y)
    ) {
      poseContour = c;
    }
  }
  /** Fractional column index of a reference-x on the contour grid. */
  const poseCol = (x: number) =>
    Math.min(nx - 1.001, Math.max(0, (x - f.gridX0) / f.gridDX));
  /** Lerp a per-column array along the pose contour. */
  const atCol = (arr: Float32Array, col: number) => {
    const o = poseContour * nx;
    const i = Math.floor(col);
    const g = col - i;
    return arr[o + i] * (1 - g) + arr[o + i + 1] * g;
  };
  // Where along the waterline the hull is read, and how high the water stands
  // there at rest. Sampled once; only the advected heights change per frame.
  const poseCols = new Float32Array(POSE_SAMPLES);
  const poseRest = new Float32Array(POSE_SAMPLES);
  /** Column offsets from the middle of the beam, for the roll's slope fit. */
  const poseAxis = new Float32Array(POSE_SAMPLES);
  let poseAxisSq = 0;
  for (let i = 0; i < POSE_SAMPLES; i++) {
    const u = i / (POSE_SAMPLES - 1);
    const x = HULL_PORT_X + (HULL_STBD_X - HULL_PORT_X) * u;
    poseCols[i] = poseCol(x);
    poseRest[i] = atCol(contourRestY, poseCols[i]);
    poseAxis[i] = x - (HULL_PORT_X + HULL_STBD_X) / 2;
    poseAxisSq += poseAxis[i] * poseAxis[i];
  }
  const pose: ShipPose = { dy: 0, roll: 0 };
  /** The lagging waterline the rise is measured from, and the clock behind it. */
  let poseLevel = 0;
  let poseClock = 0;

  const clamp = (v: number, lim: number) => (v > lim ? lim : v < -lim ? -lim : v);

  const t0 = new Float32Array(3);
  const t1 = new Float32Array(3);

  const fade = ctx.createLinearGradient(0, f.viewY, 0, f.viewY + f.viewH);
  fade.addColorStop(0.88, 'rgba(0,0,0,0)');
  fade.addColorStop(0.96, 'rgba(0,0,0,0.45)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');

  /** Catmull-Rom through the sampled contour, exactly as waves.svg emits it. */
  const contourPath = (row: number, forward: boolean, yOff: number) => {
    const o = row * nx;
    const i0 = forward ? 0 : nx - 1;
    const dir = forward ? 1 : -1;
    const at = (i: number) => o + Math.min(nx - 1, Math.max(0, i));
    for (let n = 0; n < nx - 1; n++) {
      const i = i0 + dir * n;
      const p0 = at(i - dir);
      const p1 = o + i;
      const p2 = o + i + dir;
      const p3 = at(i + 2 * dir);
      ctx.bezierCurveTo(
        cx[p1] + (cx[p2] - cx[p0]) / 6, cy[p1] + yOff + (cy[p2] - cy[p0]) / 6,
        cx[p2] - (cx[p3] - cx[p1]) / 6, cy[p2] + yOff - (cy[p3] - cy[p1]) / 6,
        cx[p2], cy[p2] + yOff
      );
    }
  };

  /** Size the backing store for a CSS width, and set up reference coordinates. */
  const resize = (cssWidth: number, dpr: number) => {
    const canvas = ctx.canvas;
    const w = Math.round(Math.min(cssWidth * dpr, MAX_DEVICE_W));
    const h = Math.round((w * f.viewH) / f.viewW);
    if (!w || (canvas.width === w && canvas.height === h)) return false;
    canvas.width = w;
    canvas.height = h;
    const s = w / f.viewW;
    // Draw in the illustration's own reference coordinates, so every number in
    // the field data is used exactly as waves.svg wrote it.
    ctx.setTransform(s, 0, 0, s, -f.viewX * s, -f.viewY * s);
    return true;
  };

  const draw = (time: number) => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
    const s0 = SPEED[0] * time;
    const s1 = SPEED[1] * time;
    const s2 = SPEED[2] * time;
    const breathe = (2 * Math.PI * time) / BREATHE_PERIOD;
    const shimT = (2 * Math.PI * time) / SHIM_PERIOD;
    // Both slow modulations fade in with the clock so frame zero — and the
    // reduced-motion still frame — stays exactly waves.svg.
    const deformRamp = easeIn(time, DEFORM_RAMP);
    const deformPhase = (2 * Math.PI * time) / DEFORM_PERIOD;
    const shimRamp = easeIn(time, SHIM_RAMP);

    // ---- advect every wash contour
    // The deformation envelope is a function of x alone: both bounding
    // contours of every wash read the same multiplier at the same column, so
    // bands can breathe between calm and full but their contours can never
    // cross.
    for (let j = 0; j < nx; j++) {
      envGrid[j] =
        1 +
        DEFORM_MOD *
          deformRamp *
          Math.sin(outward(f.gridX0 + j * f.gridDX) * DEFORM_K - deformPhase);
    }
    for (let c = 0; c < nContours; c++) {
      const k = cTravel[c];
      const lift = cLift[c];
      const a0 = s0 * k;
      const a1 = s1 * k;
      const a2 = s2 * k;
      const sway = SWAY * k;
      const o = c * nx;
      for (let j = 0; j < nx; j++) {
        const x = f.gridX0 + j * f.gridDX;
        // Breathing swell + micro-life, both running outward (ωt subtracted
        // from the outward phase, never added). Both vanish at t=0: the swell
        // as bob(t)-bob(0), the tremor under its fade-in ramp.
        const w = BREATHE_K * outward(x) - breathe - f.contourMid[c] * BREATHE_DEPTH_PHASE;
        const sh = SHIM_K * outward(x) - shimT - f.contourMid[c] * SHIM_DEPTH_PHASE;
        const y =
          height(c, x, a0, a1, a2, envGrid[j]) +
          BREATHE_AMP * lift * (Math.sin(w) - Math.sin(w + breathe)) +
          SHIM_AMP * lift * shimRamp * Math.sin(sh);
        cy[o + j] = y;
        cx[o + j] =
          x -
          sway * (lastSlope - contourSlope0[o + j]) -
          ORBIT * (y - contourRestY[o + j]);
      }
    }

    // ---- what the hull is riding, taken from the contour just advected.
    // Mean rise across the beam is the bob; the least-squares slope of the same
    // samples is the roll. Both are of the surface actually on screen.
    let seatSum = 0;
    let slopeSum = 0;
    for (let i = 0; i < POSE_SAMPLES; i++) {
      const rise = atCol(cy, poseCols[i]) - poseRest[i];
      seatSum += rise;
      slopeSum += rise * poseAxis[i];
    }
    const seat = seatSum / POSE_SAMPLES;
    // Settle towards the mean surface height, and measure the rise from there.
    const dt = time > poseClock ? Math.min(time - poseClock, 0.5) : 0;
    if (time < poseClock) poseLevel = 0; // rewound to frame zero
    poseClock = time;
    poseLevel += (seat - poseLevel) * (1 - Math.exp(-dt / POSE_SETTLE));
    pose.dy = clamp((seat - poseLevel) * POSE_GAIN, POSE_MAX);
    pose.roll = clamp(
      (slopeSum / poseAxisSq) * POSE_ROLL_PER_SLOPE,
      POSE_ROLL_MAX
    );

    // ---- washes: one gradient-filled band between each pair of contours
    for (let b = 0; b < nBands; b++) {
      const shift = SPEED[0] * time * cTravel[b];
      const g = ctx.createLinearGradient(f.gradX0, 0, f.gradX0 + f.gradSpan, 0);
      for (let j = 0; j < nStops; j++) {
        const x = f.gradX0 + j * f.gradDX;
        tone(b, x, shift, t0);
        g.addColorStop(
          Math.min(1, (j * f.gradDX) / f.gradSpan),
          stopHex(b * nStops + j, t0[0], t0[1], t0[2])
        );
      }
      ctx.globalAlpha = f.bandOpacity[b] / 255;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx[b * nx], cy[b * nx]);
      contourPath(b, true, 0);
      // the lower contour is the next one, carried a hair past its own line so
      // adjacent bands overlap instead of leaving a hairline of white page
      const lo = (b + 1) * nx;
      ctx.lineTo(cx[lo + nx - 1], cy[lo + nx - 1] + f.seam);
      contourPath(b + 1, false, f.seam);
      ctx.closePath();
      ctx.fill();
    }

    // ---- the dot lattice, riding the same surface
    ctx.lineCap = 'round';
    // Whitecaps fade in with the clock so frame zero stays exactly waves.svg
    // (and the reduced-motion still frame never shows them), and live in the
    // nearer two-thirds of the surface where a real sea catches light.
    const glintRamp = easeIn(time, GLINT_RAMP);
    for (let r = 0; r < nRows; r++) {
      const k = rTravel[r];
      const lift = rLift[r];
      const a0 = s0 * k;
      const a1 = s1 * k;
      const a2 = s2 * k;
      const sway = SWAY * k;
      const profile = nContours + r;
      const n = f.rowCount[r];
      const x0 = f.rowX0[r];
      const pitch = f.rowPitch[r];
      const rest = f.rowDotStart[r];
      for (let j = 0; j < n; j++) {
        const x = x0 + j * pitch;
        const e =
          1 +
          DEFORM_MOD * deformRamp * Math.sin(outward(x) * DEFORM_K - deformPhase);
        const w = BREATHE_K * outward(x) - breathe - f.rowMid[r] * BREATHE_DEPTH_PHASE;
        const sh = SHIM_K * outward(x) - shimT - f.rowMid[r] * SHIM_DEPTH_PHASE;
        const y =
          height(profile, x, a0, a1, a2, e) +
          BREATHE_AMP * lift * (Math.sin(w) - Math.sin(w + breathe)) +
          SHIM_AMP * lift * shimRamp * Math.sin(sh);
        dy[j] = y;
        // Orbital surge: forward under a crest, back in a trough —
        // proportional to the node's rise above its own rest height.
        dx[j] =
          x -
          sway * (lastSlope - rowSlope0[rest + j]) -
          ORBIT * (y - rowRestY[rest + j]);
      }

      // ---- whitecap candidates: nodes where the surface turns over sharply
      const gfac =
        glintRamp *
        Math.min(
          1,
          Math.max(
            0,
            (f.rowMid[r] - f.viewY - f.viewH * 0.3) / (f.viewH * 0.4)
          )
        );
      if (gfac > 0) {
        gs[0] = 0;
        gs[n - 1] = 0;
        for (let j = 1; j < n - 1; j++) {
          const sb = dy[j] - dy[j - 1];
          const sf = dy[j + 1] - dy[j];
          if (!(sb < 0 && sf >= 0)) {
            gs[j] = 0;
            continue;
          }
          const sharp = Math.min(-sb, sf) / pitch;
          if (sharp <= GLINT_SHARP) {
            gs[j] = 0;
            continue;
          }
          const h = hash2(j, r);
          const tw = Math.max(
            0,
            Math.sin(
              (2 * Math.PI * time) / (GLINT_PERIOD * (0.65 + 0.7 * h)) +
                h * 6.2832
            )
          );
          // Patches of light drift outward with the crests they sit on.
          const grp = Math.max(
            0,
            Math.sin(outward(dx[j]) * 0.006 - GLINT_GROUP_W * time + r * 1.31)
          );
          gs[j] =
            gfac *
            Math.min(1, (sharp - GLINT_SHARP) / GLINT_RANGE) *
            tw * tw * tw *
            grp;
        }
      } else {
        gs.fill(0, 0, n);
      }

      // The tone travels with the surface, so a passing crest lifts the dots'
      // own colour the way it lifts the wash under them.
      const band = f.rowBand[r];
      const shift = SPEED[0] * time * k;
      const dash = f.rowDash[r];
      const alpha = f.rowOpacity[r];
      const width = f.rowWidth[r];
      let d = 0;
      const c0 = f.rowChunkStart[r];
      for (let c = 0; c < f.rowChunks[r]; c++) {
        const len = f.chunkLen[c0 + c];
        const mx = x0 + (d + len / 2) * pitch;
        tone(band, mx, shift, t0);
        tone(band, mx, 0, t1);
        const p = (c0 + c) * 3;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;
        ctx.strokeStyle = chunkHex(
          c0 + c,
          f.chunkColor[p] + t0[0] - t1[0],
          f.chunkColor[p + 1] + t0[1] - t1[1],
          f.chunkColor[p + 2] + t0[2] - t1[2]
        );
        ctx.beginPath();
        for (let j = d; j < d + len; j++) {
          ctx.moveTo(dx[j], dy[j]);
          ctx.lineTo(dx[j] + dash, dy[j]);
        }
        ctx.stroke();
        // lit crest tops in this chunk: a short foam dash over their node
        for (let j = d; j < d + len; j++) {
          const s = gs[j];
          if (s < 0.04) continue;
          ctx.globalAlpha = alpha * s * GLINT_MAX;
          ctx.lineWidth = width * 1.35;
          ctx.strokeStyle = glintHex(
            c0 + c,
            f.chunkColor[p] + (GLINT_TINT[0] - f.chunkColor[p]) * GLINT_LIFT,
            f.chunkColor[p + 1] +
              (GLINT_TINT[1] - f.chunkColor[p + 1]) * GLINT_LIFT,
            f.chunkColor[p + 2] +
              (GLINT_TINT[2] - f.chunkColor[p + 2]) * GLINT_LIFT
          );
          ctx.beginPath();
          ctx.moveTo(dx[j] - dash * 0.7, dy[j]);
          ctx.lineTo(dx[j] + dash * 0.7, dy[j]);
          ctx.stroke();
        }
        d += len;
      }
    }
    ctx.globalAlpha = 1;

    // The foreground dissolve — waves.svg's own `wfade`, which is where the
    // printed surface gives out rather than ending at an edge.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = fade;
    ctx.fillRect(f.gridX0, f.viewY, f.viewW - 2 * f.gridX0, f.viewH);
    ctx.globalCompositeOperation = 'source-over';
  };

  return {
    draw,
    resize,
    pose,
    view: { x: f.viewX, y: f.viewY, w: f.viewW, h: f.viewH },
  };
}
