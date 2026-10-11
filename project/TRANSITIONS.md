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
- **Built on transitions.dev.** Interaction and entrance motion uses the [transitions.dev](https://transitions.dev) recipes and motion-token scale (installed in `app/transitions.css`, §17). Its signature — a short travel resolved out of a light **cross-blur** on a smooth-out curve — is the site's one entrance grammar, from section headings to tab panels to the demo form.
- **Restrained** — a handful of intentional, well-placed motions beat many competing ones. The cinematic register (§2–§3) is spent on the few elements that carry the page — the hero and large media — not sprayed across every block.
- **Two-speed** — *interactions* are fast (`ui` = 250ms, transitions.dev's `--duration-fast`; closes faster still at 150ms), so nothing UI ever feels like it's waiting on the animation; *text* arrives on the 500ms texts-reveal tier, and only *major media* takes the slow cinematic tier. The split is the point (§2).
- **Deterministic** — every reveal fires once and settles exactly on the DESIGN.md layout. The only elements that loop at rest are the sanctioned ambient set (hero water and ship, glyphs, the radar signatures — §13), each `PauseOffscreen`-gated; everything else is still.
- **Content-first** — motion never blocks, delays, or hides content. If JavaScript or the animation system fails, every element is fully visible and functional immediately (see §12, §14).

---

## 2. Global Motion Tokens

Two layers of custom properties, both on `:root`:

1. **The transitions.dev scale** (`app/transitions.css`) — `--duration-*`, `--ease-*`, `--distance-*`, `--scale-*`, `--blur-*`, plus each installed recipe's own semantic variables (`--stagger-*`, `--tabs-*`, `--page-*`, `--dropdown-*`, …). See §17.
2. **The site's own tokens** (`app/globals.css`) — `--motion-duration-*` / `--motion-ease-*`, exposed as Tailwind utilities via `tailwind.config.ts`. Where a site token's *usage* matches a transitions.dev usage it is an **alias** onto that scale, so a Tailwind `duration-ui` and a `.t-*` recipe always read the same number. Where no usage matches (the cinematic tier), it keeps its own value.

Nothing in the component layer hardcodes a raw millisecond value or cubic-bezier — components reference the token classes or the `var(--…)` names. This is also what makes reduced-motion a one-line override (§12).

| Token (CSS var) | Tailwind class | Value | Use |
|---|---|---|---|
| `--motion-duration-micro` | `duration-micro` | `200ms` | Link/icon colour and border changes |
| `--motion-duration-ui` | `duration-ui` | `var(--duration-fast)` = **250ms** | Hover lifts, image zoom, tab slides, menu/panel open, navbar condense |
| `--motion-duration-reveal` | `duration-reveal` | `var(--duration-very-slow)` = **500ms** | Text reveals (headings, body copy, stats, form fields) |
| `--motion-duration-hero` | `duration-hero` | `850ms` | Legacy media band |
| `--motion-duration-cinematic` | `duration-cinematic` | `1200ms` | **Cinematic tier** — hero headline + ocean, converging Vision/Mission panels, the Products showcase |
| `--motion-duration-epic` | `duration-epic` | `1600ms` | The single grandest sequence (the CTA dashboard) |
| `--motion-ease-standard` | `ease-standard` | `var(--ease-smooth-out)` = `cubic-bezier(0.22, 1, 0.36, 1)` | All interactive (hover/press/UI) transitions |
| `--motion-ease-premium` | `ease-premium` | `var(--ease-smooth-out)` | Base entrance/reveal transitions |
| `--motion-ease-cine` | `ease-cine` | `cubic-bezier(0.19, 1, 0.22, 1)` | **Cinematic tier** — the long, gliding entrance curve |
| `--stagger-distance` | (Reveal) | `12px` (`--distance-medium`) | Standard reveal rise distance |
| `--stagger-blur` | (Reveal) | `3px` (`--blur-medium`) | Standard reveal cross-blur |
| `--blur-small` | (Reveal, cards) | `2px` | Panel/media cross-blur, card face swap |
| — | (prop) | **80ms** (`--duration-micro`) | Stagger step between sibling section reveals |
| `--duration-stagger` | — | **40ms** | Stagger step between items inside one block (form fields, card lines, blog pair) |

The ui/reveal/ease values were retuned from 350ms / 550ms / `cubic-bezier(0.4, 0, 0.2, 1)` / `cubic-bezier(0.16, 1, 0.3, 1)` by matching each one's *usage* to transitions.dev's documented usage (transitions-polish: "match on usage, never on the nearest number"), and the stagger from ~100–120ms to the transitions.dev beat, which keeps every group's total stagger under ~300ms.

**Three tiers, split by what moves.**

| Tier | What moves | Duration | Ease |
|---|---|---|---|
| **UI** | buttons, links, nav, tabs, menus, card hover | `micro` 200 / `ui` 250 (closes 150) | `ease-standard` (smooth-out) |
| **Reveal** | section headings, body copy, stats, form fields, card faces | `reveal` 500 | `ease-premium` (smooth-out) + cross-blur |
| **Cinematic** | the hero headline and ocean, large media, converging panels | `cinematic` 1200 / `epic` 1600 | `ease-cine` |

---

## 3. Easing System

- **`--ease-smooth-out`** (`cubic-bezier(0.22, 1, 0.36, 1)`) — transitions.dev's default, and what both `ease-standard` and `ease-premium` now resolve to: anything the user triggers (hover, press, tabs, menus) and every text/UI entrance. A fast, decisive start that settles softly; no overshoot.
- **`ease-cine`** (`cubic-bezier(0.19, 1, 0.22, 1)`) — the cinematic tier only: the hero headline/media, the converging Vision/Mission panels, the Products showcase, the CTA dashboard. A long, gliding ease-out, still no overshoot. It is the curve that makes a slow reveal read as *deliberate* rather than merely *late*.
- **Recipe-specific curves** that transitions.dev ships with a fixed intent are used as shipped: `ease-in-out` for the icon and text swaps and the skeleton reveal, `linear` for the shimmer, the shake's per-segment smooth-out, and the spinning counter's `cubic-bezier(0.16, 1, 0.3, 1)`.

No spring, elastic, or bounce easing exists anywhere in the system (see §15). The one transitions.dev recipe that ships an overshoot — the success check's bob — has `--check-ease-bob` retuned to smooth-out in `app/transitions.css`.

---

## 4. Page/Section Transitions

The site is two routes (`/` and `/schedule-demo`), and there is no client-side route transition system — none is introduced. Section links are plain `<a>` cross-page anchors (CLAUDE.md, "Cross-page navigation"), so leaving `/schedule-demo` is a full page load, and a route transition would only ever play on half the navigations.

"Section transitions" on this site means: each section reveals itself once as the user scrolls to it (§6), and in-page navigation (`Navbar` links to `#what-we-do`, `#about`, …) uses the browser's native anchor scrolling — no custom scroll-hijacking or easing is applied to that scroll itself, so the page always stays responsive to the user's own input.

**Continuity comes from a unified reveal grammar, not per-seam machinery.** Every section's heading uses the same masked, cross-blurred line-rise and the same 80ms stagger cadence, so the whole page reads as one deliberately choreographed sequence as you scroll, while each section keeps its own flat, distinct background (white / tinted / navy). An earlier scroll-linked colour-bleed at a section seam was tried and **removed**: it added machinery for an effect too subtle to earn its keep.

Within a section, **swapping content in place** (the Sense Series tabs, the blog pair) uses transitions.dev's *page side-by-side*: the incoming item slides 8px in from the side the user navigated toward, out of a 3px blur, over 250ms (§8, §17).

---

## 5. Hero Motion

**Component:** `components/home/hero.tsx`

The hero carries the strongest motion on the site — a layered cinematic sequence with clear hierarchy, not three identical fade-ups.

| Element | Trigger | Initial → Final | Duration | Delay | Easing |
|---|---|---|---|---|---|
| Headline (`h1`) | On mount | `rise-mask`: rises up out of an `overflow-hidden` frame and out of a 3px blur + opacity | `cinematic` (1200ms) | 0ms | `ease-cine` |
| Supporting line | On mount | `rise`: `opacity 0`, `translateY(12px)`, `blur(3px)` → settled | `reveal` (500ms) | 100ms | `ease-premium` |
| Ocean/ship media | On mount | `mask`: `clip-path: inset(0 0 100% 0)` → `inset(0)` (tide fills in from the waterline) + opacity | `cinematic` (1200ms) | 140ms | `ease-cine` |
| Alert leader, run | Mount timer | `scaleX(0)` → `scaleX(1)`, growing out of the hotspot | `ui` (250ms) | 900ms left / 1050ms right | `ease-standard` |
| Alert leader, drop | Mount timer | `scaleY(0)` → `scaleY(1)`, growing down from the elbow | `ui` (250ms) | + one `ui` beat | `ease-standard` |
| Alert card | Mount timer | `opacity 0` → `1` | `reveal` (500ms) | + 1.6 `ui` beats | `ease-premium` |
| Alert hotspot pulse | Ambient loop | one white ring, `scale(1)` → `scale(2.3)` + fade, then rests | 3s cycle | — | `ease-premium` |

**The ship, the water, and the hull's bob are not part of the transitions.dev pass and must stay exactly as they are.** They are a renderer (`hero-waves.tsx`, `hero-water-*.ts`, `hero-sea.tsx`), not CSS transitions, and every constraint on them in CLAUDE.md ("The hero ocean") still holds. `scripts/check-sea-ship.js` and `scripts/check-callout-track.js` pass unchanged after the retune. The only hero edit was making the leader's drop and card delays derive from the `ui` token (`var(--motion-duration-ui)`, `calc(var(--motion-duration-ui) * 1.6)`) instead of the hardcoded 350ms / 600ms that assumed the old 350ms `ui`, so the hotspot → line → card chain still lands each step as the previous one finishes.

The headline rises out of its mask on the cinematic tier while the copy rises under it — a sequence, not a flat group. The media's bottom-up clip reads as a rising tide (the maritime signature). It is held to the `cinematic` tier, not `epic`, and to a short delay, **because the ocean plate is the page's LCP element** — the grandest `epic` reveal is spent on the CTA dashboard at the foot instead. The `mask` reveal is deliberately **not** blurred: a blur on the LCP plate would cost paint time on the most expensive element on the page, and blur softens a slide, not a clip.

The two alerts are cards on the waves, each joined to a hotspot on the hull by a 1.5px navy leader with one elbow. The order is the point: the leader draws **out of the hotspot**, turns down, and the card arrives at its foot — hotspot → line → card, the path the eye should take — and the slow hotspot pulse keeps pointing back to where it starts. Left leads right by 150ms, so the pair reads as a sequence rather than one symmetrical flash. The card only fades: a rise would open a gap between the card and the leader that has just reached it.

The hotspots are markers painted *inside* the ship raster, so they ride the hull's full transform. Each alert group (pulse, leader, card) is translated by the displacement **its own hotspot** undergoes — the bob plus the roll about the ship's pivot — but is never rotated, so the card stays square and crisp. `scripts/check-callout-track.js` measures the residual gap (currently ~0.001px) and refuses to pass on a hull that is not actually moving. The alerts do not parallax: they belong to the ship, and the ship does not.

Their entrance is driven by a **mount timer in `AlertAnnotation`, not by `<Reveal>`**, and that is a correctness requirement rather than a preference. The ocean plate is itself a `mask` Reveal, and a clip-collapsed ancestor reports 0% intersection for everything inside it, so a nested Reveal cannot fire until the clip has opened past it. The timer uses the shared tokens, a `[.js_&]`-scoped hidden state so no-JS renders the alerts visible rather than blank, and an isomorphic layout effect plus `motion-reduce:!delay-0` so reduced-motion users get them at once with no hidden-then-visible flash.

**Mobile:** identical sequence for the copy and the plate. The alerts overlay the plate from `lg`; below that the cards stack under the ship with no leaders and no pulse, entering with a plain `rise` Reveal.

**Reduced motion:** all elements appear immediately at their final position (see §12).

---

## 6. Scroll Reveal System

**Component:** `components/site/reveal.tsx` (`<Reveal>`), used by every home section and `/schedule-demo`.

**Mechanism:** `IntersectionObserver` (`threshold: 0.15`, `rootMargin: "0px 0px -64px 0px"`) watches each `<Reveal>`'s wrapper. The first time it's ≥15% in view, it flips a `visible` flag once and disconnects — it never re-fires.

**The transitions.dev texts reveal is the base grammar.** Every moving variant now resolves out of a **cross-blur lane** — the recipe's signature — alongside its travel. `transition-property` is `opacity, transform, clip-path, filter`; the blur is only present in the hidden state, so a settled element carries **no** `filter` at all.

**Variants:**

| Variant | Initial state | Final state | Used for |
|---|---|---|---|
| `rise` (default) | `opacity 0`, `translateY(var(--stagger-distance))` (12px), `blur(var(--stagger-blur))` (3px) | settled, unblurred | Body copy, minor groups, stats — the texts-reveal recipe |
| `fade` | `opacity 0` | `opacity 1` | Eyebrows, the Products showcase, footer — content that shouldn't shift. No blur: blur softens a slide, never a plain fade |
| `mask` | `opacity 0`, `clip-path: inset(0 0 100% 0)` | `opacity 1`, `clip-path: inset(0)` | Hero ocean (bottom-up tide fill). No blur (§5) |
| `rise-mask` | child at `translateY(100%)`, `opacity 0`, `blur(3px)`, inside an `overflow-hidden` frame | settled, unblurred | **Section headings** — type rises from behind a hard edge and resolves out of the blur as it clears it |
| `rise-scale` | `opacity 0`, `translateY(40px)`, `scale(1.06)`, `blur(var(--blur-small))` (2px) | settled at `scale(1)` | **Media that "develops"** — the CTA dashboard |
| `left` | `opacity 0`, `translateX(-32px)`, `blur(2px)` | settled | Left half of a side-by-side pair |
| `right` | `opacity 0`, `translateX(32px)`, `blur(2px)` | settled | Right half of a side-by-side pair; the demo form card |

The two clipped variants (`mask` clip-path, `rise-mask` overflow) animate an inner child, never the observed node — for `mask` a clip-collapsed node reports 0% intersection forever and never fires; for `rise-mask` the outer node is the `overflow-hidden` frame the child rises out of. `left`/`right` converge a two-up group on its centre seam; used by the Vision/Mission panels.

**Duration is a per-`Reveal` prop** (`base` 500 / `slow` 850 / `cinematic` 1200 / `epic` 1600), and the ease follows the tier automatically: `base`/`slow` → `ease-premium` (smooth-out), `cinematic`/`epic` → `ease-cine`. **Section headings are on `base`** — they are text reveals, and transitions.dev's text reveal is 500ms. Only the hero headline, large media and the converging panels keep the cinematic tier.

**Stagger:** siblings in a section pass an incremental `delay` of **80ms** (`--duration-micro`, transitions.dev's step for a few large items), so eyebrow → heading → body reads in order and the whole group lands inside ~300ms.

**What is NOT wrapped in `Reveal`:** individual words, individual sentences within a paragraph, or decorative background elements (ray fan, grid textures, watermark ships). Only meaningful visual groups animate.

**Section map** — every section headline shares one grammar: eyebrow `fade`, then the `h2` on `rise-mask` 80ms later.

| Section | Reveal groups |
|---|---|
| Hero | §5 |
| What We Do | Eyebrow `fade`, heading `rise-mask` (80ms); the cards' own hover motion is §8 |
| Products | Eyebrow `fade`, heading `rise-mask` (80ms), then the showcase `fade`/cinematic (160ms) |
| Who We Are | Eyebrow `fade`, heading `rise-mask` (80ms), body `rise` (160ms) |
| Vision / Mission | Vision panel `left`/cinematic (0ms), Mission panel `right`/cinematic (80ms) — converge on the centre seam; Mission carries the radar signature (§13) |
| Results | Eyebrow `fade`, heading `rise-mask` (80ms), then 4 stat blocks `rise` (0/80/160/240ms). The numbers themselves spin (§16) |
| Blogs | Eyebrow `fade`, heading `rise-mask` (80ms); controls `rise` (80ms), then cards (0/80ms) |
| CTA | Heading `rise-mask`, copy `rise` (80ms), button `rise` (160ms), then dashboard `rise-scale`/**epic** (240ms) — the grandest single reveal, at the page foot where it costs no LCP |
| Footer | Whole panel, `fade` |
| /schedule-demo | Eyebrow + h1 `rise`, steps `rise` (80ms), form card `right` (160ms); inside the card, fields stagger in on the texts-reveal recipe (§9) |

---

## 7. Image/Media Transitions

- **Hero ocean/ship plate:** `mask` reveal on entrance (§5). No hover state — it's not interactive.
  - **Fits the viewport on load (sizing, not motion — noted here because the reveal runs inside it).** The whole composition — ship and the full wave field — is visible immediately, without scrolling, and the ocean stays **full-bleed (100vw) at every width**. Because a full-width ocean has a fixed height (`ILLUS_H/REF_W` ≈ 40.4vw) that can't be reduced without cropping the waves, the element that gives on short/wide viewports is the **text**: the heading (and the sub-head, in lock-step at `SUBHEAD_RATIO`) is `min()`-capped by the height left after the ocean — `HEADING_H_CAP` in `hero.tsx`. **The wave geometry, proportions and animation are untouched** — `<HeroWaves>` re-sizes to the plate through its own `ResizeObserver`.
- **Product artwork:** rides in with its panel; on a tab switch the whole panel runs the page side-by-side entrance (§8). The Asset Sense radar keeps spinning straight through the switch.
- **Blog thumbnails:** transitions.dev **skeleton loader and reveal** — a placeholder pulses in the image's own fixed-height slot until the remote image decodes, then the two cross-fade through a 2px cross-blur over 400ms (`--reveal-dur`, `ease-in-out`). Layout-free (the slot is sized, both layers are absolute). A cached image reveals before paint with no skeleton; a failed load reveals too. Without JS the content shows and the skeleton does not (`html:not(.js)` rule, §14).
- **Blog thumbnails, hover:** a very subtle `scale(1.03)`, `duration-ui`/`ease-standard`, clipped by the card's `overflow-hidden`. Hover-only, card-scoped — never a page-load zoom, never continuous.
- **CTA dashboard image:** `rise-scale` reveal on the `epic` tier, 240ms behind the copy above it.

No dramatic zoom, Ken Burns, or parallax is applied to any image.

---

## 8. Card & Panel Interactions

**What We Do cards** (`components/what-we-do/box.tsx`, `reveal-*.tsx`):

| State | Treatment |
|---|---|
| Rest | Exactly the DESIGN.md frame |
| Hover / focus / tapped | Card lifts `translateY(-4px)` + `shadow-panel` (`ui`, smooth-out). The resting face lifts 12px, fades and blurs to 2px; the revealed face fades in out of the same 2px blur — one cross-blurred swap (transitions.dev panel/skeleton reveal) |
| Revealed face content | transitions.dev **texts reveal**, hover-driven (`.t-stagger-hover`): each line rises 12px out of a 3px blur over 500ms, 40ms after the one before — eyebrow, heading, summary, the three loop tiles, then the loop line (280ms end to end). The consulting face does the same for its headline, subline and service list |
| Leaving | The recipe's quiet exit: one 200ms fade, with the Y return and blur deferred until the line is invisible — never the stagger replayed in reverse |
| Loop tile hover | Its sentence opens via `grid-template-rows` 0fr → 1fr on `ui`/smooth-out — the transitions.dev accordion's values |
| "Explore →" | transitions.dev learn-more arrow (§9). At rest it runs the **Explore cue** (`.t-explore-cue`) on a 2.4s loop: after a beat of stillness the arrow flies 14px out forward through the icon swap's 2px blur and fades, and a fresh one slides in from behind and settles (ease-in-out, no overshoot). It is the cards' only affordance on touch, where hover never fires, so it stops the moment a card is hovered, focused or tapped open. (A first cut replayed the learn-more nudge on a loop; it was too subtle to notice. An orange shimmer across the word was then tried alongside the arrow and removed on request.) |

**Sense Series** (`components/products/product-showcase.tsx`):

- **Tab indicator — transitions.dev tabs sliding.** One orange underline travels between tabs (250ms, `--tabs-ease`) instead of each tab growing its own. The recipe measures `offsetLeft`/`offsetWidth` in JS; here the tabs are three equal grid columns, so the position is exact in CSS (`width: 1/3`, `translateX(n × 100%)`) and is already right in the server-rendered first paint.
- **Panel swap — transitions.dev page side-by-side (enter half).** The incoming product slides 8px in from the side of the tab you moved toward (arrow keys keep the key's direction even when they wrap), out of a 3px blur, over 250ms. The outgoing panel unmounts rather than sliding out: the three products differ in height, and the recipe's absolute-positioned pages would either collapse the container or hold it at the tallest product — a resting-layout change.

**Blog pair** (`components/home/blogs.tsx`): prev/next remounts the pair with the same page side-by-side entrance from the clicked side, the second card one `--duration-stagger` (40ms) behind the first.

**Hover in general:** in, quick and direct (`ui`, smooth-out); out, the same curve — this site does not use transitions.dev's springy hover-out (`--ease-bounce-strong`), per §15. No scale on cards themselves (only the media inside them), no rotation, no border-colour pulse.

---

## 9. Button, Link & Form Interactions

**Standard pattern**, used on every button/link: `transition duration-{micro|ui} ease-standard` + a Tailwind `hover:`/`active:` state.

| Element | Hover | Press (`active:`) |
|---|---|---|
| Nav links (desktop pill) | Text colour → brand orange (`micro`); the white active pill slides between links (§10) | — |
| "Schedule a Demo" (nav, desktop + mobile) | Background navy-shift | `opacity 80%` |
| "Schedule a Demo" (CTA section) | **Fill-sweep** — a `brand-600` layer wipes across left→right (`scaleX(0→1)` on a `before` pseudo, clipped to the pill); the arrow is the **learn-more** arrow | `opacity 90%` |
| "Schedule A Demo" (product panel), "Explore" (What We Do cards) | transitions.dev **learn-more hover**: the arrow shifts 2px forward and its head opens ±8° about the tip (350ms, smooth-out), returning on hover-out. "Explore" also runs the Explore cue at rest (§8) | — |
| Blog carousel arrows | Border or background colour, `micro`; arrow glyph nudges 2px in its direction of travel | — |
| Blog card title | Colour → brand, `micro`, tied to card hover via `group` | — |

The learn-more arrow (`components/site/learn-arrow.tsx`) is drawn with lucide's `ArrowRight` geometry, split so the two arms can rotate about the tip — at rest it is the same icon it replaced. The trigger element carries `t-learn`.

**Demo form** (`components/demo/demo-form.tsx`):

| Moment | Recipe | Treatment |
|---|---|---|
| Card appears | (Reveal `right`) | then the five fields stagger in on the **texts reveal** values — 12px rise out of a 3px blur, 500ms, one `--stagger-stagger` (40ms) apart |
| Invalid submit | **Error state shake** | every field still in error shakes (6px → −6px → 4px → 0, 280ms, per-segment smooth-out) — replayed on each invalid submit. The border tweens to red; the message fades in over 280ms. Unlike the recipe there is no auto-revert: a validation error stays until the field is fixed |
| Submitting | **Text states swap** + **shimmer text** | "Submit" exits up through a 2px blur and "Sending…" rises in (150ms each way, `components/site/text-swap.tsx`); while the request is in flight the label shimmers (white highlight band over 60% white) |
| Delivery failed | (texts reveal) | the alert rises in on the field entrance |
| Delivered | **Modal open** + **success check** | the panel scales up from 0.96 (250ms, smooth-out); the tick fades, rotates in from 80°, rises 40px out of a 10px blur while its stroke draws (500ms, path 80ms behind) |

---

## 10. Navigation Motion

**Component:** `components/site/navbar.tsx`

- **Active section — transitions.dev tabs sliding.** One white pill (`.t-tabs-pill`, sized to the reference's active-link pill) travels to the active link — on click and as the scroll spy changes section — over 250ms, `--tabs-ease`. JS writes the active link's `offsetLeft`/`offsetWidth` onto it. Anything that moves the links *without* a change of section (first paint, a resize, Poppins swapping in, the condense) snaps it instead (`transition: none`, reflow, restore), via a `ResizeObserver` that is a no-op when the target hasn't changed — so the width change a section switch itself causes never cuts its slide. Until the pill has measured itself the active link keeps its own white background, so the first paint, and a page without JS, still show the DESIGN.md active state.
- **Link hover:** colour only, `micro`/`ease-standard`.
- **"Schedule a Demo" button:** background transition on hover, opacity on press.
- **Mobile menu — transitions.dev menu dropdown.** The panel grows from the top-right (its trigger's corner): `scale(0.97)` + `opacity 0` → rest over 250ms; it closes faster and quieter, to `scale(0.99)` over 150ms, and only then unmounts — so it never leaves the header's flow mid-animation. Re-opening during a close picks up from where it is.
- **Menu toggle — transitions.dev icon swap.** Menu and X share one grid cell and cross-fade through blur (2px) and scale (0.25 → 1) over 250ms, `ease-in-out`.
- **Condensing sticky header:** the header is `position: fixed` and solid opaque `bg-white` at every scroll position. Below 90px of scroll it sits at full reference size (~75px tall); past that threshold (with 12px of hysteresis) the logo, nav pill and CTA shrink to roughly 78% of their reference height on `ui`/`ease-standard`. `fixed` is out of flow, so this changes no section's resting layout. The condensed sizes still use the `vw()` reference helper.

---

## 11. Mobile Behavior

- All tokens (durations, easing, distances, blur) are identical on mobile — there is no separate mobile timing scale. The layout already reflows per DESIGN.md; motion just rides along.
- Hover-only effects (card lift, image zoom, learn-more arrow, link colour) are progressively enhanced — except the What We Do "Explore" arrow, whose Explore cue (§8) exists precisely because a touch reader would otherwise get no cue that the cards open: touch devices simply never trigger `:hover`, and no functionality depends on a hover state firing. The What We Do cards latch their reveal on tap (`data-on`), and the texts-reveal stagger keys off that state too.
- A tapped element can briefly show its `:hover` styling until the next tap elsewhere — native mobile behaviour, left as-is.
- The mobile menu dropdown, icon swap and all scroll reveals behave identically to desktop.

---

## 12. Reduced Motion

Every animation in the system honours `prefers-reduced-motion: reduce`, through independent, redundant mechanisms:

1. **CSS, sitewide, one place:** `app/globals.css` overrides all six `--motion-duration-*` variables to `0.01ms` inside the media query. Every Tailwind `duration-*` transition and keyframe reads these, so this alone makes them instant.
2. **Every transitions.dev recipe ships its own guard** (`app/transitions.css`), kept verbatim: tabs pill, dropdown, icon swap, page slide (and the project's page-enter), texts reveal (and its hover variant), shake, error message, success check, text swap, shimmer, skeleton, learn-more, spinning counter. Under reduced motion each one is simply in its end state.
3. **JS, where motion is orchestrated:** `Reveal` sets content visible immediately and skips the IntersectionObserver; the hero alerts appear at once; `AnimatedStat` renders the plain final number and never builds reels; `TextSwap` swaps the label in place; the mobile menu closes without waiting out the close duration.
4. **Ambient loops** (radar sweeps, sonar, glyphs, hotspot pulse, ship sail, the What We Do Explore cue) are removed outright — "make it instant" doesn't make sense for a loop. The hero water stops on its own.

No content is ever hidden by a reduced-motion state — only the motion changes.

---

## 13. Performance Guidelines

- Transitions touch `opacity`, `transform`, `filter` (blur), and, for the `mask` reveal, `clip-path`. **Blur exists only in motion:** every hidden state carries it and every rest state has `filter: none` — mount animations use `backwards` fill, never `both`, so nothing is left on a settled element. The spinning counter's vertical SVG blur is decayed to 0 per column and the reels are replaced by plain text when they land.
- Two transitions.dev recipes animate a layout property, both on out-of-flow elements that cannot reflow anything around them: the tabs pills tween `width` (`position: absolute`), and the loop tiles' sentence uses `grid-template-rows` (the accordion recipe) inside a tile whose height is reserved. The header condense (§10) animates `height`/`padding` on a fixed element.
- **Ambient loops are deliberately few and all gated off-screen**: the hero water and ship, the Vision/Mission glyphs, the hero hotspot pulse (§5), the radar sweep in the Mission ring scope, the What We Do **Explore cue** (§8 — `.t-explore-cue`, the cards wrapped in `PauseOffscreen`), and the **Asset Sense radar** in the Sense Series panel (`components/products/asset-radar.tsx` — a conic sweep over fixed targets, `PauseOffscreen`-wrapped, `--radar-duration: 6s`). All but the water are gated by `PauseOffscreen`; the water is a canvas that gates its own clock. The transitions.dev pass added **no** ambient loops except the form's shimmer, which only runs while a request is in flight, and the Explore cue (arrow fly-through), added on request so the cards read as tappable on phones. **The Asset Sense radar and the Mission radar are untouched by this pass** — the tab switch animates the panel around the radar, not the radar itself, and its sweep keeps running through the switch.
- `Reveal` disconnects its `IntersectionObserver` the moment it fires — there is no ongoing scroll listener per section after the first reveal.
- Scroll-linked motion (§16) adds exactly **one** passive, rAF-throttled `scroll` listener for the whole document. Reads and writes are phase-separated within the frame.
- No JavaScript animation library is used or needed. transitions.dev is CSS recipes, not a dependency: everything is native CSS transitions/keyframes plus small orchestration snippets (class toggles, a reflow, a measured position).

---

## 14. Implementation Rules

- **One token source per layer:** the transitions.dev scale and recipe variables live in `app/transitions.css`; the site's `--motion-*` tokens live in `app/globals.css` and alias onto that scale where usage matches. Components reference the Tailwind token classes or `var(--…)`; nothing hardcodes a raw `ms` value or `cubic-bezier(...)` inline.
- **Recipes are pasted verbatim** in part 2 of `app/transitions.css` — selectors, property lists and reduced-motion guards unchanged. Any adaptation to this codebase goes in part 3 ("Project wiring") with the reason next to it, or inline at the one use site (e.g. a tab pill's geometry). The only retuned recipe variable is `--check-ease-bob` (§3).
- **One reveal mechanism:** `components/site/reveal.tsx` is the only scroll-triggered entrance mechanism on the site. No section rolls its own `IntersectionObserver` for an entrance (the Results cascade observes only to start its counters).
- **Content is never gated on JavaScript.** `Reveal`'s hidden state is scoped to `[.js_&]`; the skeleton reveal has an `html:not(.js)` fallback; the nav pill keeps the active link's own background until it has measured; the Sense Series tab indicator is positioned in CSS; the stats server-render their final values. If JavaScript fails, or the hydration watchdog in `app/layout.tsx` withdraws `js`, everything renders fully visible.
- **`Reveal` fires once.** No repeat-on-scroll behaviour anywhere.
- **Do not introduce a new animation dependency.** transitions.dev is installed as CSS, not a package.

---

## 15. Animation Anti-Patterns

Explicitly not used anywhere in this system:

- Spring, elastic, or bounce easing — including transitions.dev's own (`--ease-bounce`, `--ease-bounce-strong`, the toggle and like-button pops). The success check's bob is retuned to smooth-out.
- **Scroll-jacking** — the page never intercepts, eases, or hijacks the user's own scroll input. (Scroll-*linked* motion is permitted; see §16.)
- Auto-playing carousels (Sense Series tabs and blogs are user-controlled only).
- Continuous ambient loops beyond the sanctioned set (§13). No glow, pulse, shimmer, floating, or self-drifting elements at rest — the form shimmer runs only while a request is in flight, and the Explore arrow fly-through is the one sanctioned idle cue.
- Blur on a plain fade, a clip, a colour change, or a settled element (§6, §13).
- Animating layout-triggering CSS properties on in-flow elements. The exceptions are all out of flow or space-reserved: the tab pills' `width`, the loop tiles' `grid-template-rows`, and the header condense (§13).
- Re-triggering scroll reveals on every scroll pass (all reveals fire once).
- Route/page-transition machinery.
- Over-long hero treatment — the hero is cinematic but restrained: the ocean settles on the `cinematic` tier (~1.1s), and it is the LCP element, so it is never the slowest reveal on the page (the CTA dashboard holds `epic`).
- Animating every paragraph/word individually instead of meaningful visual groups (the What We Do faces stagger *lines and tiles*, not words).
- Per-component bespoke transition durations or easings that bypass the tokens in §2.
- Parallax on any element whose resting position was measured against a reference screenshot (see the `anchor` rule in §16).
- Touching the hero ship/water renderer or either radar to make them "match" the transitions.dev grammar (§5, §13).

---

## 16. Scroll-Linked Motion

**Component:** `components/site/scroll.tsx`

Motion that tracks scroll *position* continuously, as distinct from `Reveal`, which fires once on entry. The ban on scroll-*jacking* stands (§15).

### Shared plumbing

`subscribeScroll(read, write)` is the single entry point. One passive rAF-throttled listener; all subscriber reads run before all subscriber writes. Everything below is a no-op under `prefers-reduced-motion` — the layer simply never receives a transform, so it renders at its exact design position.

### `<Parallax distance anchor axis>`

`transform`-only, so it never triggers layout.

| `anchor` | Drift is zero when… | Use for |
|---|---|---|
| `top` | scroll position is 0 | Anything above the fold |
| `center` | element is centred in the viewport | Below-the-fold background texture |

**The anchor rule.** A viewport-centred parallax is *offset from its design position at page load*. That is fine for a background texture nobody measured, and unacceptable for the hero, whose spacing is tuned to the pixel. Anything above the fold must use `anchor="top"`, which is exactly zero at scroll 0, so the first painted frame is always the DESIGN.md frame. `top` drift is capped at `distance` so layers settle rather than sliding forever.

| Layer | `distance` | `anchor` |
|---|---|---|
| Hero "AI DRIVEN SHIPPING" wordmark | `+36` (see CLAUDE.md, "The hero ocean") | `top` |
| Who We Are ray fan | `-40` | `center` |
| Who We Are watermark ship | `64` | `center` |
| Results dot field | `-56` | `center` |

> Centring must live on a wrapper, never on the `Parallax` itself — it writes `style.transform`, which would override a `-translate-x-1/2` utility class.

### Counters are NOT scroll-linked — they spin

The Results stats use the transitions.dev **spinning counter** (`components/home/animated-stat.tsx`). When the grid enters the viewport (one `IntersectionObserver`, once), each digit of the stat's leading integer becomes a clipped reel of 0–9 cells that spins through three full turns and lands on its digit (`--reel-dur` 1400ms, `--reel-ease`), the columns `--reel-stagger` (90ms) apart, under a vertical-only SVG motion blur that decays as each reel settles. Suffixes stay still ("24/7" spins "2" and "4"; "/7" holds). The cascade is unchanged: each stat starts the next two-thirds of the way through its own run.

Three states keep the number readable at every moment: the server/no-JS/reduced-motion render is the plain final string; once hydrated, the reels rest on 0 while they wait their turn (the recipe's edge-fade mask is applied only while a reel moves); and on landing the reels are replaced by the plain final string again. Each column is sized by an invisible copy of its *final* digit with the strip centred over it, so the landing frame already sits where the text will and the swap moves nothing.

This was tried scroll-linked and reverted. Tying a counter to scroll position replaces the animation with scrollbar tracking: anyone who lands with the section already in view never sees it at all. Scroll-linking suits **continuous, decorative** properties; it does not suit anything with a meaningful start and end.

---

## 17. transitions.dev

[transitions.dev](https://transitions.dev) is installed as a skill pair in `.agents/skills/` — `transitions-dev` (the recipe catalogue) and `transitions-polish` (the motion-token audit rules) — and as CSS in **`app/transitions.css`**, imported by `app/layout.tsx` straight after `globals.css`. That file has three parts: (1) the `:root` token scale plus the variables of every recipe used, (2) the recipes, verbatim, (3) project wiring.

### Recipes in use

| Recipe | Where | Files |
|---|---|---|
| **Texts reveal** | `Reveal` rise/rise-mask lanes (every section); What We Do card faces (hover-driven); demo form fields | `site/reveal.tsx`, `what-we-do/reveal-*.tsx`, `tailwind.config.ts` (`field-in`) |
| **Tabs sliding** | Desktop nav active pill; Sense Series tab underline | `site/navbar.tsx`, `products/product-showcase.tsx` |
| **Page side-by-side** (enter half) | Sense Series panel swap; blog prev/next | `products/product-showcase.tsx`, `home/blogs.tsx` |
| **Menu dropdown** | Mobile menu open/close | `site/navbar.tsx` |
| **Icon swap** | Mobile menu ↔ close glyph | `site/navbar.tsx` |
| **Learn more hover** | CTA, product "Schedule A Demo", What We Do "Explore" | `site/learn-arrow.tsx`, `what-we-do/box.tsx` |
| **Spinning counter** | Results stats | `home/animated-stat.tsx` |
| **Skeleton loader and reveal** | Blog thumbnails | `home/blogs.tsx` |
| **Error state shake** | Demo form invalid submit | `demo/demo-form.tsx` |
| **Text states swap** | Submit ↔ Sending… | `site/text-swap.tsx` |
| **Shimmer text** | "Sending…" while in flight | `demo/demo-form.tsx` |
| **Success check** | Demo form success tick | `demo/demo-form.tsx` |
| **Modal open** (values) | Demo success panel `panel-in` (0.96 → 1, 250ms) | `tailwind.config.ts` |
| **Accordion** (values) | Loop-tile sentence unfold (`grid-template-rows`, 250ms smooth-out) | `what-we-do/reveal-products.tsx` |
| **Panel / skeleton reveal** (values) | What We Do face swap cross-blur (2px) | `what-we-do/box.tsx` |

### Project wiring (part 3 of `app/transitions.css`)

| Adaptation | Why |
|---|---|
| `.t-page-enter` — page side-by-side's entrance only, as a keyframe from `--t-page-from-x` | Items differ in height; the recipe's absolute pages would collapse or over-size the container |
| `.t-stagger-hover` — texts reveal triggered by the card's hover / focus-visible / `data-on`, with the recipe's quiet exit as the resting-state transition | The trigger is a CSS state, not a JS-flipped `.is-shown` |
| `.t-reel-col:not(.is-spinning)` drops the edge mask | The cell is the stat's own 1em line box; the mask would dim waiting digits |
| `.t-input-wrap.is-error .t-error-msg` entrance keyframe | Messages render only while in error, so the recipe's fade runs as a mount animation |
| `html:not(.js)` skeleton fallback | Content is never gated on JavaScript (§14) |
| Tab pills' geometry (inline at each use) | Each bar's pill is its own shape: the nav's white 38-unit pill, the products' 2-unit orange underline |

### Not used, deliberately

Bounce-carrying recipes (notification badge, like button, toggle, plus-to-menu morph, avatar group hover), card hover tilt (playful), and the AI-interface recipes (thinking states, reasoning stream, streaming text, matrix loader) have no honest home on this site. Modal, toast, tooltip, banner stacking, input clear, checkbox, donut chart, text morph and number pop-in have no matching UI here today; reach for them (via `transitions apply`) when one appears.

### Adding motion

Use the skill's commands: `transitions review` / `transitions polish` to audit values against the token scale (usage first, never nearest number), `transitions apply` to install a recipe. Paste it into part 2 verbatim, put any adaptation in part 3 with its reason, and add a row to the tables above.

---

## Implementation Status

Wired in the codebase as of this revision:

1. **Tokens** — `app/transitions.css` (transitions.dev scale + recipe variables), `app/globals.css` (`--motion-*`, ui/reveal/eases aliased onto that scale, reduced-motion override, ambient keyframes), `tailwind.config.ts` (`transitionDuration`, `transitionTimingFunction`, `field-in`/`panel-in` on transitions.dev values).
2. **No-JS safety** — `app/layout.tsx` (`js` class + hydration watchdog); `html:not(.js)` fallbacks in `app/transitions.css`.
3. **Reveal** — `components/site/reveal.tsx` (IntersectionObserver; variants `rise|fade|mask|rise-mask|rise-scale|left|right` with cross-blur lanes; `delay`; `duration` `base|slow|cinematic|epic`, ease auto-selected by tier).
4. **Hero** — `components/home/hero.tsx` (headline `rise-mask`/cinematic → copy `rise` → ocean `mask`/cinematic tide; alerts on token-derived delays). Ship/water renderer untouched.
5. **All home sections** — headings share `rise-mask`/base at an 80ms stagger; media uses `rise-scale` (CTA dashboard, epic); Vision/Mission panels converge `left`/`right` on the cinematic tier.
6. **Navigation** — `components/site/navbar.tsx` (sliding active pill, dropdown mobile menu with close, icon swap).
7. **Sense Series** — `components/products/product-showcase.tsx` (sliding tab underline, page side-by-side panel entrance); `asset-radar.tsx` unchanged.
8. **What We Do** — `components/what-we-do/box.tsx` (cross-blurred face swap, learn-more Explore), `reveal-products.tsx` / `reveal-consulting.tsx` (hover texts reveal).
9. **Results** — `components/home/animated-stat.tsx` (spinning counter, cascade preserved).
10. **Blogs** — `components/home/blogs.tsx` (skeleton reveal thumbnails, page side-by-side prev/next).
11. **CTA / buttons** — `components/site/learn-arrow.tsx` on the CTA and product buttons.
12. **Demo form** — `components/demo/demo-form.tsx` (texts-reveal fields, error shake, text swap + shimmer, modal-open panel, success check), `components/site/text-swap.tsx`.
13. **Scroll-linked layer (§16)** — `components/site/scroll.tsx`; consumed by `navbar.tsx` (condense), `hero.tsx` (wordmark), `who-we-are.tsx` (fan + ship), `results.tsx` (dot field).
14. **Signature ambients** — the Mission radar sweep in `vision-mission.tsx`, the Asset Sense radar in `asset-radar.tsx`, the `/schedule-demo` radar and sailing vessel; all `PauseOffscreen`-wrapped, all unchanged.
