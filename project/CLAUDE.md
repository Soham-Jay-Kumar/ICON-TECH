# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The Next.js app lives in `project/` — run every command from there, not the repo root.

## Commands

```bash
npm run dev         # Start dev server (localhost:3000)
npm run build       # Production build
npm run start       # Serve a production build
npm run lint        # next lint
npm run typecheck   # tsc --noEmit
```

There is no test runner (no Jest/Vitest/Playwright test config). `playwright` is a devDependency used only by the ad-hoc scripts in `scripts/*.js`. The closest thing to a regression suite is:

```bash
npm run dev                          # or: npm run build && npm start
node scripts/check-red-fixes.js      # regression checks for the RED issues in CODE.md
node scripts/check-orange-fixes.js   # ditto for the ORANGE issues
```

Both drive a *running* server (`SHOOT_URL` overrides `http://localhost:3000`), print PASS/FAIL per check, and exit non-zero on failure. Run them after touching anything they cover — they encode bugs that were shipped once already.

**Never run `next build` while `next dev` is already running against the same working tree.** Both processes write to `.next/`, and running them concurrently corrupts the dev server's cache — it starts serving unstyled HTML (no Tailwind CSS at all) with no error in the terminal. If this happens: kill every `next dev`/`next-router-worker` process, `rm -rf .next`, then restart `npm run dev`. Also note that editing `tailwind.config.ts` (new tokens/keyframes) does not always hot-reload into the already-running dev server's CSS — if a new utility class isn't showing up, restart the dev server rather than assuming the class name is wrong.

## The three specs

Three markdown files in `project/` are load-bearing, and they own separate concerns — read the relevant one before changing behavior in its domain:

| File | Owns | Status |
| --- | --- | --- |
| `DESIGN.md` | Final resting layout, spacing, color, typography | Hard rule (see below) |
| `TRANSITIONS.md` | Motion only — never resting layout | Authoritative spec |
| `CODE.md` | Bug audit (RED/ORANGE/GREEN) + the record of what was wrong and why | Living document |

`CODE.md` is worth reading before any non-trivial change: most of the defensive-looking code in this repo (the hydration watchdog, the offset normalisation in `blogs.tsx`, the 503 in the demo route, `CurrentYear`) exists because of a specific numbered finding there. Reverting one of those to the "obvious" implementation reintroduces a documented bug.

## Architecture

A **Next.js 13.5 App Router marketing site** — two routes plus one API route, no CMS and no database. All page content is hardcoded in the component files.

```
app/page.tsx                    — the home page; stacks section components in order (the map of the site)
app/schedule-demo/page.tsx      — lead-capture page, destination of every CTA
app/api/demo-request/route.ts   — POST handler behind the form
app/sitemap.ts, robots.ts       — both derive absolute URLs from lib/site.ts

components/home/   — one file per home-page section, all reference-driven (see below)
components/demo/   — the schedule-demo form
components/site/   — shared chrome + primitives: navbar, footer, logo, Container/Section/SectionHeading,
                     Reveal, Parallax/subscribeScroll, PauseOffscreen, CurrentYear
components/ui/     — shadcn/ui primitives, mostly untouched library boilerplate; listed in .bolt/ignore
```

`@supabase/supabase-js` is a dependency but is imported nowhere — an abandoned start on the lead pipeline, superseded by the webhook route. Don't take its presence as a signal to use it.

### Pixel-accuracy mandate (`DESIGN.md`)

`DESIGN.md` is a hard rule, not a suggestion: implementations must be pixel-indistinguishable from the screenshots in `reference/`. Do not "improve," modernize, or reinterpret layout/spacing/color/typography — treat the reference images as spec. This is why several components (`hero.tsx`, `navbar.tsx`) use a `vw(px)` helper (`(px / REF_W) * 100 + 'vw'`, `REF_W = 1560`) to convert pixel measurements taken directly off a reference screenshot into viewport-relative units, rather than using Tailwind's spacing scale. When touching these components, preserve that pattern instead of rounding to the nearest Tailwind class.

