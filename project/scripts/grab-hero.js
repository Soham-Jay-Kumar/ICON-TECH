/**
 * grab-hero.js — capture the hero's water at exact instants.
 *
 * The point is to produce frames directly comparable with the ones
 * grab-reference.js pulls out of reference-waves.mp4: same cadence, same
 * duration, same plate coordinates. Everything in scripts/ that measures the
 * reference can then be pointed at the hero unchanged.
 *
 * It does NOT screenshot the running animation. A screenshot costs the better
 * part of a second, and the surface now travels ~200 plate px/s, so real-time
 * capture samples it far below its own Nyquist rate: the first attempt at this
 * reported 44px/s for water actually moving four times that, because
 * consecutive frames had moved further than the correlation could search.
 * Instead it drives the renderer directly, one requested instant at a time,
 * through the dev-only handle hero-waves.tsx publishes.
 *
 * Two things make that handle reachable:
 *   - the worker path is disabled by removing transferControlToOffscreen before
 *     any page script runs, so the main-thread engine — which owns a renderer
 *     this process can call — takes over;
 *   - reduced motion is NOT set, because that would freeze the clock.
 *
 * The fourth argument is the instant the capture starts from, and it matters:
 * at t=0 the surface is waves.svg at rest and several modulations are still
 * fading in, so the first few seconds are a transient, not the loop. Anything
 * measuring steady state should start well clear of it.
 *
 * Usage from project/:
 *   node scripts/grab-hero.js <outdir> [seconds] [fps] [startSeconds]
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = process.argv[2];
const SECONDS = Number(process.argv[3] || 5.16667);
const FPS = Number(process.argv[4] || 24);
const START = Number(process.argv[5] || 0);

const URL = process.env.SHOOT_URL || 'http://localhost:3000';
const WIDTH = 1560;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: 1100 },
    deviceScaleFactor: 1,
  });
  // Force the main-thread engine: the worker owns its canvas outright once it
  // is transferred, and nothing outside it can ask for a particular instant.
  await page.addInitScript(() => {
    delete HTMLCanvasElement.prototype.transferControlToOffscreen;
  });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__heroWater, null, { timeout: 20000 });

  const canvas = page.locator('[data-shot="hero"] canvas');
  const poses = [];
  const n = Math.round(SECONDS * FPS);
  for (let i = 0; i < n; i++) {
    const t = START + i / FPS;
    // Draw and read back inside the page. Playwright's own screenshot goes
    // through a compositor round trip that costs the better part of a second
    // per frame here — twenty minutes for one capture — where toDataURL on a
    // canvas this size costs tens of milliseconds.
    const { pose, png } = await page.evaluate((t) => {
      const pose = window.__heroWater.draw(t);
      const c = document.querySelector('[data-shot="hero"] canvas');
      return { pose, png: c.toDataURL('image/png') };
    }, t);
    poses.push(pose);
    fs.writeFileSync(
      path.join(OUT, `f${String(i).padStart(3, '0')}.png`),
      Buffer.from(png.slice(png.indexOf(',') + 1), 'base64')
    );
  }
  const box = await canvas.boundingBox();
  fs.writeFileSync(
    path.join(OUT, 'meta.json'),
    JSON.stringify({ fps: FPS, seconds: SECONDS, start: START, frames: n, box, poses }, null, 1)
  );
  await browser.close();
  console.log(`captured ${n} frames at ${FPS}fps (${SECONDS}s from t=${START}s) to ${OUT}`);
  console.log(`canvas box ${JSON.stringify(box)}`);
})();
