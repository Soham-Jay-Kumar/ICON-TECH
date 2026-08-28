'use client';

import { useEffect, useRef } from 'react';

/**
 * The teal card's revealed face: the video plate, with the site's own text
 * laid over it.
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
 * What the clip still carries is deliberate: the "Systems"/"Data"/"Workflows"
 * pills are its subject matter, the ICON logo is the company's own, and the
 * MINIMAX/Hailuo AI watermark never reaches the screen at all — the crop below
 * is what keeps it off. The headline here is now the card's only one: real DOM
 * text in the site's own font, sized for THIS card (fixed breakpoint sizes,
 * not a viewport-relative clamp — see TEXT below), with the wording and the
 * white-with-one-orange-phrase colouring measured off the source frame before
 * it was repainted.
 *
 * TWO-STAGE CROP. A single `object-fit: cover` on the raw 2944x1248 frame
 * cannot be made safe: this card's own aspect ratio varies with viewport
 * (1.13 at a phone's stacked width up to 2.76 in the single-column band just
 * under the `xl` breakpoint, measured directly against the running page —
 * see box.tsx's `xl:grid-cols-2`), and cover's height-match/width-match split
 * flips partway through that range. Below aspect 2.359 (the video's own
 * ratio) cover matches height and the card shows the FULL frame, watermark
 * included. Above 2.359 — which the measured 2.76 comfortably is — cover
 * matches width instead and crops top and bottom, and because the vessel's
 * hull and wake sit low in the source (measured y 0.34-0.87 of frame height,
 * frame-by-frame across the clip, against a true centre of 0.5) a centred
 * crop loses the ship's stern before it loses anything from the sky.
 *
 * The fix is a fixed intermediate crop the card's own aspect never reaches:
 * an inner window at 2944x1050 (=2.804:1, comfortably past the measured
 * 2.76 ceiling) that is ALWAYS shown by height-match, with the video inside
 * it top-anchored (`object-position: center top`) so only its excess below
 * y=1050/1248=0.841 is ever cropped — the same 39px worst-case bite into the
 * wake's fading tail regardless of card width, never into the hull (which
 * stays clear to y=0.873 worst-case, 60px above the window's own floor), and
 * the watermark (y 0.889-0.941) is 80px past that floor and can never appear.
 * `xxx% top` rather than `xxx% center` is what makes this asymmetric: cover's
 * usual centred crop would have taken as much off the top (open water, fine)
 * as the bottom (the ship, not fine).
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
 * fixed ~636px in the two-column desktop grid — see box.tsx). At the previous
 * clamp's 1.05rem floor, the smallest phones rendered the headline at a size
 * that used up 46% of the card's own height, measured directly against the
 * running page, leaving barely a sliver of ship visible around it. The steps
 * below are chosen against each breakpoint's actual card height instead.
 */
const SRC = '/what-we-do-consulting.mp4';
const POSTER = '/what-we-do-consulting-poster.jpg';
const FADE = 0.45; // seconds of overlap at the loop point
const ARM_BACK_AT = 1.2; // seconds into playback before the back player loads
// A gentle 0.8x: currentTime/duration are wall-clock-independent, so this
// only stretches how long real time takes to reach the same FADE/
// ARM_BACK_AT thresholds — the crossfade logic below needs no change.
const RATE = 0.8;

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

    group.addEventListener('mouseenter', play);
    group.addEventListener('mouseleave', stop);
    group.addEventListener('focusin', play);
    group.addEventListener('focusout', stop);
    const mo = new MutationObserver(sync);
    mo.observe(group, { attributes: true, attributeFilter: ['data-on'] });
    sync();

    return () => {
      cancelAnimationFrame(raf);
      group.removeEventListener('mouseenter', play);
      group.removeEventListener('mouseleave', stop);
      group.removeEventListener('focusin', play);
      group.removeEventListener('focusout', stop);
      mo.disconnect();
    };
  }, []);

  return (
    <span className="relative block h-full w-full overflow-hidden">
      {/* Behind the video only so a poster miss (blocked, offline) does not
          flash the card's teal ground. */}
      <span aria-hidden className="absolute inset-0 bg-[#06192A]" />

      {/* Below `md` the revealed face is a normal block with no height of its
          own, so it needs an intrinsic ratio; from `md` it fills the card. */}
      <span className="relative block aspect-[16/11] w-full overflow-hidden md:aspect-auto md:h-full">
        {/* Stage 1: the safe window, 2944x1050 — see the docblock. Height
            always matches this card (2.804 exceeds every measured card
            aspect), width overflows and is centred with a rightward bias
            (66%) so the ship sits inside frame with room to its left for the
            text below, then clipped by this span's own `overflow-hidden`. */}
        <span
          aria-hidden
          className="absolute h-full overflow-hidden"
          style={{
            aspectRatio: '2944 / 1050',
            left: '66%',
            transform: 'translateX(-66%)',
          }}
        >
          {/* Stage 2: the actual crop. `top` anchoring means only the
              excess below y=1050/1248 is ever cut — never the sky above the
              vessel. */}
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
      </span>

      {/* The site's own text, over the video rather than baked into it — see
          the docblock. Colour and wording are the source frame's own
          ("Our AI Solutions..." / orange on "AI Solutions" only).
          
          The scrim is a small patch behind the text, not a panel behind the
          card: a full-height, 60%-wide flat-black rectangle (the first cut
          at hiding the video's own baked headline) covered nearly half of
          EVERY row of the card, including the open water and pills nowhere
          near the text, and read as "the video is broken" rather than "there
          is a caption here." A bottom-left radial vignette tapers out in
          both directions at once, so it darkens only the text's own corner —
          confirmed by column-averaged luminance across the full card height
          after this change (see the corresponding fix commentary): the flat
          -black footprint that used to span 47% of every row is gone. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 82% 68% at 0% 100%, rgba(2,14,24,0.95) 0%, rgba(2,14,24,0.88) 48%, rgba(2,14,24,0.55) 70%, rgba(2,14,24,0.12) 90%, rgba(2,14,24,0) 100%)',
        }}
      />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 px-3.5 pb-3 sm:px-5 sm:pb-4 md:px-7 md:pb-6">
        {/* `text-shadow` carries legibility the rest of the way where the
            vignette has already faded — e.g. the tail of "Solutions
            Development" — without needing the scrim itself any bigger. */}
        <span
          className="block text-[12.5px] font-medium leading-[1.24] tracking-[-0.005em] text-white sm:text-[15px] md:text-[18px] lg:text-[21px]"
          style={{ textShadow: '0 1px 10px rgba(0,0,0,0.75), 0 1px 2px rgba(0,0,0,0.9)' }}
        >
          Our <span className="text-[#FA8837]">AI Solutions</span>
          <br />
          Consulting &amp; Custom
          <br />
          Solutions Development
        </span>
        <span
          className="mt-1 block text-[9px] font-medium leading-snug text-white/90 sm:mt-1.5 sm:text-[10.5px] md:text-[12.5px]"
          style={{ textShadow: '0 1px 8px rgba(0,0,0,0.75), 0 1px 2px rgba(0,0,0,0.9)' }}
        >
          Empowering Enterprises with Intelligent AI Solutions
        </span>
      </span>
    </span>
  );
}
