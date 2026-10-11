/**
 * check-callout-track.js — do the hero's alert cards stay on their hotspots?
 *
 * The two hotspots are markers painted INSIDE the ship raster, so they inherit
 * the hull's transform. Each alert (card + leader + pulse) is separate DOM that
 * hero.tsx translates by the displacement it computes for that hotspot. If the
 * two disagree, the leader visibly slides off its marker as the ship rides the
 * swell.
 *
 * This measures that directly rather than by eye. For any element with computed
 * matrix M and transform-origin O (element-local px), a local point p is
 * displaced by
 *
 *     d = M·(p − O) + O − p
 *
 * which is independent of where the element sits on the page. So the same page
 * point — each hotspot's centre — is expressed in the ship's local pixels and
 * in its alert group's local pixels, and the two displacements are compared. They
 * should agree to well under a pixel at every instant.
 *
 * Sampling is live (the worker drives the real clock) and reads both elements in
 * ONE evaluate, which is safe because hero.tsx writes the label transforms from
 * inside the same pose callback that writes the ship's.
 *
 * Usage from project/ (needs a running dev server):  node scripts/check-callout-track.js
 */
const { chromium } = require('playwright');

const URL = process.env.SHOOT_URL || 'http://localhost:3000';
/** Viewport chosen so the full-bleed plate is 1560 wide — 1 ref px = 1 CSS px. */
const WIDTH = 1560;
const SAMPLES = Number(process.env.CALLOUT_SAMPLES || 420);

/**
 * Ship cutout origin (SHIP_RECT) and each hotspot, in plate reference px.
 * `tip` is the marker in the raster's own (unscaled) pixels — CALLOUT_MARKERS —
 * and `label` is the alert group's origin, which spans the whole plate.
 */
const SHIP_ORIGIN = { x: 533, y: 2 };
const TIPS = {
  'hull (left)': { tip: { x: 629, y: 364 }, label: { x: 0, y: 0 } },
  'fuel (right)': { tip: { x: 979, y: 274 }, label: { x: 0, y: 0 } },
};

/**
 * The ship layer's resting scale (HERO_SHIP_SCALE). The alert groups are laid
 * out at the hotspots' SCALED resting positions and only translate, so what
 * they must match is the ship's motion away from that rest, not the scale.
 */
const SHIP_SCALE = 0.75;

/** Worst per-sample disagreement tolerated, in plate px. */
const MAX_DRIFT = 0.5;

/**
 * Vertical travel the arrow must actually show across the run, in plate px.
 *
 * A guard, not a tuning knob. A perfectly still ship agrees with a perfectly
 * still label to 0.0000px, so without this the check passes hardest exactly
 * when it is measuring nothing — which is what it did on the first run, before
 * the water had painted its first frame.
 */
const MIN_TRAVEL = 15;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: 1100 },
    deviceScaleFactor: 1,
  });
  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    () => document.querySelector('canvas[data-flowing]')?.dataset.flowing === 'true',
    null,
    { timeout: 15000 }
  );
  // ...and then for the hull to actually be riding. `data-flowing` only says
  // the clock was started; the first pose has not necessarily been published
  // yet, and sampling before it makes every comparison trivially agree.
  await page.waitForFunction(
    () => {
      const t = document.querySelector('[data-hero-ship]')?.style.transform;
      return !!t && t !== 'none' && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(t);
    },
    null,
    { timeout: 15000 }
  );

  const series = await page.evaluate(
    async ([n, shipOrigin, tips, scale]) => {
      // A point p (element-local px) with transform-origin O lands at
      // O + M(p - O), so its displacement is M(p - O) + O - p. M's translation
      // terms (e, f) are part of that and must be included — leaving them out
      // silently measures the rotation alone, which on this element is a few px
      // against a bob of tens.
      const disp = (el, px, py) => {
        const cs = getComputedStyle(el);
        const m = new DOMMatrix(cs.transform === 'none' ? '' : cs.transform);
        const [ox, oy] = cs.transformOrigin.split(' ').map(parseFloat);
        const vx = px - ox;
        const vy = py - oy;
        return [
          m.a * vx + m.c * vy + m.e + ox - px,
          m.b * vx + m.d * vy + m.f + oy - py,
        ];
      };
      // The same, less the displacement the resting scale alone produces.
      const poseDisp = (el, px, py) => {
        const [ox, oy] = getComputedStyle(el).transformOrigin.split(' ').map(parseFloat);
        const [dx, dy] = disp(el, px, py);
        return [dx - (scale - 1) * (px - ox), dy - (scale - 1) * (py - oy)];
      };
      const ship = document.querySelector('[data-hero-ship]');
      const labels = [...document.querySelectorAll('[data-callout-label]')];
      const out = [];
      for (let i = 0; i < n; i++) {
        const row = {};
        for (const [name, t] of Object.entries(tips)) {
          const label = labels.find((l) => l.dataset.calloutLabel === name);
          row[name] = {
            ship: poseDisp(ship, t.tip.x - shipOrigin.x, t.tip.y - shipOrigin.y),
            label: disp(label, t.tip.x - t.label.x, t.tip.y - t.label.y),
          };
        }
        out.push(row);
        await new Promise((r) => requestAnimationFrame(r));
      }
      return out;
    },
    [SAMPLES, SHIP_ORIGIN, TIPS, SHIP_SCALE]
  );
  await browser.close();

  let ok = true;
  for (const name of Object.keys(TIPS)) {
    let worst = 0;
    let range = [Infinity, -Infinity];
    for (const row of series) {
      const { ship, label } = row[name];
      worst = Math.max(worst, Math.hypot(ship[0] - label[0], ship[1] - label[1]));
      range = [Math.min(range[0], ship[1]), Math.max(range[1], ship[1])];
    }
    const travel = range[1] - range[0];
    const moved = travel >= MIN_TRAVEL;
    const good = worst <= MAX_DRIFT && moved;
    ok &&= good;
    console.log(
      `${good ? 'PASS' : 'FAIL'} ${name.padEnd(14)} worst card-vs-hotspot gap ` +
        `${worst.toFixed(4)}px (<= ${MAX_DRIFT}); hotspot travelled ` +
        `${range[0].toFixed(1)}..${range[1].toFixed(1)}px ` +
        `(${travel.toFixed(1)}px, needs >= ${MIN_TRAVEL}) over ${series.length} frames`
    );
    if (!moved) console.log('      the hull barely moved — this measured nothing');
  }
  console.log('callout tracking:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})();
