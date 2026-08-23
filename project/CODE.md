# CODE.md — Bug Audit

Systematic audit of the Next.js marketing site in `project/`. No files were modified.

**Baseline checks run:**

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean, 0 errors |
| `npx next lint` | 7 warnings, all `@next/next/no-img-element` |
| Built CSS (`.next/static/css/app/layout.css`) | all custom classes + `@keyframes hero-wave-scroll` survive the build — no Tailwind purge issue |

Severity key:

- 🔴 **RED** — fix immediately. Crashes, data loss, or content that is broken/unreadable for a whole class of users.
- 🟠 **ORANGE** — fix soon. Wrong behaviour, bad UX, SEO/a11y damage, or perf debt that isn't yet breaking anything.
- 🟢 **GREEN** — not a concern right now. Known trade-offs, dead code, hygiene.

---

## 🔴 RED — fix immediately

> **Status: all five fixed.** Verified by `node scripts/check-red-fixes.js`
> (10/10) against both a dev server and a production build. The descriptions
> below are kept as the record of what was wrong and why. R2 additionally
> requires `DEMO_REQUEST_WEBHOOK_URL` to be set in the deployment before demo
> requests reach anyone — see `.env.example`.

### R1. `Blogs` carousel crashes the page after 6 back-clicks

`components/home/blogs.tsx:70-73`

```ts
const [offset, setOffset] = useState(0);
const rotated = posts.map((_, i) => posts[(i + offset + posts.length) % posts.length]);
```

`offset` is unbounded and decrements once per "Previous articles" click. JavaScript's `%` keeps the sign of the dividend, so once `offset <= -posts.length` the index goes negative and `posts[-1]` is `undefined`. The very next line dereferences it (`key={post.title}` in the `.map`), throwing `TypeError: Cannot read properties of undefined (reading 'title')` and taking down the whole page with a React error boundary.

Verified by evaluating the exact expression:

```
offset -5 -> [1,2,3,4,5]      ok
offset -6 -> [undefined,1,2,3,4]   ← crash
offset -7 -> [undefined,undefined,1,2,3]
```

Six clicks on the ⟵ button is well within normal user behaviour. The single `+ posts.length` only absorbs one full rotation. Fix: normalise the offset (`((offset % posts.length) + posts.length) % posts.length`), or clamp `setOffset` so it never leaves `[0, posts.length)`.

### R2. The demo form silently throws away every lead

`components/demo/demo-form.tsx:86-91`

```ts
const onSubmit = (values: DemoRequest) => {
  // TODO: send `values` to a real destination …
  void values;
  setSent(true);
};
```

Nothing is transmitted — no API route, no email, no CRM. The user is then shown a success panel that reads *"Request received. A maritime AI specialist will reach out within one business day."* (`demo-form.tsx:124-130`). This is the destination of the site's primary CTA in both the navbar (`navbar.tsx:115`) and the mobile menu (`navbar.tsx:154`), so every inbound demo request is lost while the visitor believes it was received.

Note also that `@supabase/supabase-js` is already a dependency but is never imported anywhere in the codebase — the intended destination appears to have been started and not wired up.

This is the highest-impact item in the audit: it is business-logic data loss, and the confirmation copy makes it a promise the site cannot keep.

### R3. Hero headline lines overlap on every phone and small tablet

`components/home/hero.tsx:50-54`

```ts
fontSize: `clamp(2.25rem, ${vw(70.7)}, 5.5rem)`,
lineHeight: vw(86),
```

`fontSize` is clamped with a `2.25rem` (36px) floor; `lineHeight` is raw `vw(86)` = `5.5128vw` with **no floor**. Below the width where the clamp engages (~794px), the font size stops shrinking but the line height keeps going:

| Viewport | font-size | line-height | result |
| --- | --- | --- | --- |
| 1560px (ref) | 70.7px | 86px | correct |
| 794px | 36px | 43.8px | tight but fine |
| 500px | 36px | 27.6px | lines overlap |
| 375px | 36px | **20.7px** | lines overlap by ~15px |

The `<h1>` is a hard two-liner (`hero.tsx:56-59`, explicit `<br />`), so on a 375px phone "Building AI Agents" and "For Shipping and Beyond" are drawn on top of each other. This is the first thing a mobile visitor sees.

