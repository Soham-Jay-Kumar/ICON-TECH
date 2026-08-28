# TRANSITIONS.md

# Motion Specification (AUTHORITATIVE)

## Relationship to DESIGN.md

| Document | Owns |
|----------|------|
| **DESIGN.md** | Static layout — pixels, spacing, colors, typography, resting composition |
| **TRANSITIONS.md** | Motion — how elements arrive, respond, and settle |

Resting appearance always matches the design references. Motion is **additive polish only** — it never changes final layout positions, sizes, or colors defined in DESIGN.md. Every animation ends on the exact frame DESIGN.md specifies.

---

## 1. Motion Philosophy

Icon Tech is a serious B2B maritime technology company. Motion exists to communicate **quality and reliability**, not to demonstrate technique.

The motion language is:

- **Modern, premium, calm, technical, precise** — never playful, bouncy, or ornamental.
- **Restrained** — a handful of intentional, well-placed motions beat many competing ones. The cinematic register (§2–§3) is spent on the few elements that carry the page, not sprayed across every block.
- **Two-speed** — *interactions* stay fast (under 250ms), so nothing UI ever feels like it's waiting on the animation; *entrances* for major visual elements are deliberately slower (the ~1.1s cinematic tier), a serious arrival rather than a snappy one. The split is the point (§2).
- **Deterministic** — every reveal fires once and settles exactly on the DESIGN.md layout. The only elements that loop at rest are the sanctioned ambient set (marquee, hero water, glyphs, and the one radar signature — §13), each `PauseOffscreen`-gated; everything else is still.
- **Content-first** — motion never blocks, delays, or hides content. If JavaScript or the animation system fails, every element is fully visible and functional immediately (see §12, §14).

---

## 2. Global Motion Tokens

All durations and easings are CSS custom properties defined once, in `app/globals.css` (`:root`), and exposed as Tailwind utilities via `tailwind.config.ts`. Nothing in the component layer hardcodes a raw millisecond value or cubic-bezier — components reference the token classes below. This is also what makes reduced-motion a one-line override (§12).

| Token (CSS var) | Tailwind class | Value | Use |
|---|---|---|---|
| `--motion-duration-micro` | `duration-micro` | `200ms` | Buttons, links, icon nudges, color/border changes |
| `--motion-duration-ui` | `duration-ui` | `350ms` | Card hover lift, image zoom, mobile menu open |
| `--motion-duration-reveal` | `duration-reveal` | `550ms` | Section/content scroll reveals |
| `--motion-duration-hero` | `duration-hero` | `850ms` | Legacy media band (still used where a reveal wants 850ms) |
| `--motion-duration-cinematic` | `duration-cinematic` | `1200ms` | **Cinematic tier** — major typography (masked line-rise), media "develop" reveals, converging panels |
| `--motion-duration-epic` | `duration-epic` | `1600ms` | The single grandest sequence (the CTA dashboard) |
| `--motion-ease-standard` | `ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | All interactive (hover/press/UI) transitions |
| `--motion-ease-premium` | `ease-premium` | `cubic-bezier(0.16, 1, 0.3, 1)` | Base entrance/reveal transitions (strong decelerate, no overshoot) |
| `--motion-ease-cine` | `ease-cine` | `cubic-bezier(0.19, 1, 0.22, 1)` | **Cinematic tier** — the long, gliding entrance curve |
| — | `translate-y-6` | `24px` | Standard reveal rise distance |
| — | (prop) | `~100–120ms` | Standard stagger step between sibling reveals |

**Three tiers, split by what moves.** This is the core of the system, and the split between how *major visual elements* arrive and how *UI elements* react is deliberate:

| Tier | What moves | Duration | Ease |
|---|---|---|---|
| **UI** | buttons, links, nav, card hover | `micro` 200 / `ui` 350 | `ease-standard` |
| **Reveal** | body copy, minor groups | `reveal` 550 / `hero` 850 | `ease-premium` |
| **Cinematic** | major typography (masked line-rise), hero/media reveals, converging panels | `cinematic` 1200 / `epic` 1600 | `ease-cine` |

The cinematic tier is intentionally slower than the "under 250ms" band that governs UI — a serious, unhurried arrival for the few elements that carry the page, while every UI interaction stays snappy. This is the reference language (Monopo's patient glide, Origin's long atmospheric reveals against snappy UI states) translated into Icon Tech's own tokens.

---

## 3. Easing System

Three curves, used consistently everywhere:

- **`ease-standard`** (`cubic-bezier(0.4, 0, 0.2, 1)`) — for anything the user directly triggers: hover, press, dropdown, menu. Quick to start, quick to settle. No overshoot.
- **`ease-premium`** (`cubic-bezier(0.16, 1, 0.3, 1)`) — base scroll reveals. Strong deceleration into the resting frame, a "settling into place" feel.
- **`ease-cine`** (`cubic-bezier(0.19, 1, 0.22, 1)`) — the cinematic tier only: the hero headline/media, major section headings, the converging Vision/Mission panels, the CTA dashboard. A long, gliding ease-out — more patient than `ease-premium`, still no overshoot. It is the curve that makes a slow reveal read as *deliberate* rather than merely *late*.

No spring, elastic, or bounce easing exists anywhere in the system (see §15).

---

## 4. Page/Section Transitions

This is a single-page site (`app/page.tsx` renders one route). There is no client-side route transition system, and none is introduced — adding one for a single URL would be motion for its own sake.

"Section transitions" on this site means: each section reveals itself once as the user scrolls to it (§6), and in-page navigation (`Navbar` links to `#about`, `#products`, etc.) uses the browser's native anchor scrolling — no custom scroll-hijacking or easing is applied to that scroll itself, so the page always stays responsive to the user's own input.

