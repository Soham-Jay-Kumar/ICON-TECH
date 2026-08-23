const { chromium } = require('playwright');

const WIDTH = 1560;
const URL = process.env.SHOOT_URL || 'http://localhost:3000';
const OUT = process.env.SHOOT_OUT || 'shots';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: 1100 },
    deviceScaleFactor: 1,
  });

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(800); // the hero worker keeps networkidle from firing
  await page.evaluate(() => document.fonts.ready);

  const fs = require('fs');
  fs.mkdirSync(OUT, { recursive: true });

  await page.screenshot({ path: `${OUT}/full.png`, fullPage: true });

  const targets = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-shot]')).map((el) => ({
      name: el.getAttribute('data-shot'),
    }))
  );

  for (const { name } of targets) {
    await page
      .locator(`[data-shot="${name}"]`)
      .screenshot({ path: `${OUT}/${name}.png` });
  }

  const height = await page.evaluate(() => document.body.scrollHeight);
  console.log(`captured ${targets.length} sections, page height ${height}px`);
  console.log(targets.map((t) => t.name).join(', '));

  await browser.close();
})();
