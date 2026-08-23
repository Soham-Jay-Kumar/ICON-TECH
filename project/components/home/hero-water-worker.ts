/// <reference lib="webworker" />

// ---------------------------------------------------------------------------
// The hero water's render thread.
//
// Redrawing waves.svg's whole surface — 122 gradient wash bands and 15,301
// round-capped lattice dots — costs tens of milliseconds a frame on mid
// hardware. That is fine work for a background thread and ruinous on the main
// one: run it there and the largest element above the fold spends most of
// every frame blocking scroll, input and the rest of the page.
//
// So the canvas is handed over here and the main thread keeps only what it
// alone can do: measure the element, watch the viewport, say when to run, and
// seat the ship on the pose this thread reports back after every frame.
// A machine that cannot keep the cadence simply redraws less often — elapsed
// time is real seconds either way, so the water always flows at the same
// speed, whatever the frame rate.
//
// Workers have no requestAnimationFrame, so the clock is a self-correcting
// timeout. At this cadence, against motion this slow, the lack of vsync
// alignment is not visible.
// ---------------------------------------------------------------------------

import {
  createWaveRenderer,
  MAX_STEP,
  parseWaveField,
  TARGET_MS,
  type WaveRenderer,
} from '@/components/home/hero-water-flow';

type InMessage =
  | { type: 'load'; url: string }
  | { type: 'canvas'; canvas: OffscreenCanvas; cssWidth: number; dpr: number }
  | { type: 'resize'; cssWidth: number; dpr: number }
  | { type: 'run'; on: boolean }
  | { type: 'rewind' };

const scope = self as unknown as DedicatedWorkerGlobalScope;

let field: ReturnType<typeof parseWaveField> | null = null;
let renderer: WaveRenderer | null = null;
let cssWidth = 0;
let dpr = 1;

let elapsed = 0;
let last = 0;
let timer = 0;
let wanted = false;

function paint() {
  if (!renderer) return;
  renderer.draw(elapsed);
  // Where the hull sits on the surface just drawn. Two numbers a frame, so the
  // ship layer on the main thread moves with this water rather than beside it.
  const { dy, roll } = renderer.pose;
  scope.postMessage({ type: 'pose', dy, roll });
}

function tick() {
  timer = 0;
  const now = performance.now();
  // Clamp the step: a long gap (a throttled timer, a stalled thread) must not
  // teleport the water forward.
  elapsed += last ? Math.min((now - last) / 1000, MAX_STEP) : 0;
  last = now;
  paint();
  if (!wanted) return;
  // Self-correcting: aim at the next cadence slot rather than a fixed delay,
  // so a slow redraw does not compound into ever-later ones.
  const late = performance.now() - now;
  timer = scope.setTimeout(tick, Math.max(0, TARGET_MS - late));
}

function run(on: boolean) {
  wanted = on && !!renderer;
  if (wanted && !timer) {
    last = 0;
    timer = scope.setTimeout(tick, 0);
  } else if (!wanted && timer) {
    clearTimeout(timer);
    timer = 0;
  }
}

scope.onmessage = (e: MessageEvent<InMessage>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'load':
      // Fetched here rather than on the main thread: parsing the field and
      // building its band tables is the one heavy step at startup, and it has
      // no business happening while the page is still painting.
      fetch(msg.url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then((buf) => {
          field = parseWaveField(buf);
          scope.postMessage({ type: 'ready' });
        })
        .catch(() => scope.postMessage({ type: 'failed' }));
      break;

    case 'canvas': {
      const ctx = msg.canvas.getContext('2d', { alpha: true });
      if (!ctx || !field) {
        scope.postMessage({ type: 'failed' });
        return;
      }
      renderer = createWaveRenderer(ctx, field);
      cssWidth = msg.cssWidth;
      dpr = msg.dpr;
      renderer.resize(cssWidth, dpr);
      paint(); // frame zero: waves.svg, untouched
      break;
    }

    case 'resize':
      cssWidth = msg.cssWidth;
      dpr = msg.dpr;
      if (renderer?.resize(cssWidth, dpr)) paint();
      break;

    case 'rewind':
      elapsed = 0;
      paint();
      break;

    case 'run':
      run(msg.on);
      break;
  }
};
