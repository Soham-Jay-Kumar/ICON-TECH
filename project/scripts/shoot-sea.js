/**
 * shoot-sea.js — capture the hero's water over time, for judging the animation
 * rather than a single frame.
 *
 * The water's clock is elapsed real seconds inside the page, so this simply
 * waits: `SEA_TIMES` is a comma-separated list of seconds after the water
 * starts, and each one produces shots/sea-t<seconds>.png (the hero section) and
 * shots/sea-hull-t<seconds>.png (the waterline at 2x, where a halo would show).
 *
 * Usage from project/:
 *   node scripts/shoot-sea.js                     # 0,3,8,15,30
 *   SEA_TIMES=0,60,180 node scripts/shoot-sea.js  # long-run stability
 *   SEA_OUT=shots/run2 node scripts/shoot-sea.js
 */
const { chromium } = require('playwright');
const fs = require('fs');

const WIDTH = 1560;
const URL = process.env.SHOOT_URL || 'http://localhost:3000';
const OUT = process.env.SEA_OUT || 'shots';
const TIMES = (process.env.SEA_TIMES || '0,3,8,15,30')
  .split(',')
  .map((s) => Number(s.trim()))
  .sort((a, b) => a - b);

/** The hull's waterline in plate px, for the 2x crop — where a halo shows. */
const HULL = { x: 470, y: 455, w: 640, h: 175 };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: 1100 },
    deviceScaleFactor: 2,
  });

  page.on('console', (m) => {
    if (m.type() === 'error') console.log('  [console]', m.text());
  });
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // Don't start the clock until the water is actually running, or the early
  // frames are all of a canvas that has not drawn yet.
  await page.waitForFunction(
    () => document.querySelector('canvas[data-flowing]')?.dataset.flowing === 'true',
    null,
    { timeout: 15000 }
  );

  // The plate, not the ship: the ship layer is the one with an empty alt.
  const plate = page.locator('[data-shot="hero"] img[alt^="Cargo"]').first();
  const box = await plate.boundingBox();
  const scale = box.width / 1560; // plate px -> CSS px

  let waited = 0;
  for (const t of TIMES) {
    if (t > waited) {
      await page.waitForTimeout((t - waited) * 1000);
      waited = t;
    }
    const tag = String(t).replace('.', '_');
    await page
      .locator('[data-shot="hero"]')
      .screenshot({ path: `${OUT}/sea-t${tag}.png` });
    await page.screenshot({
      path: `${OUT}/sea-hull-t${tag}.png`,
      clip: {
        x: box.x + HULL.x * scale,
        y: box.y + HULL.y * scale,
        width: HULL.w * scale,
        height: HULL.h * scale,
      },
    });
    process.stdout.write(`t=${t}s `);
  }

  await browser.close();
  console.log(`\ncaptured ${TIMES.length} frames into ${OUT}/`);
})();
