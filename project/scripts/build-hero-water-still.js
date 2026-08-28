#!/usr/bin/env node
/**
 * Build the hero's ship-free water fallback from the canonical waves.svg.
 *
 * Playwright rasterises the SVG with the same browser engine as the live hero.
 * Pillow, already required by build-hero-masks.py, encodes that lossless render
 * as the progressive JPEG used beneath the canvas while its wave field loads.
 *
 * Run from project/ as part of the complete workflow:
 *   npm run assets:hero
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const WIDTH = 1560;
const SVG_HEIGHT = 360;
const OUTPUT_HEIGHT = 332;
const JPEG_QUALITY = 86;

const SVG_PATH = path.resolve(__dirname, '..', '..', 'waves.svg');
const OUTPUT_PATH = path.resolve(
  __dirname,
  '..',
  'public',
  'images',
  'hero-water-still.jpg'
);

const ENCODE_PROGRESSIVE_JPEG = String.raw`
from pathlib import Path
import sys
from PIL import Image

source, destination = map(Path, sys.argv[1:3])
quality = int(sys.argv[3])
with Image.open(source) as image:
    image = image.convert("RGB")
    if image.size != (1560, 332):
        raise RuntimeError(f"unexpected fallback size: {image.size}")
    image.save(
        destination,
        format="JPEG",
        quality=quality,
        optimize=True,
        progressive=True,
    )
`;

async function main() {
  if (!fs.existsSync(SVG_PATH)) {
    throw new Error(`Missing wave artwork: ${SVG_PATH}`);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hero-water-still-'));
  const rasterPath = path.join(tempDir, 'waves.png');
  const encodedPath = path.join(tempDir, 'hero-water-still.jpg');
  let browser;

  try {
    browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: WIDTH, height: SVG_HEIGHT },
      deviceScaleFactor: 1,
    });

    const svg = fs.readFileSync(SVG_PATH, 'utf8');
    await page.setContent(
      '<!doctype html><html><head><style>' +
        'html,body{margin:0;width:1560px;height:360px;overflow:hidden;background:#fff}' +
        'svg{display:block;width:1560px;height:360px}' +
        '</style></head><body>' +
        svg +
        '</body></html>',
      { waitUntil: 'load' }
    );

    await page.screenshot({
      path: rasterPath,
      type: 'png',
      clip: { x: 0, y: 0, width: WIDTH, height: OUTPUT_HEIGHT },
    });
    await page.close();

    const encoded = spawnSync(
      'python3',
      [
        '-c',
        ENCODE_PROGRESSIVE_JPEG,
        rasterPath,
        encodedPath,
        String(JPEG_QUALITY),
      ],
      { encoding: 'utf8' }
    );
    if (encoded.status !== 0) {
      throw new Error(
        `Could not encode the progressive JPEG:\n${encoded.stderr || encoded.stdout}`
      );
    }

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.renameSync(encodedPath, OUTPUT_PATH);
    console.log(
      `${path.relative(process.cwd(), OUTPUT_PATH)} ${WIDTH}x${OUTPUT_HEIGHT} ` +
        `(JPEG quality ${JPEG_QUALITY}, progressive)`
    );
  } finally {
    if (browser) await browser.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
