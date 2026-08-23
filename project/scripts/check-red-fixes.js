/**
 * Regression checks for the RED issues in CODE.md.
 *
 * Same ad-hoc Playwright style as shoot.js — this repo has no test runner, so
 * this drives a running dev server directly:
 *
 *   npm run dev
 *   node scripts/check-red-fixes.js
 *
 * Exits non-zero on the first failure.
 */
const { chromium } = require('playwright');

const URL = process.env.SHOOT_URL || 'http://localhost:3000';

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

/** Collects any uncaught page error, which is how an R1-style crash surfaces. */
function watchForErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/**
 * Waits for `scroll-behavior: smooth` to finish. Distance-dependent — a jump
 * to a section near the foot of the page takes well over a second — so poll
 * for a stable scrollY rather than guessing a fixed delay.
 */
async function settleScroll(page, timeout = 5000) {
  const deadline = Date.now() + timeout;
  let last = null;
  let stable = 0;
  // The hero water layer fetches and unpacks its wave field on startup; while
  // that runs the browser can sit at scrollY=0 for several hundred ms after an
  // anchor click before the smooth scroll visibly starts. Don't mistake that
  // pause for "settled": only accept a zero reading once the scroll has had
  // a fair chance to begin (a real failure never scrolls at all).
  const graceUntil = Date.now() + 2000;
  while (Date.now() < deadline) {
    const y = await page.evaluate(() => Math.round(window.scrollY));
    stable =
      y === last && (y !== 0 || Date.now() >= graceUntil) ? stable + 1 : 0;
    if (stable >= 3) return y;
    last = y;
    await page.waitForTimeout(100);
  }
  return last;
}

/**
 * Navigate, and wait until the page is actually usable.
 *
 * Deliberately NOT `waitUntil: 'networkidle'`, which these checks used until the
 * hero water moved into a Web Worker. Playwright counts the request for a
 * worker's own script as in flight for as long as the worker lives, so the home
 * page never reaches "no network for 500ms" and every check that navigated to it
 * spent its 30s timeout instead of running. `load` plus a settle is what
 * networkidle was buying here anyway.
 */
const SETTLE_MS = 600;
async function gotoReady(page, url) {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(SETTLE_MS);
}

