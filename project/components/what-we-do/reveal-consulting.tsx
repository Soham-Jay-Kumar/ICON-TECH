'use client';

import { useEffect, useRef } from 'react';

/**
 * The teal card's revealed face: the video plate with the site's own headline
 * laid over it, and the services listed underneath.
 *
 * This is footage, not a reconstruction, and that is deliberate — the water
 * and vessel motion are photoreal AI-generated frames (per-pixel realism no
 * SVG/CSS reconstruction reaches). But the clip as delivered carried its OWN
 * headline burned into it, in the same words as the one set below, and pixels
 * are not content: they cannot be resized, recoloured or kept legible
 * independent of the crop, and at this card's scale that copy read as a
 * blurry duplicate of type the page already sets in Poppins. No crop could
 * hide it either — the card's own aspect swings from 1.13 to 2.76 across the
 * breakpoints and the baked text ran through the middle of every framing that
 * also keeps the ship in shot. So it was painted out of the asset itself, by
 * scripts/build-consulting-video.py, which reads the pristine delivery at the
 * repo root and rebuilds both the mp4 and the poster below. Dropping a fresh
 * copy of that source into public/ without re-running the script brings the
 * duplicate straight back.
 *
 * What the clip still carries is deliberate: the "Systems"/"People"/"Data"/
 * "Workflows" pills are its subject matter, the ICON logo is the company's own, and the
 * MINIMAX/Hailuo AI watermark never reaches the screen at all — the crop below
 * (see FRAMING) is what keeps it off. The headline here is now the card's only one: real DOM
 * text in the site's own font, sized for THIS card (fixed breakpoint sizes,
 * not a viewport-relative clamp — see TEXT below), with the wording and the
 * white-with-one-orange-phrase colouring measured off the source frame before
 * it was repainted.
 *
 * FRAMING. Zoomed out so the whole vessel and all four pills are always in
 * shot, measured frame-by-frame across the clip in source pixels: the ship
 * and pills span x 1240-2400 (the ICON logo reaches 2590) and y 60-1092, the
 * stern dipping lowest at ~1090; the watermark begins at y 1120. Two stages:
 *
 *   1. a window onto the frame at 2944x1100 (2.676:1), always height-matched
 *      to the plate, so the frame is never shown below y=1100 — the stern
 *      clears that floor by ~10px and the watermark sits 20px past it;
 *   2. the video inside it, `object-fit: cover` and top-anchored, so the only
 *      thing ever cut is that bottom 148px.
 *
 * The window's horizontal bias is chosen per layout so that x 1240-2590 stays
 * inside the plate at every card width:
 *
 *   - below `md` the plate is 16:11 and shows 54% of the frame's width; the
 *     bias puts x 0.654 at centre, i.e. x 1126-2724 visible. The headline
 *     would land on the hull at this scale, so it follows the plate instead.
 *   - from `md` the plate is a 344px band (window 921px wide). At the
 *     narrowest two-column card (596px, at 1280) that shows x 755-2661 with
 *     the bias at 0.58, and wider cards only show more; open water to the
 *     left of the bow holds the overlaid headline clear of the hull. Cards
 *     wider than 921px (single-column, `md` to `xl`) see the whole window,
 *     its edges feathered into the navy ground by WINDOW_MASK.
 *
 * The service list sits under the band, never over it, so it covers nothing.
 *
 * STARTUP LATENCY. `preload="none"` plus decoding a 2944x1248 H.264 frame
 * measured 2-3s from the first `play()` call to the first visible frame —
 * against a real DOM measurement, not a guess (drove it with Playwright,
 * sampled `readyState`/`currentTime` every 500ms). For that whole window the
 * card was a flat navy rectangle with no ship, no water, and nothing to
 * suggest a video was coming — indistinguishable from broken. Two players
 * made it worse: `attach()` used to `.load()` BOTH the front and back player
 * at once on first hover, so the one the visitor is actually looking at spent
 * its startup window competing with a second decode it didn't need yet. Now
 * only the front player loads on `attach()`; the back player is deferred to
 * `armBack()`, called once from `tick()` — it only has to be ready by the
 * loop seam, ~4.7s later, so there is no reason to make it fight the front
 * player for the first one. `poster` on both elements is the other half:
 * it is the same frame the crop math already targets (0.108s in, saved at
 * the video's own 2944x1248 so the identical `object-fit`/`object-position`
 * apply to it unchanged), so the ship is on screen from the very first paint
 * and what follows is motion starting, not content arriving.
 *
 * Even so, loading only on hover left the poster standing still for ~3.7s
 * after the cursor arrived (measured in Chrome: metadata at 0.8s, first
 * decoded frame at 3.7s), long enough that the card read as "the video
 * doesn't play". So on hover-capable devices the front player is now armed
 * with `preload="auto"` as soon as the card comes within 600px of the
 * viewport, and by the time a cursor reaches it the first frame is decoded.
 * Touch devices still load on tap only.
 *
 * RATE. Played at 0.8x (`RATE` below) rather than native speed — set on
 * both players at every arm/play point since some engines reset
 * `playbackRate` across a `src` change. `currentTime`/`duration` are in the
 * clip's own timeline and untouched by rate, so the FADE/ARM_BACK_AT
 * thresholds below still fire at the same points in the footage — playing
 * slower only stretches how much real time that takes.
 *
 * SEAM. The clip does not loop: the vessel drifts steadily, so the last frame
 * differs from the first by 9.3/255 and a plain `loop` jump-cuts every 5.2s.
 * Two players are stacked and cross-dissolved through the seam — the outgoing
 * one fades out over FADE seconds while the incoming one starts from zero —
 * which is why neither carries the `loop` attribute.
 *
 * TEXT. Sized in fixed steps at the site's own breakpoints, not a `vw`
 * clamp: a `vw` value tracks the VIEWPORT, but this card's own width does not
 * track the viewport linearly (it swings from a full-width mobile stack to a
 * fixed ~636px in the two-column desktop grid — see box.tsx).
 */
