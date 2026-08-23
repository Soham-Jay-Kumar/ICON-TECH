/**
 * Regression checks for the ORANGE issues in CODE.md.
 *
 * Companion to check-red-fixes.js, same ad-hoc Playwright style (this repo has
 * no test runner), driving a running server:
 *
 *   npm run dev            # or: npm run build && npm start
 *   node scripts/check-orange-fixes.js
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

async function settleScroll(page, timeout = 5000) {
  const deadline = Date.now() + timeout;
  let last = null;
  let stable = 0;
  while (Date.now() < deadline) {
    const y = await page.evaluate(() => Math.round(window.scrollY));
    stable = y === last ? stable + 1 : 0;
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

  // ---- O1: container keeps a gutter at every width ----------------------
  {
    const page = await browser.newPage({ viewport: { width: 1560, height: 900 } });
    await gotoReady(page, URL);

    const rows = [];
    for (const width of [1560, 1400, 1296, 1200, 1100, 1024, 900, 375]) {
      await page.setViewportSize({ width, height: 900 });
      rows.push({
        width,
        ...(await page.evaluate(() => {
          const c = document.querySelector('.container-site');
          const r = c.getBoundingClientRect();
          const cs = getComputedStyle(c);
          const padL = parseFloat(cs.paddingLeft);
          return {
            gutter: Math.round(r.left + padL),
            content: Math.round(r.width - padL - parseFloat(cs.paddingRight)),
          };
        })),
      });
    }
    const noGutter = rows.filter((r) => r.gutter < 16);
    check(
      'O1 container: never runs flush to the viewport edge',
      noGutter.length === 0,
      noGutter.length ? JSON.stringify(noGutter) : 'min gutter 20px'
    );
    // The reference column must survive the change.
    const wide = rows.find((r) => r.width === 1560);
    check(
      'O1 container: reference width still resolves to a 1296px column',
      wide.content === 1296,
      `content=${wide.content}px gutter=${wide.gutter}px`
    );
    await page.close();
  }

  // ---- O2: anchor targets clear the fixed navbar ------------------------
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await gotoReady(page, URL);
    await page.getByRole('link', { name: 'Products', exact: true }).first().click();
    await settleScroll(page);
    const g = await page.evaluate(() => {
      const s = document.querySelector('#products');
      return {
        sectionTop: Math.round(s.getBoundingClientRect().top),
        headerBottom: Math.round(document.querySelector('header').getBoundingClientRect().bottom),
      };
    });
    check(
      'O2 anchors: section lands below the fixed navbar',
      g.sectionTop >= g.headerBottom,
      `sectionTop=${g.sectionTop} headerBottom=${g.headerBottom}`
    );
    await page.close();
  }

  // ---- O3 / O6 / O12: CTA target, active state, LCP hints ---------------
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await gotoReady(page, URL);

    const ctaHref = await page.evaluate(() => {
      // The CTA band's button (the navbar pill carries the same copy and the
      // same destination; scoping keeps this assert about the section itself).
      const scope = document.querySelector('[data-shot="cta"]');
      const a = Array.from((scope || document).querySelectorAll('a')).find(
        (el) => el.textContent.trim().toLowerCase() === 'schedule a demo'
      );
      return a ? a.getAttribute('href') : null;
    });
    check('O3 cta: "Schedule a Demo" points at the demo page', ctaHref === '/schedule-demo', `href=${ctaHref}`);

    const lcp = await page.evaluate(() => ({
      heroFetchPriority: document
        .querySelector('img[src*="hero-ocean"]')
        ?.getAttribute('fetchpriority'),
      ctaPreloaded: !!document.querySelector('link[rel=preload][href*="cta-dashboard"]'),
    }));
    check(
      'O12 lcp: hero prioritised, footer image not preloaded',
      lcp.heroFetchPriority === 'high' && !lcp.ctaPreloaded,
      JSON.stringify(lcp)
    );

    const homeCurrent = await page.evaluate(() =>
      Array.from(document.querySelectorAll('header a[aria-current="page"]')).map((a) =>
        a.textContent.trim()
      )
    );
    check(
      'O6 navbar: Home marked current on /',
      homeCurrent.includes('Home'),
      JSON.stringify(homeCurrent)
    );

    await gotoReady(page, `${URL}/schedule-demo`);
    const demoCurrent = await page.evaluate(() =>
      Array.from(document.querySelectorAll('header a[aria-current="page"]')).map((a) =>
        a.textContent.trim()
      )
    );
    check(
      'O6 navbar: nothing marked current on /schedule-demo',
      demoCurrent.length === 0,
      JSON.stringify(demoCurrent)
    );

    // O7: the consent line must not carry dead anchors.
    const deadConsentLinks = await page.evaluate(
      () => document.querySelectorAll('form a[href="#"]').length
    );
    check('O7 form: no dead links on the consent line', deadConsentLinks === 0, `count=${deadConsentLinks}`);
    await page.close();
  }

  // ---- O4: metadata, favicon, robots, sitemap ---------------------------
  {
    const page = await browser.newPage();
    await gotoReady(page, URL);
    const meta = await page.evaluate(() => ({
      og: document.querySelector('meta[property="og:image"]')?.content,
      tw: document.querySelector('meta[name="twitter:image"]')?.content,
      icon: document.querySelector('link[rel~="icon"]')?.getAttribute('href'),
    }));
    check(
      'O4 metadata: no bolt.new placeholder, absolute OG image',
      !!meta.og && !meta.og.includes('bolt.new') && /^https?:\/\//.test(meta.og),
      JSON.stringify(meta)
    );
    check('O4 metadata: favicon present', !!meta.icon, `icon=${meta.icon}`);

    for (const [path, needle] of [
      ['/robots.txt', 'Sitemap:'],
      ['/sitemap.xml', '<urlset'],
    ]) {
      const res = await page.request.get(`${URL}${path}`);
      const body = await res.text();
      check(
        `O4 ${path} served`,
        res.status() === 200 && body.includes(needle),
        `status=${res.status()}`
      );
    }
    await page.close();
  }

  // ---- O5: footer is machine-readable ------------------------------------
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await gotoReady(page, URL);
    const f = await page.evaluate(() => {
      const img = document.querySelector('img[src*="footer-panel"]');
      const addr = document.querySelector('footer address');
      const links = Array.from(document.querySelectorAll('footer a'));
      return {
        altIsEmpty: img?.getAttribute('alt') === '',
        addressText: addr ? addr.textContent.replace(/\s+/g, ' ').trim() : null,
        linksWithoutText: links.filter((a) => !a.textContent.trim()).length,
        linkCount: links.length,
      };
    });
    check(
      'O5 footer: panel image is decorative, address is real text',
      f.altIsEmpty && !!f.addressText && /Dwarka/.test(f.addressText),
      `alt=""? ${f.altIsEmpty}; address=${(f.addressText || '').slice(0, 48)}...`
    );
    check(
      'O5 footer: every hit-area link has accessible text',
      f.linkCount > 0 && f.linksWithoutText === 0,
      `${f.linkCount} links, ${f.linksWithoutText} empty`
    );

    // O13: the year must be the real current year, not the build year.
    const yearOk = await page.evaluate(
      () => document.querySelector('footer p')?.textContent.includes(String(new Date().getFullYear()))
    );
    check('O13 footer: copyright shows the current year', !!yearOk);
    await page.close();
  }

  // ---- O8 / O9: mobile decoration does not land on the copy -------------
  {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await gotoReady(page, URL);
    const mobile = await page.evaluate(() => {
      const vis = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        return getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
      };
      return {
        glyphVisible: vis('[data-shot="vision-mission"] svg.animate-target-pulse')
          || vis('[data-shot="vision-mission"] img.animate-glyph-tick'),
        calloutVisible: !!Array.from(document.querySelectorAll('span')).find(
          (s) =>
            s.textContent.trim() === 'Fuel Anomaly Detected' &&
            getComputedStyle(s).display !== 'none' &&
            s.getBoundingClientRect().width > 0
        ),
      };
    });
    check('O8 vision/mission: glyph not drawn over the copy on mobile', mobile.glyphVisible !== true, JSON.stringify(mobile));
    check('O9 hero: illegible callouts not rendered on mobile', mobile.calloutVisible === false);

    // No horizontal overflow anywhere on a phone.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    check('O8/O9 mobile: no horizontal overflow', overflow <= 1, `overflowX=${overflow}px`);
    await page.close();
  }

  // O9 at md: callouts return, and are legible.
  {
    const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
    await gotoReady(page, URL);
    const c = await page.evaluate(() => {
      const s = Array.from(document.querySelectorAll('span')).find(
        (el) => el.textContent.trim() === 'Fuel Anomaly Detected'
      );
      if (!s) return null;
      const r = s.getBoundingClientRect();
      return { fontSize: parseFloat(getComputedStyle(s).fontSize), right: Math.round(r.right), vw: window.innerWidth };
    });
    check(
      'O9 hero: callouts legible and inside the frame at md',
      c && c.fontSize >= 11 && c.right <= c.vw,
      JSON.stringify(c)
    );
    await page.close();
  }

  // ---- O10: reveal survives a failed hydration ---------------------------
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await gotoReady(page, URL);
    // Hydration lands a beat after networkidle (noticeably so against a dev
    // server), and it must land well inside the watchdog's 4s window.
    const hydrated = await page
      .waitForFunction(() => document.documentElement.hasAttribute('data-hydrated'), null, {
        timeout: 4000,
      })
      .then(() => true)
      .catch(() => false);
    check('O10 reveal: hydration stamps data-hydrated inside the watchdog window', hydrated === true);

    // Block only the app chunks, so React can never hydrate while the HTML
    // document itself still streams to completion — aborting every *.js also
    // kills the dev server's HMR client, which truncates the stream and would
    // leave nothing to assert against. Then confirm the watchdog withdraws
    // `js` and content ends up visible rather than at opacity:0 forever.
    const blocked = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await blocked.route('**/_next/static/chunks/**', (route) => route.abort());
    await blocked.goto(URL, { waitUntil: 'load' }).catch(() => {});
    await blocked.waitForTimeout(5200);
    const fallback = await blocked.evaluate(() => {
      // Reveal's own wrapper: the element carrying the transition + duration
      // token, which is what the `[.js_&]` hidden state applies to.
      const wrappers = Array.from(
        document.querySelectorAll('[class*="duration-reveal"], [class*="duration-hero"]')
      );
      return {
        js: document.documentElement.classList.contains('js'),
        hydrated: document.documentElement.hasAttribute('data-hydrated'),
        wrappers: wrappers.length,
        hidden: wrappers.filter((el) => getComputedStyle(el).opacity !== '1').length,
      };
    });
    check(
      'O10 reveal: content becomes visible when hydration never happens',
      fallback.js === false &&
        fallback.hydrated === false &&
        fallback.wrappers > 0 &&
        fallback.hidden === 0,
      JSON.stringify(fallback)
    );
    await blocked.close();
    await page.close();
  }

  // ---- O11: ambient animations pause off-screen -------------------------
  // The hero water is a canvas redrawn on its own rAF loop, so it is paused by
  // stopping that loop rather than by the CSS `.anim-paused` class the other
  // ambient loops use. HeroWaves publishes the clock's state as data-flowing.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await gotoReady(page, URL);
    await page.waitForTimeout(400);

    const heroWaterPaused = () =>
      page.evaluate(() => {
        const c = document.querySelector('canvas[data-flowing]');
        return c ? c.dataset.flowing === 'false' : null;
      });

    const near = await heroWaterPaused();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await settleScroll(page);
    await page.waitForTimeout(400);
    const far = await heroWaterPaused();
    check(
      'O11 animations: hero water pauses once scrolled away',
      far === true,
      `paused=${far} atTop=${near}`
    );

    await page.evaluate(() => window.scrollTo(0, 0));
    await settleScroll(page);
    await page.waitForTimeout(400);
    const back = await heroWaterPaused();
    check('O11 animations: resume when scrolled back', back === false);
    await page.close();
  }

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})();
