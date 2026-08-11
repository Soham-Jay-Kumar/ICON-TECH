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
- **Restrained** — a handful of intentional, well-placed motions beat many competing ones.
- **Fast** — interactions resolve in under 250ms; nothing feels like it's waiting on the animation.
- **Deterministic** — every reveal fires once and settles exactly on the DESIGN.md layout. Nothing loops indefinitely except the one section that is explicitly a marquee.
- **Content-first** — motion never blocks, delays, or hides content. If JavaScript or the animation system fails, every element is fully visible and functional immediately (see §12, §14).

---

## 2. Global Motion Tokens

All durations and easings are CSS custom properties defined once, in `app/globals.css` (`:root`), and exposed as Tailwind utilities via `tailwind.config.ts`. Nothing in the component layer hardcodes a raw millisecond value or cubic-bezier — components reference the token classes below. This is also what makes reduced-motion a one-line override (§12).

| Token (CSS var) | Tailwind class | Value | Use |
|---|---|---|---|
| `--motion-duration-micro` | `duration-micro` | `200ms` | Buttons, links, icon nudges, color/border changes |
| `--motion-duration-ui` | `duration-ui` | `350ms` | Card hover lift, image zoom, mobile menu open |
| `--motion-duration-reveal` | `duration-reveal` | `550ms` | Section/content scroll reveals |
| `--motion-duration-hero` | `duration-hero` | `850ms` | Hero media, largest single sequence on the site |
| `--motion-ease-standard` | `ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | All interactive (hover/press/UI) transitions |
| `--motion-ease-premium` | `ease-premium` | `cubic-bezier(0.16, 1, 0.3, 1)` | All entrance/reveal transitions (strong decelerate, no overshoot) |
| — | `translate-y-6` | `24px` | Standard reveal rise distance |
| — | (prop) | `~100ms` | Standard stagger step between sibling reveals |

These map directly onto the brief's timing bands: micro-interactions 200ms, UI transitions 350ms, section reveals 550ms, the one largest sequence (hero media) 850ms — all inside the requested 150–1000ms range.

---

## 3. Easing System

Two curves, used consistently everywhere:

- **`ease-standard`** (`cubic-bezier(0.4, 0, 0.2, 1)`) — for anything the user directly triggers: hover, press, dropdown, menu. Quick to start, quick to settle. No overshoot.
- **`ease-premium`** (`cubic-bezier(0.16, 1, 0.3, 1)`) — for anything the page triggers on its own: scroll reveals, hero sequence. Strong deceleration into the resting frame, giving a "settling into place" feel appropriate for a precision engineering brand.

No spring, elastic, or bounce easing exists anywhere in the system (see §15).

---

## 4. Page/Section Transitions

This is a single-page site (`app/page.tsx` renders one route). There is no client-side route transition system, and none is introduced — adding one for a single URL would be motion for its own sake.

"Section transitions" on this site means: each section reveals itself once as the user scrolls to it (§6), and in-page navigation (`Navbar` links to `#about`, `#products`, etc.) uses the browser's native anchor scrolling — no custom scroll-hijacking or easing is applied to that scroll itself, so the page always stays responsive to the user's own scroll input.

No cross-fade or masked handoff **between** sections is used. Sections sit on flat, distinct backgrounds (white / tinted / navy) by design; forcing a transition between them would fight that intentional contrast rather than support it.

---

## 5. Hero Motion

**Component:** `components/home/hero.tsx`

The hero carries the strongest motion on the site — a single short sequence, not a cinematic one.

| Element | Trigger | Initial state | Final state | Duration | Delay | Easing |
|---|---|---|---|---|---|---|
| Headline (`h1`) | On mount | `opacity 0`, `translateY(24px)` | `opacity 1`, `translateY(0)` | `duration-reveal` (550ms) | 0ms | `ease-premium` |
| Supporting line | On mount | same as above | same as above | `duration-reveal` | 100ms | `ease-premium` |
| Ocean/ship media | On mount | `opacity 0`, `clip-path: inset(0 0 100% 0)` (masked from the bottom up) | `opacity 1`, `clip-path: inset(0)` | `duration-hero` (850ms) | 220ms | `ease-premium` |

The media uses a mask/clip-path wipe rather than a rise, per §7 — it's the "primary visual," so it gets the more deliberate treatment while the copy above it settles first. Nothing in the hero loops, drifts, or parallaxes at rest — once revealed, the hero is completely static, matching DESIGN.md exactly.