const SRC = '/what-we-do-consulting.mp4';
const POSTER = '/what-we-do-consulting-poster.jpg';
const FADE = 0.45; // seconds of overlap at the loop point
const ARM_BACK_AT = 1.2; // seconds into playback before the back player loads
// A gentle 0.8x: currentTime/duration are wall-clock-independent, so this
// only stretches how long real time takes to reach the same FADE/
// ARM_BACK_AT thresholds — the crossfade logic below needs no change.
const RATE = 0.8;

// In reading order: from `md` the first three fill the left column, the last
// three the right (see ServiceList's `grid-flow-col`).
const SERVICES = [
  'Digital Strategy & Roadmaps',
  'AI Strategy & Adoption',
  'Business Cases & Value Realization',
  'Future of Work & Operating Models',
  'Technology Advisory & Selection',
  'Custom AI Solutions Development',
];

const SHADOW = '0 1px 8px rgba(0,0,0,0.75), 0 1px 2px rgba(0,0,0,0.9)';

// Feathers the window's own left/right edges into the navy ground. Only seen
// where the card is wider than the window (single-column cards between `md`
// and `xl`); everywhere else those edges fall outside the plate.
const WINDOW_MASK =
  'linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%)';

/**
 * The services, as plain rows split by hairlines — no bullets. Spans with list
 * roles rather than <ul>/<li>, because the whole card is a <button>, which only
 * admits phrasing content.
 *
 * One column of six below `md`. From `md`, two across, reading down each
 * column (`grid-flow-col` over three rows), with each row's height shared
 * across both columns so the hairlines line up even when a label wraps. The
 * hairline is a top border on every row but the first of each column.
 */
function ServiceList({ className }: { className?: string }) {
  return (
    <span
      role="list"
      className={[
        'grid md:grid-flow-col md:grid-cols-2 md:grid-rows-3 md:gap-x-8',
        className,
      ].join(' ')}
    >
      {SERVICES.map((item) => (
        <span
          key={item}
          role="listitem"
          className="block border-t border-white/15 py-3 text-[14px] leading-[1.4] text-white first:border-t-0 md:py-2 md:[&:nth-child(4)]:border-t-0"
        >
          {item}
        </span>
      ))}
    </span>
  );
}

