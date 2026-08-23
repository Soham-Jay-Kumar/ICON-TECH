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
