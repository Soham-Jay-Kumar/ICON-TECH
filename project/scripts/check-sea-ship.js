/**
 * check-sea-ship.js — measure the hull's bob, and whether it is the water's.
 *
 * The ship must move, subtly, and it must move because of the surface under it
 * rather than on a loop of its own. So this reads the transform <HeroSea> writes
 * on the ship layer over a long run and reports:
 *
 *   - the travel, in plate px and degrees, against the limits below;
 *   - that it is a smooth, continuous ride: no step between consecutive samples
 *     larger than JUMP_MAX px, which is what a scripted bounce or a snapping
 *     keyframe would produce;
 *   - that it is actually varying rather than parked.
 *
 * Reading the transform rather than the pixels is deliberate: it is the same
 * number the renderer took off its own advected contour, so if this moves, the
 * hull is riding the water that is on screen.
 *
 * Usage from project/:  node scripts/check-sea-ship.js
 */
const { chromium } = require('playwright');

const WIDTH = 1560;
const URL = process.env.SHOOT_URL || 'http://localhost:3000';
const SAMPLES = Number(process.env.SHIP_SAMPLES || 240);
const STEP = Number(process.env.SHIP_STEP || 0.1);

/**
 * Runs on the real GPU by default (SHIP_HEADLESS=1 to override). Headless
 * rasterises this canvas in software and redraws it about once a second, so the
 * pose barely updates and the ride cannot be judged. See check-sea-flow.js.
 */
const HEADLESS = process.env.SHIP_HEADLESS === '1';

/** Height of the whole plate in reference px, the space the limits are in. */
const PLATE_H = 630;

/**
 * SHIP_RECT in hero-water-geometry.ts, which must match what
 * build-hero-masks.py actually wrote. A stale value here scales the hull
 * against the water it is meant to be sitting in, by a margin small enough to
 * miss by eye.
 */
const SHIP_RECT = { x0: 533, y0: 2, x1: 1040, y1: 593 };

/**
 * Bounds on the bob, in plate px peak to peak.
 *
 * Centred on the reference rather than on taste: tracking the hull through all
 * 124 frames of reference-waves.mp4 (scripts/measure-bob.py) gives 40.5 video
 * px, which is 34.9 plate px by the page's width — and the camera under it is
 * steady to within 0.02px, so that is all ship. The window either side is the
 * slack the swell needs, not licence to drift.
 */
const TRAVEL_MIN = 26;
const TRAVEL_MAX = 44;
const ROLL_MAX = 1.0;

/**
 * Smoothness, as the ratio of the largest change in the pose to the 95th
 * percentile of them.
 *
 * Not an absolute cap: a smooth ride of amplitude A and period T changes by up
 * to pi*A*dt/T between frames, so a cap would only be measuring the amplitude
 * again. What a scripted bounce or a snapping keyframe leaves is one change far
 * out of line with its neighbours, which is what this looks for.
 *
 * Consecutive identical readings are dropped first. The renderer redraws at
 * whatever rate the machine allows — 23fps on a GPU, a few fps under headless
 * software rasterisation — and sampling faster than it draws otherwise reports
 * a staircase of zeroes and one real step as a huge ratio. Dropping the repeats
 * measures the pose's own trajectory instead of the sampling grid.
 */
const JUMP_RATIO = 3.0;

(async () => {
  const browser = await chromium.launch({ headless: HEADLESS });
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: 1100 },
    deviceScaleFactor: 1,
  });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelector('canvas[data-flowing]')?.dataset.flowing === 'true',
    null,
    { timeout: 15000 }
  );

  const { series, plateCssH, natural } = await page.evaluate(
    async ([n, stepMs]) => {
      const el = document.querySelector('[data-shot="hero"] [data-hero-ship]');
      const plate = document.querySelector('[data-shot="hero"] img[alt^="Cargo"]');
      const out = [];
      for (let i = 0; i < n; i++) {
        out.push(getComputedStyle(el).transform);
        await new Promise((r) => setTimeout(r, stepMs));
      }
      return {
        series: out,
        plateCssH: plate.getBoundingClientRect().height,
        natural: [el.naturalWidth, el.naturalHeight],
      };
    },
    [SAMPLES, STEP * 1000]
  );
  await browser.close();

  // matrix(a, b, c, d, tx, ty) — ty is in px of the laid-out layer, and the
  // rotation falls out of a and b.
  const dy = [];
  const roll = [];
  for (const t of series) {
    const m = /matrix\(([^)]+)\)/.exec(t);
    if (!m) {
      dy.push(0);
      roll.push(0);
      continue;
    }
    const v = m[1].split(',').map(Number);
    dy.push(v[5]);
    roll.push((Math.atan2(v[1], v[0]) * 180) / Math.PI);
  }

  // The transform's ty is in laid-out CSS px; convert to plate px so the limits
  // above mean what they say whatever width the page was measured at.
  const toPlate = PLATE_H / plateCssH;
  const inPlate = dy.map((v) => v * toPlate);

  const span = (a) => Math.max(...a) - Math.min(...a);
  const travel = span(inPlate);
  const rollSpan = span(roll);
  // One reading per redraw, not per sample.
  const distinct = inPlate.filter((v, i) => i === 0 || v !== inPlate[i - 1]);
  const steps = [];
  for (let i = 1; i < distinct.length; i++) {
    steps.push(Math.abs(distinct[i] - distinct[i - 1]));
  }
  const sorted = [...steps].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 1e-6;
  const jump = sorted[sorted.length - 1];
  const ratio = jump / p95;

  const wantW = SHIP_RECT.x1 - SHIP_RECT.x0;
  const wantH = SHIP_RECT.y1 - SHIP_RECT.y0;

  const checks = [
    [
      'box matches the cutout',
      natural[0] === wantW && natural[1] === wantH,
      `hero-ship.png is ${natural[0]}x${natural[1]}, SHIP_RECT says ` +
        `${wantW}x${wantH}`,
    ],
    ['moves at all', travel >= TRAVEL_MIN, `${travel.toFixed(2)}px >= ${TRAVEL_MIN}`],
    ['stays subtle', travel <= TRAVEL_MAX, `${travel.toFixed(2)}px <= ${TRAVEL_MAX}`],
    ['roll subtle', rollSpan <= ROLL_MAX, `${rollSpan.toFixed(3)}deg <= ${ROLL_MAX}`],
    [
      'rides smoothly',
      ratio <= JUMP_RATIO,
      `largest step ${jump.toFixed(3)}px is ${ratio.toFixed(2)}x the 95th ` +
        `percentile (<= ${JUMP_RATIO})`,
    ],
  ];
  let ok = true;
  for (const [name, pass, detail] of checks) {
    ok &&= pass;
    console.log(`${pass ? 'PASS' : 'FAIL'} ship ${name}: ${detail}`);
  }
  console.log(
    `      over ${(SAMPLES * STEP).toFixed(0)}s, ${SAMPLES} samples, ` +
      `${distinct.length} distinct redraws; ` +
      `bob ${Math.min(...inPlate).toFixed(2)}..${Math.max(...inPlate).toFixed(2)}px`
  );
  console.log('ship pose:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})();