Same root cause, same file — the supporting copy's vertical rhythm collapses too: `marginTop: vw(16)` → 3.8px and `marginTop: vw(14)` → 3.4px at 375px (`hero.tsx:69`, `hero.tsx:86`), so the three copy blocks jam together.

### R4. Navbar logo renders ~14px tall on mobile, and the hero headline sits under the bar

`components/site/navbar.tsx:18-19`, `61-67`

```ts
const size = (full: number, condensed: number, on: boolean) => vw(on ? condensed : full);
…
<Logo style={{ height: size(59.5, 42, condensed), … }} />
```

`size()` returns a bare `vw()` with no floor, and it is applied via inline `style` so no responsive class can override it. Logo height by viewport:

| Viewport | logo height | rendered width (462×271 asset) |
| --- | --- | --- |
| 1560px | 59.5px | ~101px |
| 768px | 29.3px | ~50px |
| 375px | **14.3px** | ~24px |

At 375px the brand mark is a 24×14px smudge next to a 44px hamburger button.

The knock-on effect: on mobile the navbar's real height is set by that 44px button (`navbar.tsx:128-134`) plus `paddingTop: vw(17)` ≈ 4px, so the bar occupies roughly the top 48px. The navbar is `fixed` (`navbar.tsx:45`), i.e. out of flow, and the hero's own top padding is `max(vw(125), 41px)` = **41px** on mobile (`hero.tsx:41`). 41 < 48, so the first line of the `<h1>` is drawn underneath the fixed header. The 41px floor was calculated back when the navbar was `absolute`; the comment at `hero.tsx:38-42` still describes that older geometry.

### R5. Section navigation is dead on `/schedule-demo`

`components/site/navbar.tsx:22-27`, `components/site/footer.tsx:10-13`

```ts
const links = [
  { label: 'Home', href: '/', active: true },
  { label: 'Who We Are', href: '#about' },
  { label: 'Products', href: '#products' },
  …
];
```

Bare fragment hrefs resolve against the *current* route. On `/schedule-demo` these become `/schedule-demo#about`, `/schedule-demo#products`, `/schedule-demo#team`, `/schedule-demo#blogs` — none of those ids exist on that page, so 4 of the 5 nav links and 4 of the footer hit-areas do nothing. The footer is rendered on both pages (`app/schedule-demo/page.tsx:65`), so the same failure applies there.

`/schedule-demo` is the landing page for the site's primary CTA, so this is the one page where a visitor is most likely to want to go back and browse. Fix: use `/#about` etc.

---

## 🟠 ORANGE — should be fixed soon

> **Status: all thirteen addressed.** Verified by
> `node scripts/check-orange-fixes.js` (23/23) against both a dev server and a
> production build. Two carry a residual action for the team rather than for
> the code: **O5**, where the footer's *pixels* are still a raster panel (the
> address and link labels are now real text alongside it, but fully
> de-rasterising the artwork is a footer rebuild against `reference/`), and
> **O7**, where the Terms and Privacy pages still need to be written and the
> links restored. The descriptions below are kept as the record of what was
> wrong and why.

### O1. Content touches the viewport edges between 1024px and 1296px

`app/globals.css:69-71`

```css
.container-site {
  @apply mx-auto w-full max-w-[1296px] px-5 sm:px-8 lg:px-0;
}
```

`lg:px-0` kills the horizontal padding at 1024px, but `max-w-[1296px]` doesn't start centring with visible margin until 1296px. In the 272px-wide band between them the container is `width: 100%` with zero padding, so headings, body copy and cards run flush into both viewport edges. That band covers common laptop widths (1024, 1152, 1280) and every browser window that isn't maximised. Fix: `lg:px-8` (or similar) rather than `lg:px-0`.

### O2. Anchor targets land underneath the fixed navbar

`app/globals.css:53-55` sets `scroll-behavior: smooth`, the navbar is `fixed` (`navbar.tsx:45`), and **no element on the site defines `scroll-margin-top`** (grepped `app/` and `components/` — zero hits). Every `#about` / `#products` / `#team` / `#blogs` jump therefore parks the section's heading behind the header — 48px of it on mobile, ~110px on desktop. Fix: `scroll-mt-*` on the four `<section id>` elements, or `scroll-padding-top` on `html`.