**Mobile:** identical sequence; distances and durations are unchanged (there is no separate mobile timing — the same tokens apply, and the layout itself already adapts per DESIGN.md).

**Reduced motion:** all three elements appear immediately at their final position (see §12).

---

## 6. Scroll Reveal System

**Component:** `components/site/reveal.tsx` (`<Reveal>`), used by every home section.

**Mechanism:** `IntersectionObserver` (`threshold: 0.15`, `rootMargin: "0px 0px -64px 0px"`) watches each `<Reveal>`'s wrapper. The first time it's ≥15% in view, it flips a `visible` flag once and disconnects — it never re-fires, so scrolling back up and down does not replay it.

**Variants:**

| Variant | Initial state | Final state | Used for |
|---|---|---|---|
| `rise` (default) | `opacity 0`, `translateY(24px)` | `opacity 1`, `translateY(0)` | Headings, copy, cards, stats |
| `fade` | `opacity 0` | `opacity 1` | Trusted-by strip, footer — content that shouldn't shift position |
| `mask` | `opacity 0`, `clip-path: inset(0 0 100% 0)` | `opacity 1`, `clip-path: inset(0)` | Hero media only |

**Trigger → Duration → Easing:** viewport entry → `duration-reveal` (550ms), or `duration-hero` for hero media → `ease-premium`.

**Stagger:** siblings in a group (product cards, stat blocks, team tiles, blog cards) pass an incremental `delay` prop, stepped by roughly 100ms, so the group reads left-to-right / top-to-bottom rather than popping in together. Total cascade per group stays under ~400ms.

**What is NOT wrapped in `Reveal`:** individual words, individual sentences within a paragraph, or decorative background elements (ray fan, grid textures, watermark ships). Only meaningful visual groups animate, per the brief.

**Section map:**

| Section | Reveal groups |
|---|---|
| Who We Are | Heading (0ms), body copy (120ms) |
| Vision / Mission | Vision panel (0ms), Mission panel (120ms) |
| Products | Heading, then 2 cards (0/100ms) + asset-lifecycle card (200ms) |
| Trusted By | Whole strip, `fade` — logos themselves scroll via the marquee (§9), independent of this reveal |
| Results | Heading, then 3 stat blocks (0/100/200ms) |
| Testimonials | Heading, quote block (120ms) — quote block also re-reveals on prev/next click since it remounts with the new quote (a content-change cue, not a scroll replay) |
| Team | CEO tile, then 2 tiles (100/200ms) |
| Blogs | Heading + controls, then cards (0/100ms per row) |
| CTA | Copy + button, then dashboard image (200ms, `duration-hero`) |
| Footer | Whole panel, `fade` |

---

## 7. Image/Media Transitions

- **Hero ocean/ship plate:** `mask` reveal on entrance (§5). No hover state — it's not interactive.
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
| Nav links | Text color → brand orange, `duration-micro` | — |
| "Book a Demo" (nav, desktop + mobile) | `opacity 90%` / background unchanged | `opacity 80%` |
| "Book a Demo" (CTA section) | Background darkens + shadow escalates, `duration-ui` | `opacity 90%` |
| Testimonial / blog carousel arrows | Border or background color, `duration-micro`; arrow glyph itself nudges 2px in its direction of travel | — |
| Blog card title | Color → brand, `duration-micro`, tied to card hover via `group` | — |

The arrow-nudge on carousel controls is the one explicit "arrow moves slightly" micro-interaction called for in the brief; it's `transform`-only and capped at 2px, so it reads as responsiveness, not decoration.

---

## 10. Navigation Motion

**Component:** `components/site/navbar.tsx`

- **Link hover / active state:** color transition only, `duration-micro`/`ease-standard`.
- **"Book a Demo" button:** opacity transition on hover/press, same tokens.
- **Mobile menu (open):** the panel is conditionally rendered, so each time it mounts it runs the `menu-in` keyframe once — `opacity 0→1` + `translateY(-8px→0)`, `duration-ui`, `ease-premium`. Close is instant (unmount); this stays intentionally simple rather than adding exit-animation state for a menu that's open for seconds at a time.
- **Menu toggle button:** the Menu/X icon swap is instant — no rotation or crossfade. Animating an icon that swaps identity (not just state) adds complexity without a discernible payoff, and the brief is explicit: "do not over-animate the navbar."
- **No sticky-header transition:** the header is `position: absolute` over the hero in the current layout (it is not fixed/sticky — it scrolls away with the page). Sticky positioning is a layout/behavior change, not a motion one, and the brief's own list of nav treatments is a menu of *possible* interactions ("do not over-animate"), not a checklist to exhaust. It was left out rather than bolted on as a pretext for another transition.

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