Caveat learned the hard way (CODE.md R3/R4/O9): a raw `vw()` value with no floor keeps shrinking below the reference width even after a sibling `clamp()` has bottomed out — that produced overlapping hero lines and ~5px text on phones. Anything sized in `vw()` needs a floor (`clamp`/`max`) unless it is genuinely proportional at every width.

### Motion system (`TRANSITIONS.md`)

`TRANSITIONS.md` is the authoritative motion spec (separate from `DESIGN.md` — it owns animation only, never final resting layout). Key points for implementation:

- All durations/easings are CSS custom properties in `app/globals.css` (`--motion-duration-*`, `--motion-ease-*`), exposed as Tailwind tokens (`duration-micro|ui|reveal|hero`, `ease-standard|premium`) in `tailwind.config.ts`. Never hardcode a raw `ms` value or `cubic-bezier()` in a component — reference the tokens so `prefers-reduced-motion` (which zeroes those same variables) disables everything from one place.
- `components/site/reveal.tsx` (`<Reveal>`) is the single scroll-entrance mechanism, built on `IntersectionObserver` (fires once, no library). Its `rise`/`fade` variants animate the *observed* node directly; `mask` (clip-path) uses an extra wrapper because a `clip-path`-collapsed element is reported as having 0% intersection forever, deadlocking the observer. Do not apply `clip-path` directly to a node `Reveal` observes.
- `rise`/`fade` deliberately do **not** get an extra wrapper div: many consumers (e.g. team tiles) rely on `Reveal`'s own div being the `position: relative` containing block for their own `absolute` children. An element with any non-`none` `transform` (even `translateY(0)`) becomes a new containing block — inserting a wrapper broke exactly this for any consumer with an `absolute` child that has no intermediate `relative` element of its own. If you touch `reveal.tsx`, keep this constraint in mind before adding another wrapper.
- Content must never be gated on JavaScript. `Reveal`'s hidden pre-animation state is scoped to a `[.js_&]` selector; the `js` class is added to `<html>` by a plain inline `<script>` in `app/layout.tsx` (paired with `suppressHydrationWarning`, per Next's documented pattern for scripts that touch `<html>`/`<body>` pre-hydration). That script also runs a **4s watchdog**: `Reveal` stamps `data-hydrated` on `<html>` when it mounts, and if that never happens (chunk 404, CSP block, a third-party script throwing) the `js` class is withdrawn and everything falls back to visible. Removing either half turns a hydration failure into a blank white page.
- `components/site/scroll.tsx` is the only place allowed to add a scroll listener. `subscribeScroll(read, write)` gives every subscriber one shared passive rAF-throttled listener with read and write phases separated, so parallax layers can't interleave `getBoundingClientRect` and `style.transform` into layout thrash. `<Parallax>` and `useScrolledPast` (navbar condensed state, with hysteresis) are built on it. Use `anchor="top"` for anything above the fold — `anchor="center"` is offset at page load, which breaks the DESIGN.md frame on first paint.
- Counters (`animated-stat.tsx`) are deliberately *not* scroll-linked; they self-time a count-up on viewport entry. See the note at the foot of `scroll.tsx` before "improving" this.
- `<PauseOffscreen>` wraps subtrees containing `infinite` CSS animations (marquee, panel glyphs) and toggles an `.anim-paused` class via `IntersectionObserver` so they stop compositing off-screen. It's a wrapper taking `children` rather than a hook on purpose — children passed from a server component stay server-rendered, so wrapping the hero doesn't ship its ~400 lines of wave config to the browser.

### Cross-page navigation

