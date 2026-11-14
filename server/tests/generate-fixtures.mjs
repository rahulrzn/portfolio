import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Reproducible, genuine browser-encoded raster files for the server parser
// tests. The tests consume these small files without launching a browser.
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const images = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    context.fillStyle = '#f2f1eb';
    context.fillRect(0, 0, 64, 64);
    context.fillStyle = '#2563eb';
    context.fillRect(16, 16, 32, 32);
    return ['image/jpeg', 'image/webp'].map((mime) => ({ mime, data: canvas.toDataURL(mime, 0.8).split(',')[1] }));
  });
  const directory = new URL('./fixtures/', import.meta.url);
  await mkdir(directory, { recursive: true });
  for (const image of images) {
    await writeFile(new URL(image.mime === 'image/jpeg' ? 'jpeg-64.jpg' : 'webp-64.webp', directory), Buffer.from(image.data, 'base64'));
  }
  console.log('Generated 64×64 JPEG and WebP server test fixtures.');
} finally {
  await browser.close();
}
