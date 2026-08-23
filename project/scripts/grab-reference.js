/**
 * grab-reference.js — extract every frame of reference-waves.mp4 as a PNG.
 *
 * There is no ffmpeg on this machine and Playwright's bundled build is
 * encode-only, so the decoder we have is Chromium's. Seeking a <video> and
 * screenshotting it is exact as long as we land unambiguously inside a frame's
 * presentation interval, which is why each seek targets the MIDDLE of the
 * frame rather than its boundary: the container says 124 samples of 512 ticks
 * at timescale 12288, i.e. 24.000fps dead on, so frame i covers
 * [i/24, (i+1)/24) and i/24 alone sits exactly on a boundary where rounding can
 * hand back either neighbour.
 *
 * Usage from project/:
 *   node scripts/grab-reference.js <video> <outdir> [everyNth]
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SRC = process.argv[2];
const OUT = process.argv[3];
const EVERY = Number(process.argv[4] || 1);

/** From the mp4 container, not guessed. */
const FPS = 24;
const FRAMES = 124;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  // The player page is written next to the video and loaded over file://.
  // An about:blank document cannot load a file:// resource at all — Chromium
  // refuses it as "Not allowed to load local resource", the <video> never
  // errors, and the wait for loadeddata simply hangs. A file:// document can.
  const stage = path.join(OUT, '_player.html');
  fs.writeFileSync(
    stage,
    `<body style="margin:0;background:#000">
       <video id="v" src="${path.relative(OUT, SRC).split(path.sep).join('/')}"
              muted preload="auto" style="display:block"></video></body>`
  );
  await page.goto('file://' + stage);

  const meta = await page.evaluate(
    () =>
      new Promise((res) => {
        const v = document.getElementById('v');
        const done = () => res({ w: v.videoWidth, h: v.videoHeight, d: v.duration });
        if (v.readyState >= 2) return done();
        v.onloadeddata = done;
        v.onerror = () => res({ err: String(v.error && v.error.code) });
        setTimeout(() => res({ err: 'timeout waiting for loadeddata' }), 20000);
      })
  );
  if (meta.err) throw new Error('decode failed: ' + meta.err);
  console.log('video', JSON.stringify(meta));

  // Native pixels: no CSS scaling between the decoder and the screenshot.
  await page.evaluate(
    ([w, h]) => {
      const v = document.getElementById('v');
      v.style.width = w + 'px';
      v.style.height = h + 'px';
    },
    [meta.w, meta.h]
  );
  await page.setViewportSize({ width: meta.w, height: meta.h });

  const el = page.locator('#v');
  for (let i = 0; i < FRAMES; i += EVERY) {
    const t = (i + 0.5) / FPS;
    const landed = await page.evaluate(
      (t) =>
        new Promise((res) => {
          const v = document.getElementById('v');
          v.onseeked = () => res(v.currentTime);
          v.currentTime = t;
          setTimeout(() => res(v.currentTime), 5000);
        }),
      t
    );
    // Which frame the decoder actually presented, so a silent off-by-one in
    // the seek shows up in the log rather than in the measurements.
    const got = Math.floor(landed * FPS + 1e-6);
    if (got !== i) console.log(`  ! frame ${i}: landed on ${got} (t=${landed})`);
    await el.screenshot({ path: path.join(OUT, `f${String(i).padStart(3, '0')}.png`) });
  }
  await browser.close();
  console.log('captured', Math.ceil(FRAMES / EVERY), 'frames to', OUT);
})();