export function RevealConsulting() {
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const a = aRef.current;
    const b = bRef.current;
    if (!a || !b) return;
    const group = a.closest('.group') as HTMLElement | null;
    if (!group) return;

    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let front = a;
    let back = b;
    let raf = 0;
    let frontArmed = false;
    let backArmed = false;
    let stopped = true;

    const armFront = () => {
      if (frontArmed) return;
      frontArmed = true;
      front.src = SRC;
      front.defaultPlaybackRate = RATE;
      front.playbackRate = RATE;
      front.load();
    };

    // Deferred so it never competes with the front player's own startup — see
    // the STARTUP LATENCY note above.
    const armBack = () => {
      if (backArmed) return;
      backArmed = true;
      // `auto`, or the browser may stop at metadata and the back player never
      // reaches the readyState the crossfade below waits for.
      back.preload = 'auto';
      back.src = SRC;
      back.defaultPlaybackRate = RATE;
      back.playbackRate = RATE;
      back.load();
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const d = front.duration;
      if (!d || Number.isNaN(d)) return;
      if (!backArmed && front.currentTime >= ARM_BACK_AT) armBack();
      const left = d - front.currentTime;
      if (left > FADE) return;
      if (!backArmed) armBack(); // clip shorter than expected: arm it now, late
      if (back.paused && back.readyState >= 2) {
        back.currentTime = 0;
        back.playbackRate = RATE;
        void back.play().catch(() => {});
      }
      const k = Math.min(1, Math.max(0, (FADE - left) / FADE));
      front.style.opacity = String(1 - k);
      back.style.opacity = String(k);
      if (k >= 1 && !back.paused) {
        front.pause();
        front.currentTime = 0;
        front.style.opacity = '0';
        const t = front;
        front = back;
        back = t;
        front.style.opacity = '1';
      }
    };

    const play = () => {
      if (reduce) return;
      armFront();
      stopped = false;
      front.playbackRate = RATE;
      front.style.opacity = '1';
      back.style.opacity = '0';
      void front.play().catch(() => {});
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(raf);
      raf = 0;
      for (const v of [a, b]) {
        v.pause();
        v.currentTime = 0;
      }
      front = a;
      back = b;
      a.style.opacity = '1';
      b.style.opacity = '0';
    };

    const sync = () => (group.dataset.on === 'true' ? play() : stop());

    // Warm the front player before the first hover — see STARTUP LATENCY.
    // Only where hover exists: a touch visitor opens the card with a tap they
    // may never make, and should not download the clip for nothing.
    const canHover =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let io: IntersectionObserver | null = null;
    if (!reduce && canHover && typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          front.preload = 'auto';
          armFront();
          io?.disconnect();
        },
        { rootMargin: '600px 0px' }
      );
      io.observe(group);
    }

    group.addEventListener('mouseenter', play);
    group.addEventListener('mouseleave', stop);
    group.addEventListener('focusin', play);
    group.addEventListener('focusout', stop);
    const mo = new MutationObserver(sync);
    mo.observe(group, { attributes: true, attributeFilter: ['data-on'] });
    sync();
    // A cursor already resting on the card when this effect runs (it arrived
    // before hydration) never fires `mouseenter`, while the CSS `:hover`
    // reveal is already showing — so the face would sit on a still poster
    // until the visitor left and came back.
    if (group.matches(':hover')) play();

    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      group.removeEventListener('mouseenter', play);
      group.removeEventListener('mouseleave', stop);
      group.removeEventListener('focusin', play);
      group.removeEventListener('focusout', stop);
      mo.disconnect();
    };
  }, []);

  // `t-stagger-hover`: the copy over and under the plate enters as a
  // transitions.dev texts reveal (headline, subline, then the list, 40ms
  // apart), matching the products face — see reveal-products.tsx. The video
  // itself is not staggered; it is the face's ground.
  return (
    <span className="t-stagger-hover relative block h-full w-full overflow-hidden">
      {/* Behind the video only so a poster miss (blocked, offline) does not
          flash the card's teal ground. */}
      <span aria-hidden className="absolute inset-0 bg-[#06192A]" />

      {/* The plate and its headline. A wrapper of their own so that from `md`
          the headline can sit over the plate (absolute to this span, whose
          height is then the plate's), while below `md` it simply follows it. */}
      <span className="relative block">
        {/* The plate: a fixed 16:11 below `md`, where the face is a normal
            block that needs an intrinsic ratio; a 344px band across the top of
            the card from `md`, leaving the rest of the card for the list. */}
        <span className="relative block aspect-[16/11] w-full overflow-hidden md:aspect-auto md:h-[344px]">
          {/* Stage 1: the window, 2944x1100 — see FRAMING in the docblock.
              Height-matched to the plate; the bias puts source x 0.654 (below
              `md`) or 0.58 (from `md`) at the plate's centre. The masked
              edges only ever show where a wide card outruns the window. */}
          <span
            aria-hidden
            className="absolute left-1/2 h-full -translate-x-[65.4%] overflow-hidden md:-translate-x-[58%]"
            style={{
              aspectRatio: '2944 / 1100',
              maskImage: WINDOW_MASK,
              WebkitMaskImage: WINDOW_MASK,
            }}
          >
            {/* Stage 2: the actual crop. `top` anchoring means only the
                excess below y=1100/1248 is ever cut — the watermark, never
                the sky above the vessel. */}
            {[aRef, bRef].map((r, i) => (
              <video
                key={i}
                ref={r}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: 'center top', opacity: i === 0 ? 1 : 0 }}
                muted
                playsInline
                preload="none"
                poster={POSTER}
                aria-hidden
              />
            ))}
          </span>

          {/* From `md` the headline sits over the plate's lower-left, on open
              water. A bottom-left radial vignette darkens only that corner
              rather than a panel across the card: a full-height, 60%-wide
              flat-black rectangle (the first cut at this) read as "the video
              is broken" rather than "there is a caption here". Kept short of
              the hull. There is deliberately no fade along the plate's bottom
              edge: the stern runs to within ~10px (source) of the window's
              floor, so any fade there dims the ship. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden md:block"
            style={{
              backgroundImage:
                'radial-gradient(ellipse 52% 62% at 0% 100%, rgba(2,14,24,0.88) 0%, rgba(2,14,24,0.72) 45%, rgba(2,14,24,0.3) 72%, rgba(2,14,24,0) 100%)',
            }}
          />
        </span>

        {/* The site's own text, in place of the one painted out of the clip —
            see the docblock. Colour and wording are the source frame's own
            ("Our AI Solutions..." / orange on "AI Solutions" only).
            `text-shadow` carries legibility where the vignette has faded. */}
        <span className="relative block px-3.5 pt-3 sm:px-5 md:pointer-events-none md:absolute md:inset-x-0 md:bottom-0 md:px-7 md:pb-3 md:pt-0">
          <span
            className="t-stagger-line text-[15px] font-medium leading-[1.24] tracking-[-0.005em] text-white md:text-[18px] lg:text-[21px]"
            style={
              {
                textShadow: '0 1px 10px rgba(0,0,0,0.75), 0 1px 2px rgba(0,0,0,0.9)',
                '--t-line': 0,
              } as React.CSSProperties
            }
          >
            Our <span className="text-[#FA8837]">AI Solutions</span>
            <br />
            Consulting &amp; Custom
            <br />
            Solutions Development
          </span>
          <span
            className="t-stagger-line mt-1.5 text-[11px] font-medium leading-snug text-white/90 md:text-[12.5px]"
            style={{ textShadow: SHADOW, '--t-line': 1 } as React.CSSProperties}
          >
            Empowering Enterprises with Intelligent AI Solutions
          </span>
        </span>
      </span>

      {/* Under the plate, never over it, so nothing covers the ship. */}
      <span className="t-stagger-line" style={{ '--t-line': 2 } as React.CSSProperties}>
        <ServiceList className="relative px-3.5 pb-2 pt-2 sm:px-5 md:px-7 md:pb-3 md:pt-1" />
      </span>
    </span>
  );
}
