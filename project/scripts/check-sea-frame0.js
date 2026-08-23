/**
 * check-sea-frame0.js — assert the animated water is waves.svg.
 *
 * The whole premise of hero-water-flow.ts is that it redraws the artwork's own
 * marks rather than a lookalike sea, so the test is the obvious one: render
 * ../waves.svg in the same browser at the same width, freeze the hero's water at
 * frame zero (prefers-reduced-motion, where the clock never starts), and compare
 * the two.
 *
 * They will not be identical — the canvas paints over the plate's white page and
 * the SVG over nothing, and the two rasterisers differ — so this reports the
 * correlation of the two water bands and their mean absolute difference, and
 * fails only if the surface has genuinely stopped being waves.svg.
 *
 * Usage from project/ (needs a running server, and Pillow + numpy):
 *   node scripts/check-sea-frame0.js
 */
const { chromium } = require('playwright');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const WIDTH = 1560;
const URL = process.env.SHOOT_URL || 'http://localhost:3000';
const SVG = path.resolve(__dirname, '..', '..', 'waves.svg');

/** waves.svg's viewBox, and where it lands on the plate. */
const VIEW = { w: 1560, h: 360 };
const BAND_TOP = 690 - 392;

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sea-frame0-'));
  const browser = await chromium.launch();

  // ---- the artwork itself
  // Both sides at 1x, in the artwork's own pixels. 2x sounds better and is
  // worse: the lattice is a regular grid, so at that pitch the correlation
  // starts matching dots against their neighbours and a deliberately misaligned
  // control scores higher than the real comparison.
  const svg = await browser.newPage({
    viewport: { width: VIEW.w, height: VIEW.h },
    deviceScaleFactor: 1,
  });
  // Inlined rather than linked: a page built with setContent has an about:blank
  // origin and cannot pull in a file:// image, and a bare SVG document has no
  // <head> to size and background it. The markup is ~1MB, which the browser
  // takes in its stride.
  await svg.setContent(
    `<body style="margin:0;background:#fff">${fs.readFileSync(SVG, 'utf8')}</body>`
  );
  await svg.evaluate(
    ([w, h]) => {
      const el = document.querySelector('svg');
      el.setAttribute('width', w);
      el.setAttribute('height', h);
      el.style.display = 'block';
    },
    [VIEW.w, VIEW.h]
  );
  await svg.screenshot({ path: path.join(dir, 'svg.png') });
  await svg.close();

  // ---- the hero, frozen
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: 1100 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // The canvas draws frame zero as soon as the field lands, then never again.
  await page.waitForFunction(
    () => document.querySelector('canvas[data-flowing]')?.dataset.flowing === 'false',
    null,
    { timeout: 15000 }
  );
  await page.waitForTimeout(1200);

  const plate = page.locator('[data-shot="hero"] img[alt^="Cargo"]').first();
  const box = await plate.boundingBox();
  const scale = box.width / 1560;
  await page.screenshot({
    path: path.join(dir, 'hero.png'),
    clip: {
      x: box.x,
      y: box.y + BAND_TOP * scale,
      width: 1560 * scale,
      height: (630 - BAND_TOP) * scale,
    },
  });
  await browser.close();

  const r = spawnSync('python3', ['scripts/check-sea-frame0.py', dir], {
    stdio: 'inherit',
  });
  if (process.env.SEA_KEEP) console.log('kept', dir);
  else fs.rmSync(dir, { recursive: true, force: true });
  process.exit(r.status === null ? 1 : r.status);
})();
