/**
 * The "A" in the hero's "AI DRIVEN SHIPPING" watermark, redrawn with its
 * crossbar raised — the wordmark's own font (Anton) has no variant or
 * OpenType feature that moves it, so this is a hand-built replacement for
 * that one character, matched to Anton's real outline everywhere except the
 * bar itself.
 *
 * Why it has to be geometry, not a font trick: the wordmark sits low enough
 * in the water that its lower rows go under the surface as waves pass (see
 * the note in hero.tsx on `top: pctY(237)`), and Anton draws the "A"'s
 * crossbar close to the baseline — squarely inside that submerged band. Over
 * a long capture (scripts/grab-hero.js, 1200 samples across 300s of water
 * time) the surface reaches as high as plate y 307 under this glyph, deep
 * enough to swallow the crossbar at its original height on every pass of the
 * swell, not just an occasional trough.
 *
 * The bar sits at plate y 301, a 6px margin above that measured 307 — enough
 * that it is never fully submerged, no more. It was first set much higher
 * (292, a 15px margin) and brought back down on request: full contact with
 * the water is fine, only complete coverage is not, so the margin only needs
 * to clear the worst measured point, not sit well clear of it.
 *
 * The outline below is Anton's own, extracted with fontTools from the actual
 * webfont (.next/static/media/*.woff2, family "Anton", unitsPerEm 2048,
 * capHeight 1760). Its "A" is one filled silhouette with a triangular counter
 * subtracted — not two independent diagonal strokes plus a bar — and the
 * outline's own points confirm each leg's inner edge is a SINGLE straight
 * line from the foot to the apex, split into two path segments only because
 * the crossbar crosses it:
 *
 *   left  inner edge:  (372, 0)  ->  (486, 1460)   (colinear, fit exactly)
 *   right inner edge:  (631, 0)  ->  (502, 1460)   (colinear, fit exactly)
 *
 * That means the crossbar can be relocated exactly, at any height, by
 * re-cutting those two lines at the new y and keeping every other point —
 * the flat top, the outer diagonals, the counter's own near-apex — untouched.
 * Thickness is preserved at Anton's original 281 units so the stroke weight
 * matches the rest of the letter; only its position moves.
 *
 * Placement in the text: the surrounding "I Driven" is still the real
 * webfont, so this has to sit exactly where a real "A" would — same advance
 * width (994 units), same left side-bearing, same baseline. It is sized in
 * `em` (994/2048 wide, 1760/2048 tall) so it tracks the wordmark's own
 * `fontSize` automatically, and left at the default inline `vertical-align:
 * baseline`, which is what actually lines its bottom edge up with the
 * baseline of the real glyphs on either side of it.
 */
export function HeroWordmarkA() {
  return (
    <svg
      viewBox="0 0 994 1760"
      aria-hidden
      style={{
        display: 'inline-block',
        width: '0.4853515625em', // 994 / 2048
        height: '0.859375em', // 1760 / 2048
        verticalAlign: 'baseline',
      }}
    >
      <path
        fillRule="evenodd"
        fill="currentColor"
        // Outer silhouette (feet, legs, flat top) unchanged from Anton's own
        // "A", except the two crossbar-bottom junctions — was (606,284) and
        // (394,284), now cut at y=632 (35.9% of cap height) instead of 284
        // (16.1%) — plus the counter (hole) below the apex, whose own bottom
        // junctions move the same amount, from y=565 to y=913 (51.9%), so
        // the bar's thickness (281 units, Anton's own) is preserved.
        d="M30,1760 L200,0 L797,0 L964,1760 L631,1760 L575.16,1128 L421.35,1128 L372,1760 Z M443.29,847 L550.33,847 L502,300 L486,300 Z"
      />
    </svg>
  );
}