**Continuity comes from a unified reveal grammar, not per-seam machinery.** Every section's heading uses the same cinematic masked line-rise and the same stagger cadence, so the whole page reads as one deliberately choreographed sequence as you scroll — the "one connected experience" — while each section keeps its own flat, distinct background (white / tinted / navy). An earlier scroll-linked colour-bleed at the Products→Trusted-By seam was tried and **removed**: it added machinery for an effect too subtle to earn its keep. Restraint over cleverness — the reference language's actual lesson.

---

## 5. Hero Motion

**Component:** `components/home/hero.tsx`

The hero carries the strongest motion on the site — now a layered cinematic sequence with clear hierarchy, not three identical fade-ups.

| Element | Trigger | Initial → Final | Duration | Delay | Easing |
|---|---|---|---|---|---|
| Headline (`h1`) | On mount | `rise-mask`: rises up out of an `overflow-hidden` frame (type emerges from behind a hard edge) + opacity | `cinematic` (1200ms) | 0ms | `ease-cine` |
| Supporting line | On mount | `rise`: `opacity 0`, `translateY(24px)` → settled | `reveal` (550ms) | 100ms | `ease-premium` |
| Tertiary line | On mount | `rise` | `reveal` | 160ms | `ease-premium` |
| Ocean/ship media | On mount | `mask`: `clip-path: inset(0 0 100% 0)` → `inset(0)` (tide fills in from the waterline) + opacity | `cinematic` (1200ms) | 140ms | `ease-cine` |
| Callout sub-line, left | Mount timer | `clip-path: inset(0 100% 0 0)` -> `inset(0)` + opacity (wipes in left to right) | `reveal` (550ms) | 900ms | `ease-premium` |
| Callout sub-line, right | Mount timer | same | `reveal` (550ms) | 1000ms | `ease-premium` |

The headline rises out of its mask on the cinematic tier while the copy rises under it — a sequence, not a flat group. The media's bottom-up clip reads as a rising tide (the maritime signature). It is held to the `cinematic` tier, not `epic`, and to a short delay, **because the ocean plate is the page's LCP element** — the grandest `epic` reveal is spent on the CTA dashboard at the foot instead, where it costs no LCP. The hero watermark and callouts parallax on scroll (§16).