### O3. The page's own CTA disagrees with the navbar CTA

`components/home/cta.tsx:49-58`

```tsx
<a href="#contact" …>Book a Demo</a>
```

The final call-to-action scrolls to the footer image (`footer.tsx:24`, `id="contact"`) rather than going to `/schedule-demo`, which is where both navbar CTAs point. The label is also inconsistent ("Book a Demo" vs "Schedule a Demo"). The footer is a flat PNG with no contact form, so the anchor delivers the visitor to a dead end at the exact moment of highest intent. This looks like a leftover from before `app/schedule-demo/` existed (that directory is still untracked in git).

### O4. Social/SEO metadata is still bolt.new template boilerplate

`app/layout.tsx:22-36`

```ts
openGraph: { images: [{ url: 'https://bolt.new/static/og_default.png' }] },
twitter:   { card: 'summary_large_image', images: [{ url: 'https://bolt.new/static/og_default.png' }] },
```

Every link shared on LinkedIn, Slack, X or WhatsApp renders bolt.new's generic template image. Related gaps in the same area:

- No `metadataBase`, so any future relative asset URL in metadata will warn and resolve wrongly.
- No `app/icon.*` / `app/favicon.ico` — the tab shows the default globe.
- No `app/robots.ts` and no `app/sitemap.ts`.
- `/schedule-demo` has its own title/description (`app/schedule-demo/page.tsx:8-12`) but no OG override, so it inherits the same placeholder.

### O5. The entire footer is a raster image

`components/site/footer.tsx:26-33`

The address, the nav labels and the layout are baked into `footer-panel.png`, with eight invisible `<Link>` rectangles positioned over it by percentage (`footer.tsx:8-17`). Consequences:

- The company address is not selectable, not copyable, not machine-readable, and invisible to search engines and to Google Business/local SEO.
- The `alt` text is a single 200-character run-on that a screen reader announces as one undifferentiated block (`footer.tsx:28`), then immediately re-announces the same link labels via the eight `aria-label`ed empty links.
- Text doesn't reflow or respect the user's font-size settings, and blurs on zoom.
- The hit-areas are hard-coded percentages, so any change to the artwork silently desynchronises the links from what's drawn.

The crisp-text patch already applied to the copyright line (`footer.tsx:50-73` — a solid rectangle painted over the raster text with real text on top) is the pattern to extend to the rest of the panel.

### O6. Navbar "active" state is hard-coded

`components/site/navbar.tsx:24` sets `active: true` on the Home link as static data. On `/schedule-demo` the Home pill is still rendered in its white/orange active treatment, telling the visitor they're on the home page when they aren't. There is also no `aria-current="page"` on any link, so the active state is purely visual. Fix: derive it from `usePathname()` (the component is already `'use client'`).

### O7. Consent links on the lead form go nowhere

`components/demo/demo-form.tsx:225`, `demo-form.tsx:229`

```tsx
By clicking Submit, you agree to Icon Technology's <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>…
```

The form collects name, work email, company and phone number and asserts agreement to two documents that don't exist. Because `scroll-behavior: smooth` is set globally, clicking either one just glides the page back to the top. The code comment at `demo-form.tsx:221-222` acknowledges this; it is called out here because it is a consent statement attached to PII collection, not merely a broken link.

### O8. Vision/Mission decorative layers overlap the copy on mobile

`components/home/vision-mission.tsx:12`, `40`, `138-144`, `118-132`

The rings (`top: ICON_CY - 120` = 68px), the glyph (`top: ICON_CY - 30` = 158px) and the tinted grid cells (`top: y`, raw px from `VISION_CELLS`/`MISSION_CELLS`) are all positioned at fixed pixel offsets. On desktop `md:pt-[357px]` on the copy block (`vision-mission.tsx:149`) pushes the text clear of them. On mobile that padding is absent and the panel starts at `py-20` (80px), so the heading occupies roughly 80–117px and the subtitle 141–195px — putting the 60×60px glyph at 158–218px directly on top of the subtitle.

Second, smaller issue in the same component: `md:h-[702px]` is a fixed height on a container with `overflow-hidden` (`vision-mission.tsx:107`). Between 768px and 1024px the panels are full-width but still 702px tall with 357px of top padding; any copy growth (translation, a longer body string) is silently clipped rather than pushing the panel taller.

