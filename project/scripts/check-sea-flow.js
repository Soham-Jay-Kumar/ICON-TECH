/**
 * check-sea-flow.js — assert the hero's water never turns round.
 *
 * The hero once carried its ocean as a ping-pong looped video clip, so the
 * surface ran outward for five seconds and then back inward for five. Nothing
 * about a single screenshot catches that; you have to watch the thing move. So
 * this samples two strips of open water — one to port of the bow, one to
 * starboard — over a long run, and hands them to check-sea-flow.py, which
 * cross-correlates consecutive frames and reports the sign of the travel.
 *
 * Passes when every measured step on each side carries the same sign, and that
 * sign points away from the ship.
 *
 * It does NOT screenshot the running animation, and that is the whole design.
 * A Playwright screenshot of this page costs the better part of a second, and
 * the surface travels ~200 plate px/s, so consecutive shots are further apart
 * than the correlation can search: run that way it reported 44px/s for water
 * moving four times that, which is an aliased reading dressed up as a
 * measurement. Instead it drives the renderer to exact instants through the
 * dev-only handle hero-waves.tsx publishes, and reads the canvas back in the
 * page. The clock is ours, so the step is exact and the whole check takes
 * seconds instead of minutes.
 *
 * Two consequences worth knowing:
 *   - it runs the main-thread engine, not the worker (nothing outside a worker
 *     can ask its canvas for a chosen instant). check-orange-fixes.js O11 is
 *     what still exercises the worker path.
 *   - it needs a dev server. `process.env.NODE_ENV !== 'production'` compiles
 *     the handle out of a production build.
 *
 * Usage from project/ (needs a running dev server, and Pillow + numpy):
 *   node scripts/check-sea-flow.js
 *   SEA_FRAMES=120 SEA_STEP=0.1 node scripts/check-sea-flow.js
 */
const { chromium } = require('playwright');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const WIDTH = 1560;
const URL = process.env.SHOOT_URL || 'http://localhost:3000';
const FRAMES = Number(process.env.SEA_FRAMES || 48);
/**
 * Seconds of water time between captures.
 *
 * Short because the water is fast: at the reference's speed the near surface
 * crosses ~200 plate px every second, and a step that lets it move much more
 * than a third of a strip's width leaves too little overlap to correlate — and
 * pushes the shift past check-sea-flow.py's MAX_SHIFT, where the measurement
 * starts reporting the ceiling instead of the speed. Now that the clock is
 * driven rather than waited on, this costs nothing to shorten.
 */
const STEP = Number(process.env.SEA_STEP || 0.1);
/**
 * Water time the run starts from.
 *
 * Not a wait for the page any more — the capture asks for an instant, so the
 * page's own reveal and the field fetch are already behind it. It exists
 * because t=0 is waves.svg at rest with several modulations still fading in,
 * and a check of the loop should be looking at the loop, not at the transient
 * on the way into it.
 */
const SETTLE = Number(process.env.SEA_SETTLE || 20);

/**
 * Headless is now the default, and correct.
 *
 * It used to be wrong: the check waited on the compositor, and headless
 * Chromium rasterises this canvas in software slowly enough that two captures
 * routinely caught the same rendered frame, so the speeds were meaningless
 * (direction still read correctly). Driving the clock removes the dependency
 * entirely — the renderer is asked for instant t and answers with instant t,
 * as fast or as slow as the machine happens to be. SEA_HEADED=1 to watch it.
 */
const HEADLESS = process.env.SEA_HEADED !== '1';

/**
 * Windows of open water in plate px, clear of the hull, the callout labels and
 * the foreground dissolve.
 *
 * Two depths on each side, because they are two different questions. The near
 * pair asks whether the water travels outward at all. The far pair asks whether
 * the horizon is alive: perspective makes far water cross fewer px for the same
 * world speed, and applied raw it left the back of the sea looking like a
 * static band behind moving water. Their reported px/s is the number to watch —
 * the far strips should be lively, not merely non-zero.
 */
const STRIPS = {
  port: { x: 90, y: 470, w: 340, h: 90 },
  starboard: { x: 1130, y: 470, w: 340, h: 90 },
  'port-far': { x: 60, y: 356, w: 340, h: 44 },
  'starboard-far': { x: 1150, y: 356, w: 340, h: 44 },
};

/** The slab of plate captured each frame — every strip above lives in here. */
const BAND = { y: 340, h: 230 };

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sea-flow-'));
  const browser = await chromium.launch({ headless: HEADLESS });
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: 1100 },
    deviceScaleFactor: 1,
  });
  // Force the main-thread engine: a worker owns its canvas outright once it is
  // transferred, and nothing outside it can ask for a particular instant.
  await page.addInitScript(() => {
    delete HTMLCanvasElement.prototype.transferControlToOffscreen;
  });

  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => window.__heroWater, null, { timeout: 20000 });

  // The canvas is WATER_VIEW — plate y 298..658 across the full 1560 — so the
  // band is a crop of it, and one plate px is one canvas px at this width.
  const VIEW_Y = 298;
  const stamps = [];
  for (let i = 0; i < FRAMES; i++) {
    const t = SETTLE + i * STEP;
    stamps.push(Math.round(t * 1000));
    const png = await page.evaluate(
      ([t, y, h]) => {
        window.__heroWater.draw(t);
        const c = document.querySelector('[data-shot="hero"] canvas');
        const cut = document.createElement('canvas');
        cut.width = c.width;
        cut.height = Math.round((h * c.height) / 360);
        cut
          .getContext('2d')
          .drawImage(c, 0, Math.round((y * c.height) / 360), c.width, cut.height,
                     0, 0, cut.width, cut.height);
        return cut.toDataURL('image/png');
      },
      [t, BAND.y - VIEW_Y, BAND.h]
    );
    fs.writeFileSync(
      path.join(dir, `band-${String(i).padStart(3, '0')}.png`),
      Buffer.from(png.slice(png.indexOf(',') + 1), 'base64')
    );
  }
  const scale = (await page.evaluate(
    () => document.querySelector('[data-shot="hero"] canvas').width
  )) / 1560;
  await browser.close();

  fs.writeFileSync(
    path.join(dir, 'meta.json'),
    JSON.stringify({ stamps, strips: STRIPS, band: BAND, scale })
  );
  const r = spawnSync('python3', ['scripts/check-sea-flow.py', dir], {
    stdio: 'inherit',
  });
  fs.rmSync(dir, { recursive: true, force: true });
  process.exit(r.status === null ? 1 : r.status);
})();