The two callout labels also ride the hull at rest, and this is not decoration: their leader lines and arrowheads are drawn *inside* the ship raster, so they already inherit the hull's transform. `hero.tsx` writes that same rigid transform — the same translate **and** the same rotate, about the ship's own pivot, which each label carries as its `transform-origin` — onto the label text, so the annotation moves as one piece. The rotation is the load-bearing half: the two leader tips sit on opposite sides of the pivot (plate x 439 and 1203 against a pivot at 771), so a roll moves them in opposite vertical directions, and driving both labels from one shared `dy` visibly tears the text off its arrow. `scripts/check-callout-track.js` measures the residual gap (currently 0.0012px) and refuses to pass on a hull that is not actually moving.

Each callout carries a second line under its label — what the agent *does* about the alert ("Turn insight into action", "Investigate. Validate. Drive Action"). Their timing is the point: both land well after the tide has settled, so they read as the answer arriving under the alert rather than as part of the same object. Left leads right by 100ms for the same reason the copy trails the headline — a pair that appears simultaneously reads as one symmetrical flash, a pair that appears in order reads as a sequence. They WIPE in left to right rather than rising, and that is the point: the headline rises out of a mask and the ocean fills from the waterline, both vertical, so a horizontal sweep reads as a different kind of event rather than a third copy of the same one — and it runs along the line of reading, like a readout printing.

They are deliberately **not** staggered clause-by-clause ("Investigate." / "Validate." / "Drive Action"): that is §15's "animating every word individually instead of meaningful visual groups", and the left sub-line is a single clause, so the two callouts would stop matching.

They are rendered inside the same bobbing span as their label, so they inherit the hull's rigid transform exactly as the label does.

Their entrance is driven by a **mount timer in `Callout`, not by `<Reveal>`**, and that is a correctness requirement rather than a preference. The ocean plate is itself a `mask` Reveal — `clip-path: inset(0 0 100% 0)` until the tide fills in — and a clip-collapsed ancestor reports 0% intersection for everything inside it. A nested Reveal therefore cannot fire until the clip has opened past the label, then stacks its own delay on top: measured, the sub-lines were still hidden 3s after load. The timer sidesteps that, and is the honest mechanism anyway, since the hero is above the fold and there is no scroll event to wait for. It uses the same shared tokens, the same `[.js_&]`-scoped hidden state so no-JS renders the line visible rather than blank, and an isomorphic layout effect so reduced-motion users never see a hidden-then-visible flash. Animating `clip-path` directly on this node is safe for the same reason it would not be inside a Reveal: nothing is observing it.

**Mobile:** identical sequence; distances and durations are unchanged (there is no separate mobile timing — the same tokens apply, and the layout itself already adapts per DESIGN.md). The callout labels themselves start at `md`, and their sub-lines at `lg` — below that the 0.75 ship scale leaves the sub-line under 6px.

**Reduced motion:** all elements appear immediately at their final position (see §12).

---

## 6. Scroll Reveal System

**Component:** `components/site/reveal.tsx` (`<Reveal>`), used by every home section.

**Mechanism:** `IntersectionObserver` (`threshold: 0.15`, `rootMargin: "0px 0px -64px 0px"`) watches each `<Reveal>`'s wrapper. The first time it's ≥15% in view, it flips a `visible` flag once and disconnects — it never re-fires, so scrolling back up and down does not replay it.

**Variants:**

| Variant | Initial state | Final state | Used for |
|---|---|---|---|
| `rise` (default) | `opacity 0`, `translateY(24px)` | `opacity 1`, `translateY(0)` | Body copy, minor groups, stats |
| `fade` | `opacity 0` | `opacity 1` | Eyebrows, trusted-by strip, footer — content that shouldn't shift |
| `mask` | `opacity 0`, `clip-path: inset(0 0 100% 0)` | `opacity 1`, `clip-path: inset(0)` | Hero ocean (bottom-up tide fill) |
| `rise-mask` | child at `translateY(100%)`, `opacity 0`, inside an `overflow-hidden` frame | `translateY(0)`, `opacity 1` | **Major headings** — type rises from behind a hard edge |
| `rise-scale` | `opacity 0`, `translateY(40px)`, `scale(1.06)` | settled at `scale(1)` | **Media that "develops"** — product cards, CTA dashboard |
| `left` | `opacity 0`, `translateX(-24px)` | `opacity 1`, `translateX(0)` | Left half of a side-by-side pair |
| `right` | `opacity 0`, `translateX(24px)` | `opacity 1`, `translateX(0)` | Right half of a side-by-side pair |