(async () => {
  const browser = await chromium.launch();

  // ---- R1: blogs carousel survives walking `offset` negative -------------
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = watchForErrors(page);
    await gotoReady(page, URL);

    const prev = page.getByLabel('Previous articles');
    await prev.scrollIntoViewIfNeeded();
    // 8 clicks takes offset past -posts.length (5), which used to index off
    // the front of the array and throw on `post.title`.
    for (let i = 0; i < 8; i++) await prev.click();
    await page.waitForTimeout(200);

    const cardCount = await page
      .locator('#blogs a.group h3')
      .count();
    check(
      'R1 blogs: 8 back-clicks do not crash',
      errors.length === 0 && cardCount === 5,
      `errors=${errors.length} cards=${cardCount}`
    );

    const next = page.getByLabel('Next articles');
    for (let i = 0; i < 13; i++) await next.click();
    await page.waitForTimeout(200);
    const cardCountFwd = await page.locator('#blogs a.group h3').count();
    check(
      'R1 blogs: 13 forward-clicks do not crash',
      errors.length === 0 && cardCountFwd === 5,
      `errors=${errors.length} cards=${cardCountFwd}`
    );
    await page.close();
  }

  // ---- R2: form never reports success unless delivery succeeded ----------
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
    await gotoReady(page, `${URL}/schedule-demo`);

    await page.fill('#name', 'Audit Tester');
    await page.fill('#email', 'audit@example.com');
    await page.fill('#company', 'Example Shipping');
    await page.fill('#phone', '+65 6123 4567');

    const post = page.waitForResponse(
      (r) => r.url().includes('/api/demo-request') && r.request().method() === 'POST'
    );
    await page.click('button[type=submit]');
    const response = await post;
    await page.waitForTimeout(300);

    const successShown = (await page.getByText('Request received').count()) > 0;
    // Scoped to the form: Next's dev overlay also parks a role=alert node in
    // the document when a request 503s, which would otherwise match here.
    const errorShown = (await page.locator('form [role=alert]').count()) > 0;

    // With no DEMO_REQUEST_WEBHOOK_URL configured the route must refuse (503)
    // and the UI must NOT claim the request was received.
    check(
      'R2 form: submission is actually POSTed to the API',
      [200, 502, 503].includes(response.status()),
      `status=${response.status()}`
    );
    check(
      'R2 form: no false success when delivery fails',
      response.status() === 200 ? successShown : !successShown && errorShown,
      `status=${response.status()} success=${successShown} error=${errorShown}`
    );
    await page.close();
  }

  // ---- R3 / R4: mobile hero + navbar geometry ----------------------------
  {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await gotoReady(page, URL);
    await page.evaluate(() => document.fonts.ready);

    const geo = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const cs = getComputedStyle(h1);
      const logo = document.querySelector('header img');
      const header = document.querySelector('header');
      return {
        fontSize: parseFloat(cs.fontSize),
        lineHeight: parseFloat(cs.lineHeight),
        logoHeight: logo.getBoundingClientRect().height,
        headerBottom: header.getBoundingClientRect().bottom,
        h1Top: h1.getBoundingClientRect().top,
      };
    });

    check(
      'R3 hero: leading is not smaller than the type',
      geo.lineHeight >= geo.fontSize,
      `font=${geo.fontSize.toFixed(1)}px leading=${geo.lineHeight.toFixed(1)}px`
    );
    check(
      'R4 navbar: logo is legible at 375px',
      geo.logoHeight >= 28,
      `logo=${geo.logoHeight.toFixed(1)}px`
    );
    check(
      'R4 hero: h1 clears the fixed navbar',
      geo.h1Top >= geo.headerBottom,
      `h1Top=${geo.h1Top.toFixed(1)}px headerBottom=${geo.headerBottom.toFixed(1)}px`
    );
    await page.close();
  }

  // ---- R5: section links work from /schedule-demo ------------------------
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await gotoReady(page, `${URL}/schedule-demo`);

    const hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('header nav a'))
        .map((a) => a.getAttribute('href'))
        .filter(Boolean)
    );
    const bare = hrefs.filter((h) => h.startsWith('#'));
    check(
      'R5 navbar: no route-relative fragment hrefs',
      bare.length === 0,
      `hrefs=${JSON.stringify(hrefs)}`
    );

    await page.getByRole('link', { name: 'Products', exact: true }).first().click();
    await page.waitForURL(/\/#products$/, { timeout: 5000 }).catch(() => {});
    await settleScroll(page);

    const landed = await page.evaluate(() => {
      const el = document.querySelector('#products');
      return {
        path: location.pathname,
        hash: location.hash,
        exists: !!el,
        top: el ? el.getBoundingClientRect().top : null,
      };
    });
    check(
      'R5 navbar: Products from /schedule-demo lands on the home section',
      landed.path === '/' && landed.exists && Math.abs(landed.top) < 150,
      JSON.stringify(landed)
    );

    await page.close();

    // And the same link must scroll on the *first* click after a fresh load
    // of the home page — a separate page context, because this is exactly the
    // case the App Router used to leave unscrolled.
    const fresh = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await gotoReady(fresh, URL);
    await fresh.getByRole('link', { name: 'Team', exact: true }).first().click();
    await settleScroll(fresh);
    const samePage = await fresh.evaluate(() => {
      const el = document.querySelector('#team');
      return { top: el ? el.getBoundingClientRect().top : null, y: window.scrollY };
    });
    check(
      'R5 navbar: first hash click after a fresh / load scrolls',
      samePage.top !== null && Math.abs(samePage.top) < 150 && samePage.y > 0,
      JSON.stringify(samePage)
    );
    await fresh.close();
  }

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})();
