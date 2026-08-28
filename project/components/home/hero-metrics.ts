// Reference 01-hero.png is 1560px wide, so 1px there == (100/1560)vw here and
// the layout resolves to the reference exactly at that width. Shared by
// hero.tsx and hero-waves.tsx so both stay pinned to the same illustration
// coordinate system.
export const REF_W = 1560;
export const vw = (px: number) => `${((px / REF_W) * 100).toFixed(4)}vw`;

// The illustration (ship + ocean) is cropped to this height in the source
// asset; positions inside it are expressed as a fraction of it, not of REF_W.
export const ILLUS_H = 630;
export const pctY = (px: number) => `${((px / ILLUS_H) * 100).toFixed(3)}%`;
export const pctX = (px: number) => `${((px / REF_W) * 100).toFixed(3)}%`;

// Same conversion as vw(), but in container-query width units. Used for the
// elements that live INSIDE the ocean plate (the wordmark and the two callout
// labels): the plate is a query container (container-type: inline-size), and
// on short/wide desktop viewports it is capped by height and rendered
// NARROWER than the viewport, so these have to scale with the PLATE, not the
// window. Everything else in the plate is already a percentage of it; only
// these were pinned to vw. Position (pctX/pctY) is unaffected — it is already
// plate-relative. See hero.tsx for the plate's own (viewport-relative) sizing.
export const cqw = (px: number) => `${((px / REF_W) * 100).toFixed(4)}cqw`;