The two clipped variants (`mask` clip-path, `rise-mask` overflow) animate an inner child, never the observed node — for `mask` a clip-collapsed node reports 0% intersection forever and never fires; for `rise-mask` the outer node is the `overflow-hidden` frame the child rises out of. `rise-scale` settles from noticeably larger, so media reads as a slow camera-settle rather than a flat slide. `left`/`right` converge a two-up group on its centre seam; used by the Vision/Mission panels.

**Duration is a per-`Reveal` prop** (`base` 550 / `slow` 850 / `cinematic` 1200 / `epic` 1600), and the ease follows the tier automatically: `base`/`slow` → `ease-premium`, `cinematic`/`epic` → `ease-cine`. Major headings (`rise-mask`) and media (`mask`/`rise-scale`) use the cinematic tier; body copy stays on `base`.

**Stagger:** siblings in a group pass an incremental `delay`, stepped ~100–120ms, so the group reads in order rather than popping in together.

**What is NOT wrapped in `Reveal`:** individual words, individual sentences within a paragraph, or decorative background elements (ray fan, grid textures, watermark ships). Only meaningful visual groups animate, per the brief.

**Section map:**

| Section | Reveal groups |
|---|---|
Every section headline now shares one grammar — eyebrow `fade`, then the `h2` on `rise-mask`/cinematic — so the page reads as one choreographed sequence.