### O9. Hero callout labels are ~5px tall on mobile

`components/home/hero.tsx:26-29` — `fontSize: vw(21.4)` = `1.3718vw`, again unfloored. At 375px that's **5.1px**; at 768px it's 10.5px. "Anchor Change Suggested" and "Fuel Anomaly Detected" are unreadable on every phone. Same root cause as R3/R4 (unclamped `vw()`), separated here because it's decorative annotation rather than primary content.

### O10. Reveal content depends on hydration succeeding, not just on JS being present

`components/site/reveal.tsx:20-29` + `app/layout.tsx:56-60`

The hidden pre-animation state is gated on `[.js_&]`, and the `js` class is added by a plain inline script that runs during HTML parsing. The comment claims "Content must never be gated on JavaScript" — that holds only when JS is *disabled entirely*. If JS is enabled (so the inline script runs and adds `js`) but React hydration fails — chunk 404 after a deploy, CSP block, a third-party script throwing first — the `IntersectionObserver` in `Reveal` never runs and **every** `<Reveal>` on the page stays at `opacity: 0` permanently. The page renders as an empty white document. A `<noscript>`-based approach, or a CSS-animation-driven fallback with a timeout, closes that window.

Minor related item: `team.tsx:25` passes `transition duration-ui ease-standard` into `Reveal`'s `className`. `cn()` is `twMerge` (`lib/utils.ts:4-6`) and the consumer class is merged last, so it overrides the component's own `duration-reveal` — team tiles reveal at 350ms instead of the intended 550ms. Not visually broken, but it means `Reveal`'s duration contract is silently overridable.

### O11. A lot of unconditional infinite animation

Running continuously, always, regardless of viewport position:

| Source | Count | Notes |
| --- | --- | --- |
| `hero-waves.tsx` | 8 layers | 2 flanks × (3 wave layers + 1 dot texture) |
| `hero-waves.tsx` | 3 layers | lower band |
| `trusted-by.tsx:23` | 1 | `animate-marquee`, 28s |
| `vision-mission-glyphs.tsx:23` | 1 | `animate-glyph-tick`, 12s |
| `vision-mission-glyphs.tsx:48,75` | 2 | `animate-arrow-strike` / `animate-target-pulse`, 5s |

That's 15 permanently-running compositor animations, 11 of them stacked on the largest above-the-fold element, each painting a repeating SVG data-URI background up to 1100 reference px wide (`hero-waves.tsx:106-180`). None pause when scrolled out of view. `prefers-reduced-motion` is handled correctly everywhere — the concern is battery and thermal cost on mid/low-end mobile for a decorative effect that is barely visible at those widths anyway. An `IntersectionObserver`-driven `animation-play-state: paused` on the hero band would remove most of it.

Since fixed. The hero water is no longer CSS layers at all: it is a single canvas that redraws `waves.svg`'s own geometry (`hero-waves.tsx` + `hero-water-flow.ts`). Redrawing that surface — 122 gradient wash bands and 15,301 round-capped dots — costs tens of ms a frame on mid hardware, far too much for the main thread, so it is handed to a worker over `OffscreenCanvas` (`hero-water-worker.ts`) and capped at 30fps; the main thread keeps only the measuring and the gating. Browsers without `OffscreenCanvas` run the same renderer here at 15fps. Either way the clock stops off-screen, on a hidden tab and under `prefers-reduced-motion`. `PauseOffscreen` cannot gate it (there is no CSS animation to pause), so the component publishes `data-flowing` on the canvas and `scripts/check-orange-fixes.js` asserts against that. The other four loops in the table are `PauseOffscreen`-gated.

### O12. `priority` on the bottom-of-page image

`components/home/cta.tsx:69` marks `cta-dashboard.png` (2224×1066) as `priority`, which emits a `<link rel="preload">` for an image that sits at the very bottom of the page. It competes for bandwidth with the actual LCP candidate — the hero illustration at `hero.tsx:140-144`, which is a plain `<img>` with no priority hint at all. The two should be swapped.

### O13. Copyright year freezes at build time

`components/site/footer.tsx:71` — `new Date().getFullYear()` inside a server component on a route with no dynamic functions. Next.js statically prerenders it at build, so the year is baked into the HTML and will read stale until the next deploy. Either render it client-side or accept it as a deploy-time value deliberately.

