/* Screenshot the CTA section at the 1440px design width, 2x scale. */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
  });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const box = await page.evaluate(() => {
    const el = document.querySelector('[data-shot="cta"]');
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, height: r.height };
  });
  console.log('section height css px:', box.height);

  await page.evaluate((top) => window.scrollTo(0, top), box.top);
  await page.waitForTimeout(100);
  await page.screenshot({
    path: '/tmp/cta-render.png',
    clip: { x: 0, y: 0, width: 1440, height: Math.min(box.height, 1000) },
  });

  const blogs = await page.evaluate(() => {
    const el = document.querySelector('[data-shot="blogs"]');
    const r = el.getBoundingClientRect();
    return { bottom: r.bottom + window.scrollY };
  });
  await page.evaluate((y) => window.scrollTo(0, y), blogs.bottom - 380);
  await page.waitForTimeout(100);
  await page.screenshot({ path: '/tmp/cta-transition.png' });

  await browser.close();
})();