| Who We Are | Eyebrow `fade`, heading `rise-mask`/cinematic (120ms), body `rise`/cinematic (120ms) — continues the hero's register across the white→white boundary |
| Vision / Mission | Vision panel `left`/cinematic (0ms), Mission panel `right`/cinematic (120ms) — converge on the centre seam; Mission carries the radar signature (§13) |
| Products | Eyebrow `fade`, heading `rise-mask`/cinematic (120ms), then 2 cards `rise-scale`/cinematic (0/100ms) + asset-lifecycle card `rise-scale`/cinematic (200ms) |
| Trusted By | Whole strip, `fade` — logos themselves scroll via the marquee (§9), independent of this reveal |
| Results | Eyebrow `fade`, heading `rise-mask`/cinematic (120ms), then 3 stat blocks `rise` (0/100/200ms). Counters stay self-timed (§16) |
| Testimonials | Eyebrow `fade`, heading `rise-mask`/cinematic (120ms); quote block `rise` (120ms) — also re-reveals on prev/next click since it remounts with the new quote |
| Team | Eyebrow `fade`, heading `rise-mask`/cinematic (120ms); CEO tile, then 2 tiles (100/200ms) |
| Blogs | Eyebrow `fade`, heading `rise-mask`/cinematic (120ms); controls, then cards (0/100ms per row) |
| CTA | Heading `rise-mask`/cinematic, copy `rise` (120ms), button `rise` (200ms), then dashboard `rise-scale`/**epic** (200ms) — the grandest single reveal, at the page foot where it costs no LCP |
| Footer | Whole panel, `fade` |

---

## 7. Image/Media Transitions

- **Hero ocean/ship plate:** `mask` reveal on entrance (§5). No hover state — it's not interactive.
  - **Fits the viewport on load (sizing, not motion — noted here because the reveal runs inside it).** The whole composition — ship and the full wave field — is visible immediately, without scrolling, and the ocean stays **full-bleed (100vw) at every width** — no side borders. Because a full-width ocean has a fixed height (`ILLUS_H/REF_W` ≈ 40.4vw) that can't be reduced without cropping the waves, the element that gives on short/wide viewports is the **text**: the heading (and the sub-head, in lock-step at `SUBHEAD_RATIO`) is `min()`-capped by the height left after the ocean — `HEADING_H_CAP = (100svh − (OCEAN_VH + FIT_RESERVE) vw) / FIT_DIV` in `hero.tsx`. On tall viewports and phones (where the rem floor wins) the cap never engages and the type is exactly its reference size — the state every sea/callout check measures at (1560×1100); on 16:9 desktops it shrinks just enough for the full ship + waves to clear the fold. **The wave geometry, proportions and animation are untouched** — `<HeroWaves>` re-sizes to the plate through its own `ResizeObserver`. The wordmark and the two callout labels are in `cqw` (container-query width of the plate) rather than `vw` so they and the hull's bob stay locked to the ocean regardless of how the plate is sized; the plate being full-bleed, that currently equals `vw`. `check-callout-track.js` still measures the label-vs-arrow gap at ~0.001px.
- **Product mock screenshots:** reveal with their parent card (`rise`); no independent motion.
- **Team portraits / blog thumbnails:** static on entrance (they ride in with their card's `rise` reveal), then a very subtle `scale(1.03)` on hover only, `duration-ui`/`ease-standard`, clipped by the card's `overflow-hidden` so nothing escapes its rounded corners. This is hover-only, card-scoped — never a page-load zoom, never continuous.
- **CTA dashboard image:** `rise` reveal at `duration-hero`, delayed 200ms behind the copy above it.

No dramatic zoom, Ken Burns, or parallax is applied to any image.

---

## 8. Card Interactions

**Applies to:** product cards (`components/home/products.tsx`), team tiles (`components/home/team.tsx`).

| State | Treatment |
|---|---|
| Rest | Exactly the DESIGN.md frame |
| Hover | `translateY(-4px)` (`hover:-translate-y-1`) + existing shadow escalation (`hover:shadow-card`), both via `transition duration-ui ease-standard` |
| Hover (media inside) | Portrait/screenshot scales to `1.03`, same duration/easing, clipped to the card |

No scale on the card itself (only the media inside it), no rotation, no border-color pulse. `ease-standard` guarantees no bounce or overshoot — the brief explicitly forbids a "bouncy or game-like" feel here.

---

## 9. Button & Link Interactions

**Standard pattern**, used identically on every button/link in the site: `transition duration-{micro|ui} ease-standard` + a Tailwind `hover:`/`active:` state. One mechanism, reused everywhere — no per-component bespoke transition logic.

| Element | Hover | Press (`active:`) |
|---|---|---|
| Nav links (desktop pill) | Text color → brand orange + an underline that traces in from the left (`scaleX(0→1)`, transform-only), `duration-micro` | — |
| "Book a Demo" (nav, desktop + mobile) | `opacity 90%` / background unchanged | `opacity 80%` |
| "Book a Demo" (CTA section) | **Fill-sweep** — a `brand-600` layer wipes across left→right (`scaleX(0→1)` on a `before` pseudo, clipped to the pill), label + arrow riding above it; arrow slides `+6px`, `duration-ui` | `opacity 90%` |
| Testimonial / blog carousel arrows | Border or background color, `duration-micro`; arrow glyph itself nudges 2px in its direction of travel | — |
| Blog card title | Color → brand, `duration-micro`, tied to card hover via `group` | — |

Two signature micro-interactions carry the reference register (Monopo/Origin), both `transform`-only (no layout, no shadow theatrics): the nav **underline-trace** and the CTA **fill-sweep**. The carousel arrow-nudge stays a 2px responsiveness cue.

---

## 10. Navigation Motion

**Component:** `components/site/navbar.tsx`

- **Link hover / active state:** color transition only, `duration-micro`/`ease-standard`.
- **"Book a Demo" button:** opacity transition on hover/press, same tokens.
- **Mobile menu (open):** the panel is conditionally rendered, so each time it mounts it runs the `menu-in` keyframe once — `opacity 0→1` + `translateY(-8px→0)`, `duration-ui`, `ease-premium`. Close is instant (unmount); this stays intentionally simple rather than adding exit-animation state for a menu that's open for seconds at a time.
- **Menu toggle button:** the Menu/X icon swap is instant — no rotation or crossfade. Animating an icon that swaps identity (not just state) adds complexity without a discernible payoff, and the brief is explicit: "do not over-animate the navbar."
- **Condensing sticky header:** the header is `position: fixed` and persists past the hero, and is a solid opaque `bg-white` at every scroll position — no `backdrop-blur`, no translucency, so nothing behind it (hero waves, dark sections) ever shows through. Below 90px of scroll it sits at full reference size (~75px tall); past that threshold (with 12px of hysteresis, so parking on the boundary can't flicker it) the logo, nav pill and CTA shrink to roughly 78% of their reference height — all on `duration-ui`/`ease-standard`. A hairline border and a soft shadow (constant, not scroll-linked) separate it from the page. `fixed` and `absolute` are both out of flow, so this changes no section's resting layout.

  The condensed sizes are still expressed through the same `vw()` reference helper, so the bar stays proportional at every width rather than snapping to fixed pixels.

---

## 11. Mobile Behavior

- All tokens (durations, easing, rise distance) are identical on mobile — there is no separate mobile timing scale. The layout already reflows per DESIGN.md; motion just rides along.
- Hover-only effects (card lift, image zoom, link color) are progressively enhanced: touch devices simply never trigger `:hover`, so nothing is lost, and no functionality ever depends on a hover state firing.
- A tapped element can briefly show its `:hover` styling until the next tap elsewhere — this is native mobile Safari/Chrome `:hover`-after-tap behavior, not JS-driven, and self-resolves. It was left as-is rather than adding `@media (hover: hover)` gating, which the installed Tailwind version (3.3.3) doesn't support natively via a config flag.
- The mobile menu's `menu-in` animation and all scroll reveals behave identically to desktop.

---

## 12. Reduced Motion

Every animation in the system honors `prefers-reduced-motion: reduce`, via two independent, redundant mechanisms:

1. **CSS, sitewide, one place:** `app/globals.css` overrides all four duration variables to `0.01ms` inside the media query. Because every transition and the `menu-in` animation reference these variables (§2), this alone makes every transition on the site effectively instant without touching a single component.
2. **JS, in `Reveal` itself:** on mount, `Reveal` checks `matchMedia('(prefers-reduced-motion: reduce)')` and, if it matches, sets its content visible immediately — skipping the IntersectionObserver entirely rather than relying on the CSS override alone.
3. **Marquee (§9 of the old system / trusted-by strip):** the one continuous animation on the site is explicitly disabled (`motion-reduce:animate-none`), since "make it instant" doesn't make sense for a looping scroll — reduced motion removes it outright and shows the static row.

No content is ever hidden by a reduced-motion state — only the transition duration/distance changes.

---

## 13. Performance Guidelines

- Every transition/animation in the system touches only `opacity`, `transform`, and (for the `mask` reveal) `clip-path`. No layout-triggering properties (`width`, `height`, `margin`, `top`/`left`) are ever animated. `rise-mask` clips with `overflow-hidden` and animates only the child's `transform`.
- **Ambient loops are deliberately few and all gated off-screen**: the Trusted-By marquee, the hero water, the Vision/Mission glyphs, and — added in this revision — exactly **one** signature loop, the radar sweep in the Mission ring scope (§13 below). All but the water are gated by `PauseOffscreen` (which sets `animation-play-state: paused` while a subtree is off-screen); the water is a canvas — drawn in a worker where `OffscreenCanvas` allows — with no CSS animation to pause, so it gates its own clock on the same `IntersectionObserver` terms and additionally stops on a hidden tab. No new ambient motion beyond that single sweep; everything else on the page is still at rest, and every loop is disabled under reduced motion.
- **The one signature ambient (radar sweep).** A slow conic wedge masked to the Mission ring disc (`.radar-sweep-anim`, `--radar-duration: 7s`), the maritime/AI motif — the page's one continuously-moving flourish at rest. `PauseOffscreen`-wrapped, `motion-reduce` off. It is intentionally the *only* new loop: the reference language earns its premium feel through restraint, not activity.
- `Reveal` disconnects its `IntersectionObserver` the moment it fires — there is no ongoing scroll listener per section after the first reveal.
- Scroll-linked motion (§16) adds exactly **one** passive, rAF-throttled `scroll` listener for the whole document, shared by every parallax layer and the header, no matter how many are mounted. Reads and writes are phase-separated within the frame (every `getBoundingClientRect` runs before any `style.transform` write), so a frame can never degenerate into read→write→read layout thrash.
- No JavaScript animation library, scroll-linked-parallax library, or scroll-hijacking is used or needed. Everything is native CSS transitions/keyframes plus one `IntersectionObserver` hook, one shared scroll subscription, and the single self-contained canvas emitter behind the ship's wake (above) — which exists because per-particle physics is the one effect CSS keyframes genuinely cannot express.

---

## 14. Implementation Rules

- **One token source:** all durations/easings live as CSS custom properties in `app/globals.css`, surfaced through `tailwind.config.ts` as `duration-micro|ui|reveal|hero|cinematic|epic` and `ease-standard|premium|cine`. Components reference the token classes; nothing hardcodes a raw `ms` value or `cubic-bezier(...)` inline.
- **One reveal mechanism:** `components/site/reveal.tsx` is the only scroll-triggered entrance mechanism on the site. No section rolls its own `IntersectionObserver` or scroll listener.
- **One hover/press mechanism:** `transition duration-{token} ease-standard` + Tailwind `hover:`/`active:` utilities, applied consistently — no per-component custom transition timing.
- **Content is never gated on JavaScript.** `Reveal`'s hidden pre-animation state is scoped to `[.js_&]` — a class added by a `beforeInteractive` script in `app/layout.tsx`. If JavaScript fails to run, that class is never added, so `Reveal` content (and thus the whole page) renders fully visible by default. JS only ever adds motion; it never gates visibility.
- **`Reveal` fires once.** It disconnects its observer on first intersection; there is no repeat-on-scroll behavior anywhere.
- **Do not introduce a new animation dependency.** None was needed here (native CSS + one `IntersectionObserver` hook covers every requirement in this spec) and none was added.

---

## 15. Animation Anti-Patterns

Explicitly not used anywhere in this system:

- Spring, elastic, or bounce easing.
- **Scroll-jacking** — the page never intercepts, eases, or hijacks the user's own scroll input. (Scroll-*linked* motion is now permitted; see §16. The two are not the same thing: scroll-linked motion reads the scroll position, it never takes it over.)
- Auto-playing carousels (testimonials/blogs are user-controlled only).
- Continuous ambient loops beyond the sanctioned set (marquee, hero water, glyphs, and the one radar sweep — §13). No glow, pulse, shimmer, floating, or self-drifting elements beyond those. Parallax layers move *only* as a function of scroll position — at rest, everything else on the page is still.
- Animating layout-triggering CSS properties (`width`, `height`, `margin`, `top`/`left`, grid tracks). The one exception is the header's condense transition (§10), which animates `height`/`padding` on an out-of-flow element, so it cannot reflow page content.
- Re-triggering scroll reveals on every scroll pass (all reveals fire once).
- Route/page-transition machinery for a single-page site.
- Over-long hero treatment — the hero is cinematic but restrained: the ocean settles on the `cinematic` tier (~1.1s), not a multi-second sequence, and it is the LCP element, so it is never the slowest reveal on the page (the CTA dashboard, at the foot, holds `epic`).
- Animating every paragraph/word individually instead of meaningful visual groups.
- Per-component bespoke transition durations or easings that bypass the shared tokens in §2.
- Parallax on any element whose resting position was measured against a reference screenshot (see the `anchor` rule in §16).

---

## 16. Scroll-Linked Motion

**Component:** `components/site/scroll.tsx`

Motion that tracks scroll *position* continuously, as distinct from `Reveal`,
which fires once on entry. Added deliberately, and it supersedes this document's
former blanket ban on parallax — the ban on scroll-*jacking* stands (§15).

### Shared plumbing

`subscribeScroll(read, write)` is the single entry point. One passive
rAF-throttled listener; all subscriber reads run before all subscriber writes.
Everything below is a no-op under `prefers-reduced-motion` — the layer simply
never receives a transform, so it renders at its exact design position.

### `<Parallax distance anchor axis>`

`transform`-only, so it never triggers layout.

| `anchor` | Drift is zero when… | Use for |
|---|---|---|
| `top` | scroll position is 0 | Anything above the fold |
| `center` | element is centred in the viewport | Below-the-fold background texture |

**The anchor rule.** A viewport-centred parallax is *offset from its design
position at page load* — the element only sits on its reference frame when it
happens to be centred. That is fine for a background texture nobody measured,
and unacceptable for the hero, whose spacing is tuned to the pixel. Anything
above the fold must use `anchor="top"`, which is exactly zero at scroll 0, so
the first painted frame is always the DESIGN.md frame and drift only accumulates
as the user scrolls. `top` drift is capped at `distance` so layers settle rather
than sliding forever.

| Layer | `distance` | `anchor` |
|---|---|---|
| Hero "AI DRIVEN SHIPPING" watermark | `-72` | `top` |
| Hero callouts (anchor / fuel) | `-26` / `-38` | `top` |
| Who We Are ray fan | `-40` | `center` |
| Who We Are watermark ship | `64` | `center` |
| Results dot field | `-56` | `center` |

Negative values drift against the scroll, which reads as "further away". The
hero watermark and ship plate therefore separate as the user scrolls, giving the
composition depth it does not have at rest.

> Centring must live on a wrapper, never on the `Parallax` itself — it writes
> `style.transform`, which would override a `-translate-x-1/2` utility class.

> A scroll-linked masked section-seam (`SeamCurtain`) was prototyped and
> removed: the effect was too subtle to justify the machinery. Section
> continuity now lives entirely in the unified reveal grammar (§4/§6).

### Counters are NOT scroll-linked

The Results stat counters stay on the self-timed count-up cascade in
`animated-stat.tsx` (§6) — `IntersectionObserver` fires once on entry, then each
stat counts 0 → final on `duration-hero`, the next starting two-thirds of the
way through the previous one.

This was tried scroll-linked and reverted. Tying a counter to scroll position
replaces the count-up *animation* with scrollbar tracking: the number becomes a
readout of how far you've scrolled, and anyone who lands with the section
already in view never sees it count at all. The animation is the point.

Scroll-linking suits **continuous, decorative** properties (a parallax offset
has no "finished" state). It does not suit anything with a meaningful start and
end, which is what a counter is.

---

## Implementation Status

Wired in the codebase as of this revision:

1. **Tokens** — `app/globals.css` (`:root` custom properties incl. `cinematic`/`epic`/`ease-cine` + reduced-motion override, `radar-sweep` keyframe), `tailwind.config.ts` (`transitionDuration`, `transitionTimingFunction`, `menu-in` keyframe).
2. **No-JS safety** — `app/layout.tsx` (`beforeInteractive` script adds `.js` to `<html>`).
3. **Reveal** — `components/site/reveal.tsx` (IntersectionObserver; variants `rise|fade|mask|rise-mask|rise-scale|left|right`; `delay`; `duration` `base|slow|cinematic|epic`, ease auto-selected by tier).
4. **Hero** — `components/home/hero.tsx` (headline `rise-mask`/cinematic → copy `rise` → ocean `mask`/cinematic tide, LCP-aware).
5. **All home sections** — every headline shares the `rise-mask`/cinematic grammar (hero, who-we-are, products, results, testimonials, team, blogs, cta); media uses `rise-scale`/cinematic (product cards) and `rise-scale`/epic (cta dashboard); vision-mission panels converge `left`/`right` on the cinematic tier. Hover/press use the shared `transition duration-* ease-standard` pattern.
6. **Marquee** — `components/home/trusted-by.tsx` + `tailwind.config.ts` (`animate-marquee`), pre-existing, left untouched.
7. **Scroll-linked layer (§16)** — `components/site/scroll.tsx` (`subscribeScroll`, `Parallax`, `useScrolledPast`); consumed by `navbar.tsx` (condense — size only, the surface itself is a constant opaque white), `hero.tsx` (watermark + callouts), `who-we-are.tsx` (fan + ship), `results.tsx` (dot field; counters stay self-timed).
8. **Signature ambient** — the radar sweep in `vision-mission.tsx` (`.radar-sweep-anim`, `PauseOffscreen`-wrapped, Mission panel only).
9. **Micro-interactions** — navbar pill links carry a transform-only underline-trace on hover; the CTA button arrow slides on the `ui` tier; both lean on colour/opacity/fill, not shadow (reference register).
10. **Form motion** — `tailwind.config.ts` keyframes `field-in`, `panel-in`, `tick-draw` (the `/schedule-demo` success panel), unchanged.
