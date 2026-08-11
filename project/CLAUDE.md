# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Production build
npm run start       # Serve a production build
npm run lint        # next lint
npm run typecheck   # tsc --noEmit
```

There is no automated test suite (no Jest/Vitest/Playwright test config). `playwright` is a devDependency used only by the ad-hoc scripts in `scripts/*.js` for visual QA screenshots, not for assertions.

**Never run `next build` while `next dev` is already running against the same working tree.** Both processes write to `.next/`, and running them concurrently corrupts the dev server's cache — it starts serving unstyled HTML (no Tailwind CSS at all) with no error in the terminal. If this happens: kill every `next dev`/`next-router-worker` process, `rm -rf .next`, then restart `npm run dev`. Also note that editing `tailwind.config.ts` (new tokens/keyframes) does not always hot-reload into the already-running dev server's CSS — if a new utility class isn't showing up, restart the dev server rather than assuming the class name is wrong.

## Architecture

This is a **single-page Next.js 13.5 App Router marketing site** (no CMS, no database, no API routes — all content is hardcoded in the component files). `app/page.tsx` assembles the entire page by stacking section components in order; that file is the map of the whole site.

```
components/home/   — one file per page section (hero, products, team, etc.), all reference-driven (see below)
components/site/   — shared chrome: navbar, footer, logo, and layout primitives (Container/Section/SectionHeading, Reveal)
components/ui/     — shadcn/ui primitives, mostly untouched library boilerplate; listed in .bolt/ignore
```

### Pixel-accuracy mandate (`DESIGN.md`)

`DESIGN.md` is a hard rule, not a suggestion: implementations must be pixel-indistinguishable from the screenshots in `reference/`. Do not "improve," modernize, or reinterpret layout/spacing/color/typography — treat the reference images as spec. This is why several components (`hero.tsx`, `navbar.tsx`) use a `vw(px)` helper (`(px / REF_W) * 100 + 'vw'`, `REF_W = 1560`) to convert pixel measurements taken directly off a reference screenshot into viewport-relative units, rather than using Tailwind's spacing scale. When touching these components, preserve that pattern instead of rounding to the nearest Tailwind class.

### Motion system (`TRANSITIONS.md`)

`TRANSITIONS.md` is the authoritative motion spec (separate from `DESIGN.md` — it owns animation only, never final resting layout). Key points for implementation:

- All durations/easings are CSS custom properties in `app/globals.css` (`--motion-duration-*`, `--motion-ease-*`), exposed as Tailwind tokens (`duration-micro|ui|reveal|hero`, `ease-standard|premium`) in `tailwind.config.ts`. Never hardcode a raw `ms` value or `cubic-bezier()` in a component — reference the tokens so `prefers-reduced-motion` (which zeroes those same variables) disables everything from one place.
- `components/site/reveal.tsx` (`<Reveal>`) is the single scroll-entrance mechanism, built on `IntersectionObserver` (fires once, no library). Its `rise`/`fade` variants animate the *observed* node directly; `mask` (clip-path) uses an extra wrapper because a `clip-path`-collapsed element is reported as having 0% intersection forever, deadlocking the observer. Do not apply `clip-path` directly to a node `Reveal` observes.
- `rise`/`fade` deliberately do **not** get an extra wrapper div: many consumers (e.g. team tiles) rely on `Reveal`'s own div being the `position: relative` containing block for their own `absolute` children. An element with any non-`none` `transform` (even `translateY(0)`) becomes a new containing block — inserting a wrapper broke exactly this for any consumer with an `absolute` child that has no intermediate `relative` element of its own. If you touch `reveal.tsx`, keep this constraint in mind before adding another wrapper.
- Content must never be gated on JavaScript. `Reveal`'s hidden pre-animation state is scoped to a `[.js_&]` selector; the `js` class is added to `<html>` by a plain inline `<script>` in `app/layout.tsx` (paired with `suppressHydrationWarning` on `<html>`, per Next's documented pattern for scripts that touch `<html>`/`<body>` pre-hydration). If JS fails, `Reveal` content renders fully visible by default.

### Styling

Tailwind config extends the default theme with a bespoke color system (`navy`, `brand`, `teal`, `mist` scales) *and* shadcn's CSS-variable-driven tokens (`--background`, `--primary`, etc., set in `globals.css`) side by side — both exist and are used in different components, so check which convention a file already follows before adding new colors. `components.json` config: shadcn "default" style, RSC on, `baseColor: neutral`.

### Asset pipeline (`scripts/`)

`scripts/*.py` (need Pillow — `pip install pillow`, not a project dependency) extract/matte pieces of the `reference/*.png` screenshots into the transparent PNGs used in `public/images/` (ship watermarks, product mocks, trusted-by logos). `scripts/shoot.js` / `shot-cta.js` (Playwright) screenshot the running dev server into `shots/` for comparison against `reference/` via `compare.py` / `diff-cta.py` / `measure.py`. These are one-off tuning tools, not part of the build.

### Deployment

Netlify, via `@netlify/plugin-nextjs` (`netlify.toml`: `npx next build`, publish `.next`). `next.config.js` disables ESLint during `next build` and sets `images: { unoptimized: true }` — relevant if reintroducing `next/image` optimization behavior.

### `.bolt/`

This project originated from bolt.new (`.bolt/config.json`: `nextjs-shadcn` template). `.bolt/prompt` conventions still apply: add `"use client"` to any component using hooks, avoid triggering the "Extra attributes from the server" hydration warning, use `lucide-react` for icons, and don't add UI/icon libraries beyond shadcn/ui + Tailwind without a specific reason.
