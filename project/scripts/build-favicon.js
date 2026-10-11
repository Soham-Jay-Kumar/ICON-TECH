const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(
  ROOT,
  'public',
  'images',
  'icon-technology-logo-dark.png',
);
const OUTPUT = path.join(ROOT, 'app', 'icon.png');

async function buildFavicon() {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: 512, height: 512 },
    });
    const source = `data:image/png;base64,${fs.readFileSync(SOURCE).toString('base64')}`;

    await page.setContent(
      '<style>html,body{margin:0;background:transparent}canvas{display:block}</style><canvas width="512" height="512"></canvas>',
    );

    const favicon = await page.evaluate(async (imageSource) => {
      const image = new Image();
      image.src = imageSource;
      await image.decode();

      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = image.naturalWidth;
      sourceCanvas.height = image.naturalHeight;
      const sourceContext = sourceCanvas.getContext('2d');
      sourceContext.drawImage(image, 0, 0);

      // Remove the orange sparkle without touching the nearby teal ring.
      sourceContext.globalCompositeOperation = 'destination-out';
      sourceContext.beginPath();
      sourceContext.moveTo(299, 17);
      sourceContext.bezierCurveTo(302, 31, 309, 38, 323, 41);
      sourceContext.bezierCurveTo(309, 44, 302, 51, 299, 66);
      sourceContext.bezierCurveTo(296, 51, 289, 44, 275, 41);
      sourceContext.bezierCurveTo(289, 38, 296, 31, 299, 17);
      sourceContext.closePath();
      sourceContext.fill();
      sourceContext.clearRect(294, 0, 30, 68);

      const output = document.querySelector('canvas');
      const outputContext = output.getContext('2d');
      outputContext.imageSmoothingEnabled = true;
      outputContext.imageSmoothingQuality = 'high';

      // This square contains only the wordmark's O/anchor symbol. Its top
      // edge starts below the teal sparkle, so neither sparkle is retained.
      outputContext.drawImage(
        sourceCanvas,
        183,
        39,
        170,
        170,
        0,
        0,
        output.width,
        output.height,
      );

      return output.toDataURL('image/png');
    }, source);

    fs.writeFileSync(OUTPUT, Buffer.from(favicon.split(',')[1], 'base64'));
  } finally {
    await browser.close();
  }
}

buildFavicon().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