- Every transition/animation in the system touches only `opacity`, `transform`, and (in exactly one place, the hero/mask reveal) `clip-path`. No layout-triggering properties (`width`, `height`, `margin`, `top`/`left`) are ever animated.
- The only continuous, indefinitely-looping animation on the entire site is the Trusted-By marquee (`animation: marquee 28s linear infinite`), and it pauses on hover and is disabled under reduced motion. There is no second ambient loop anywhere (no hero drift, no floating footer elements, no pulsing anything).
- `Reveal` disconnects its `IntersectionObserver` the moment it fires — there is no ongoing scroll listener per section after the first reveal.
- No JavaScript animation library, scroll-linked-parallax library, or scroll-hijacking is used or needed. Everything is native CSS transitions/keyframes plus one small `IntersectionObserver` hook.

---

## 14. Implementation Rules

- **One token source:** all durations/easings live as CSS custom properties in `app/globals.css`, surfaced through `tailwind.config.ts` as `duration-micro|ui|reveal|hero` and `ease-standard|premium`. Components reference the token classes; nothing hardcodes a raw `ms` value or `cubic-bezier(...)` inline.
- **One reveal mechanism:** `components/site/reveal.tsx` is the only scroll-triggered entrance mechanism on the site. No section rolls its own `IntersectionObserver` or scroll listener.
- **One hover/press mechanism:** `transition duration-{token} ease-standard` + Tailwind `hover:`/`active:` utilities, applied consistently — no per-component custom transition timing.
- **Content is never gated on JavaScript.** `Reveal`'s hidden pre-animation state is scoped to `[.js_&]` — a class added by a `beforeInteractive` script in `app/layout.tsx`. If JavaScript fails to run, that class is never added, so `Reveal` content (and thus the whole page) renders fully visible by default. JS only ever adds motion; it never gates visibility.
- **`Reveal` fires once.** It disconnects its observer on first intersection; there is no repeat-on-scroll behavior anywhere.
- **Do not introduce a new animation dependency.** None was needed here (native CSS + one `IntersectionObserver` hook covers every requirement in this spec) and none was added.

---

## 15. Animation Anti-Patterns

Explicitly not used anywhere in this system:

- Spring, elastic, or bounce easing.
- Scroll-jacking or scroll-linked parallax.
- Auto-playing carousels (testimonials/blogs are user-controlled only).
- Continuous ambient loops beyond the single Trusted-By marquee (no glow, pulse, shimmer, floating, or drifting elements).
- Animating layout-triggering CSS properties (`width`, `height`, `margin`, `top`/`left`, grid tracks).
- Re-triggering scroll reveals on every scroll pass (all reveals fire once).
- Route/page-transition machinery for a single-page site.
- Cinematic hero treatment — the hero settles in well under a second, not several seconds.
- Animating every paragraph/word individually instead of meaningful visual groups.
- Per-component bespoke transition durations or easings that bypass the shared tokens in §2.

---

## Implementation Status

Wired in the codebase as of this revision:

1. **Tokens** — `app/globals.css` (`:root` custom properties + reduced-motion override), `tailwind.config.ts` (`transitionDuration`, `transitionTimingFunction`, `menu-in` keyframe).
2. **No-JS safety** — `app/layout.tsx` (`beforeInteractive` script adds `.js` to `<html>`).
3. **Reveal** — `components/site/reveal.tsx` (IntersectionObserver, `variant`, `delay`, `duration`).
4. **Hero** — `components/home/hero.tsx` (headline → subcopy → masked media sequence).
5. **All home sections** — `components/home/*.tsx` use `Reveal` for entrance and the shared `transition duration-* ease-standard` pattern for hover/press (products, team, testimonials, blogs, cta, navbar).
6. **Marquee** — `components/home/trusted-by.tsx` + `tailwind.config.ts` (`animate-marquee`), pre-existing, documented here for completeness and left untouched by this revision.