The navbar links are cross-page anchors (`/#about`, `/#products`, …). Those use a plain `<a>`, not `next/link`, because client-side navigation does not scroll to a fragment (CODE.md R5 — section nav was dead on `/schedule-demo`). Anchor offset under the fixed navbar is handled globally by `scroll-padding-top` in `globals.css`, not by per-section `scroll-mt` classes. The navbar is absolutely positioned to overlay the hero, so any page that is *not* the home page must provide its own top padding to clear it (see the comment in `app/schedule-demo/page.tsx`).

### Demo request pipeline

`components/demo/demo-form.tsx` → `POST /api/demo-request` → `DEMO_REQUEST_WEBHOOK_URL`. The zod schema in `lib/demo-request.ts` is shared deliberately: the form uses it via `zodResolver` for inline errors, and the route re-validates with it because network input is untrusted regardless.

The route is intentionally a generic JSON webhook forwarder (CRM, Zapier/Make/n8n, Slack, internal API) rather than a vendor SDK. **If `DEMO_REQUEST_WEBHOOK_URL` is unset it returns 503 and the form shows a failure state** — that is deliberate, not a bug to paper over: the form previously reported success unconditionally and every lead was dropped. A submission that cannot be delivered must never read as delivered. Keep that variable server-side; renaming it to `NEXT_PUBLIC_*` puts the endpoint in the client bundle.

`lib/site.ts` resolves `SITE_URL` from `NEXT_PUBLIC_SITE_URL` → `URL` (set by Netlify at build) → `http://localhost:3000`, and feeds `metadataBase`, `robots.ts` and `sitemap.ts`. See `.env.example`.

Both pages are statically prerendered, so anything time-dependent freezes at build time — that's why the footer year goes through `<CurrentYear initial={…} />` rather than a bare `new Date()`.

### Styling

Tailwind config extends the default theme with a bespoke color system (`navy`, `brand`, `teal`, `mist` scales) *and* shadcn's CSS-variable-driven tokens (`--background`, `--primary`, etc., set in `globals.css`) side by side — both exist and are used in different components, so check which convention a file already follows before adding new colors. `components.json` config: shadcn "default" style, RSC on, `baseColor: neutral`.

### Asset pipeline (`scripts/`)

`scripts/build-*.py` / `compare.py` / `measure.py` (need Pillow, some also numpy — `pip install pillow numpy`, not project dependencies) extract and matte pieces of the `reference/*.png` screenshots into the transparent PNGs in `public/images/` (ship watermarks, product mocks, trusted-by logos, the OG image). `scripts/shoot.js` / `shot-cta.js` (Playwright) screenshot the running dev server into `shots/` (gitignored) for comparison against `reference/` via `compare.py` / `diff-cta.py`. These are one-off tuning tools, not part of the build.

Three of them own the hero ocean and must be re-run **in this order** if any of them changes:

```bash
python3 scripts/build-waves-svg.py    # reference/01-hero.png -> ../waves.svg  (the artwork)
python3 scripts/build-waves-data.py   # ../waves.svg          -> public/hero-waves.bin  (what the browser animates)
python3 scripts/build-hero-masks.py   # hero-ocean.png        -> the land mask + the ship cutout
```

`waves.svg` (repo root) is the hero's water, and `hero-waves.bin` is a repack of it — the same contours, washes, lattice and colours, in a form the renderer can redraw every frame. Editing `waves.svg` without re-running `build-waves-data.py` changes nothing on the page; editing the `.bin` by hand loses the next time the script runs. See `components/home/hero-water-flow.ts` for how the surface is animated, `hero-water-worker.ts` for why it is drawn off the main thread, and `hero-water-geometry.ts` for how the plate is split into its three layers.

### The hero ocean

The hero plate is **three layers cut from one illustration**, and the split is the whole design — read `hero-water-geometry.ts` before touching any of it:

1. the **plate** (`hero-ocean.png` under `hero-land-mask.png`) — sky and horizon, still, and the page's LCP element;
2. the **water** (`<HeroWaves>`) — a canvas redrawing waves.svg's own contours, washes and dot lattice every frame, across the whole band with nothing masked out of it;
3. the **ship** (`hero-ship.png`) — the hull, superstructure and both callout leaders as an RGBA cutout, drawn over the water with **normal** blending (not the plate's `multiply`, which would darken the hull against every wash passing under it) and bobbing on the pose the renderer publishes.

Five things here are constraints, not choices, and each replaced something that shipped broken:

- **The water never reverses.** It travels outward from the bow and only outward. This is not a stylistic preference: the hero previously carried its ocean as a ping-pong looped video, which ran the sea outward and then back inward on a ten-second cycle. Do not reach for `alternate`, a reversing keyframe, or footage. `scripts/check-sea-flow.js` measures it.
- **Nothing accumulates.** The surface is sampled at `x - c·t` with a per-side sign, which is shear-free forever. A smoothly tapered velocity field looks equivalent and is not — it folds through zero after a couple of minutes and smears the water into vertical streaks on any page left open.
- **The callout labels are part of the ship.** Both leader lines and arrowheads are drawn *inside* `hero-ship.png`, so they ride the hull's transform whatever the text does. `hero.tsx` therefore writes the hull's exact rigid transform — same translate, same rotate, about `SHIP_PIVOT_REF` which each label carries as its `transform-origin` — onto the label text. Do not "simplify" that to a shared vertical offset: the two leader tips sit either side of the pivot (plate x 439 and 1203 against 771), so a roll moves them in *opposite* vertical directions and one shared `dy` is wrong for at least one label whenever the hull is not level. `scripts/check-callout-track.js` measures the residual gap directly and fails on a hull that is not moving, so it cannot pass by measuring nothing.
- **The ship is a layer, not a hole.** The old split kept it in place with a mask grown 5px past the hull, which left a ring where the plate showed the *printed* ocean and the canvas painted nothing — the pale halo around the hull. Growing, feathering or shadowing that boundary brings it straight back; the water is meant to run continuously behind the ship.
- **The speeds are measurements, not taste.** `SPEED` in `hero-water-flow.ts` is set from `reference-waves.mp4`, measured with the hero's own metric (`scripts/reference-flow.py`): ~200 plate px/s at the near strips, ~90 at the horizon. It was an order of magnitude slower once, and at that pace a crest needed half a minute to cross from the bow to the frame edge — the sea read as a still with a ripple on it. Scale the three bands **together** if you scale them at all: pulling them apart unevenly slides them past each other fast enough that the composite stops holding waves.svg's shape.
- **The horizon has to move too.** `PERSP_TRAVEL` / `PERSP_LIFT` are `1` — the illustration's own 2.49x near-to-far factor, unmodified, which is also what the reference measures (its horizon runs ~0.45 of its foreground). They were briefly flattened to 0.45/0.62 because the back of the sea looked like a static band, but that was the whole sea being too slow rather than the perspective being wrong. The `-far` strips in `check-sea-flow.js` keep it honest: they should be lively, at roughly half the near speed, not a tenth of it.
- **The "AI DRIVEN / SHIPPING" wordmark stands *behind* the water, half into it.** Its `top` in `hero.tsx` puts the letters' feet at plate y 382 and its `Parallax` drift is downward (`+36`), so contact only ever deepens. The target is the design reference's own proportion: the sea crosses the letters near their midpoint. Measured across the running animation (eight frames over ~11s, the canvas's painted top row per column pooled across the wordmark's width) the water's top edge under the text sits at plate 324 typically, 342 at its shallowest, 297 at its deepest — leaving **53%** of the 124.25px painted glyphs above water typically, 68% at most and 32% at least, with the feet 40px under even at the shallowest moment. This replaced an earlier 370, which kept two thirds of the glyphs clear of the water and read as type floating *on* the sea; do not restore it, and do not restore the old upward `-72` drift. The layering only reads correctly while the canvas paints: `hero-waves.tsx` composites it with **no blend mode**, over the wordmark, so the water genuinely occludes the letters. If hydration fails, the still fallback underneath blends with `multiply` and the wordmark reappears *through* the water as if printed on top — that is a broken dev server (see the `next build` over `next dev` warning above), not a z-order bug.
- **The frame rate is part of the model.** A full redraw costs ~26ms, so this runs at about 19fps, and the foreground water crosses ~440 ref px/s — ~23px between frames. A wave is only sampled unambiguously while it moves under half a wavelength per frame, which is what puts a floor under `SIGMA_MID`: the mid band starts at ~52px, so its shortest components sit at 0.44 of a wavelength per frame. Raise the speeds, or widen the mid band downward, and the water starts reading as travelling backwards. Sampling the page at its real 19fps and re-running the flow metric is the test (`grab-hero.js <dir> 5.16667 19.3 40`); it currently comes back 100% outward on all four strips.

Four scripts drive a running server and check exactly those (all need Pillow + numpy):

```bash
node scripts/check-sea-frame0.js   # with the clock stopped, is it still waves.svg?
node scripts/check-sea-flow.js     # does the water ever turn round, and is the horizon alive?
node scripts/check-sea-ship.js     # does the hull bob, subtly, and smoothly?
node scripts/check-callout-track.js # do the callout labels stay welded to their arrows?
node scripts/shoot-sea.js          # frames over time, for looking at it yourself
```

`check-sea-flow.js` and `grab-hero.js` do **not** screenshot the running animation. A Playwright screenshot of this page costs the better part of a second and the water travels ~200 plate px/s, so consecutive shots land further apart than the correlation can search — run that way, the flow check confidently reported 44px/s for water moving four times that. Both instead drive the renderer to exact instants through a dev-only handle `hero-waves.tsx` publishes (`window.__heroWater.draw(t)`, compiled out of production), having first deleted `transferControlToOffscreen` so the main-thread engine takes over. Two consequences: neither exercises the **worker** path (`check-orange-fixes.js` O11 still does), and both need a dev server. `check-sea-ship.js` still watches the real clock on a real GPU, so it stays headed by default (`SHIP_HEADLESS=1` overrides, and undersamples).

To compare against the reference itself:

```bash
node scripts/grab-reference.js ../reference-waves.mp4 /tmp/ref   # 124 frames, 24fps
node scripts/grab-hero.js /tmp/hero 5.16667 24 40                # the same, from the page
python3 scripts/reference-flow.py /tmp/ref 2 ref                 # one metric, both subjects
python3 scripts/reference-flow.py /tmp/hero 2 hero
python3 scripts/compare-motion.py /tmp/ref /tmp/hero /tmp/cmp.png  # kymographs, stacked
python3 scripts/measure-bob.py /tmp/ref                          # the reference hull's travel
```

**Two traps when working on this:**

- Next's dev server can leave the water worker running a *stale chunk* after an edit to anything it imports (`hero-water-flow.ts` especially), and the canvas then paints nothing at all — silently, with no console error, while `data-flowing` still says `true`. If the water disappears, restart `next dev` before believing you broke the model. `check-sea-flow.py` now fails on a blank strip rather than measuring it.
- Judge this animation by watching it for a while, never from one frame — the bug it replaced was invisible in any single screenshot.

### Deployment

Netlify, via `@netlify/plugin-nextjs` (`netlify.toml`: `npx next build`, publish `.next`). `next.config.js` disables ESLint during `next build` and sets `images: { unoptimized: true }` — relevant if reintroducing `next/image` optimization behavior. The site uses raw `<img>` in several places, which is the source of every current `next lint` warning (`@next/next/no-img-element`).

### `.bolt/`

This project originated from bolt.new (`.bolt/config.json`: `nextjs-shadcn` template). `.bolt/prompt` conventions still apply: add `"use client"` to any component using hooks, avoid triggering the "Extra attributes from the server" hydration warning, use `lucide-react` for icons, and don't add UI/icon libraries beyond shadcn/ui + Tailwind without a specific reason.