---

## 🟢 GREEN — not a concern for now

- **G1.** Seven `@next/next/no-img-element` lint warnings (`blogs.tsx:51`, `hero.tsx:140`, `products.tsx:11,105`, `team.tsx:40,67`, `testimonials.tsx:68`, `who-we-are.tsx:67`). `next.config.js` sets `images: { unoptimized: true }`, so `next/image` buys little here beyond CLS reservation. The hero and product images sit in aspect-ratio or fixed-height boxes already; the remote Pexels images in `team`/`testimonials`/`blogs` are the ones that could shift layout on slow connections.
- **G2.** Team, testimonial and blog imagery is hot-linked from `images.pexels.com` (`team.tsx:41,53,59`, `testimonials.tsx:15,23,31`, `blogs.tsx:13,19,25,31,37`) — third-party availability risk and placeholder content on a production marketing site, but a deliberate pre-launch state.
- **G3.** `@supabase/supabase-js` is a dependency with zero imports. `eslint`, `typescript`, `autoprefixer`, `postcss` and the `@types/*` packages sit in `dependencies` rather than `devDependencies`, inflating the production install.
- **G4.** `next.config.js:3-5` sets `eslint.ignoreDuringBuilds: true`, so lint regressions can never fail a Netlify build. Fine while lint output is only `<img>` warnings; worth revisiting once those are resolved.
- **G5.** Next.js is pinned to `13.5.1` and React to `18.2.0`. Well behind current, but an intentional pin (`@next/swc-wasm-nodejs` is pinned to match). No upgrade urgency for a static marketing site; a dependency-audit pass would be a separate piece of work.
- **G6.** The whole of `components/ui/` (49 shadcn primitives) plus `hooks/use-toast.ts` ship unused — no `Toaster` is mounted in either layout, and nothing outside `components/ui/` imports from it. Tree-shaken out of the client bundle, so this is repo weight, not payload weight. Note that `tailwind.config.ts` has no `tailwindcss-animate` plugin; that's currently harmless because none of the vendored primitives in use rely on its classes, but installing a new shadcn component that does would produce a silently non-animating component.
- **G7.** `data-shot="…"` QA hooks (`hero.tsx:37`, `products.tsx:119`, `cta.tsx:16`, and eight others) ship to production HTML. They're the anchor points for `scripts/shoot.js`, so removing them would break the visual-QA tooling.
- **G8.** `vw()` (`hero-metrics.ts:6`) is viewport-width based and therefore includes the scrollbar, while the hero illustration itself is sized to its container. On platforms with a classic ~17px scrollbar the wave bands and callouts drift ~1% relative to the hull. Sub-pixel at most widths; only worth chasing if the pixel-accuracy mandate in `DESIGN.md` is being verified on Windows.
- **G9.** The repo-root `.DS_Store` is tracked in git. `project/.gitignore` covers `.DS_Store`, but the repository root has no `.gitignore` of its own.
- **G10.** Placeholder `href="#"` on all five blog cards (`blogs.tsx:49`) and the three social icons (`footer.tsx:14-16`) — expected while there's no blog or social presence to link to.
- **G11.** `testimonials.tsx:56` uses `<div key={index}>` to force a remount on slide change, but the surrounding `Reveal` fires once and disconnects (`reveal.tsx:88-90`), so the entrance animation never replays. Slides swap instantly with no transition — a missed polish opportunity, not a defect.
- **G12.** `Parallax` leaves `willChange: 'transform'` on its wrapper permanently (`scroll.tsx:183`), including when it bailed out early under `prefers-reduced-motion` (`scroll.tsx:158`). Six such layers exist. Negligible at this count.
- **G13.** `results.tsx:74` uses `onTwoThirds={() => setActiveIndex(i + 1)}` — an absolute set rather than a monotonic `Math.max`. Correct as written because the callbacks fire strictly in order, but it would regress silently if the stat cascade were ever reordered or made concurrent.
- **G14.** `app/schedule-demo/page.tsx:25-27` documents the navbar as "absolutely positioned"; it is `fixed` (`navbar.tsx:45`). The padding numbers still work out, so this is a stale comment rather than a layout bug — but it's the same outdated assumption that produces the real overlap in **R4**.
