import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const loader = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
let content;
try {
  ({ defaults: content } = await loader.ssrLoadModule('/src/content/defaults.ts'));
} finally {
  await loader.close();
}
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
const data = async (path, type) =>
  'data:' + type + ';base64,' + (await readFile(path)).toString('base64');
const [body, heading, display, portrait, mark] = await Promise.all([
  data(
    'node_modules/@fontsource-variable/source-sans-3/files/source-sans-3-latin-wght-normal.woff2',
    'font/woff2',
  ),
  data(
    'node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2',
    'font/woff2',
  ),
  data('node_modules/@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2', 'font/woff2'),
  data('public/assets/rahul-portrait.webp', 'image/webp'),
  data('public/favicon.svg', 'image/svg+xml'),
]);
const name = content.profile.name
  .split(' ')
  .map((word, index) => `<span class="word-${index % 3}">${escape(word)}</span>`)
  .join(' ');
const projects = content.projects
  .filter((project) => project.status === 'published')
  .slice(0, 3)
  .map((project) => escape(project.title))
  .join(' &nbsp; / &nbsp; ');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(`<!doctype html><html lang="en"><head><style>
    @font-face{font-family:Source;src:url(${body});font-weight:200 900}
    @font-face{font-family:Space;src:url(${heading});font-weight:300 700}
    @font-face{font-family:Bebas;src:url(${display})}
    *{box-sizing:border-box}body{margin:0;background:#171918;color:#eff1eb;font-family:Source;padding:28px 48px;height:630px}
    header{display:flex;justify-content:space-between;align-items:center;font-size:16px;color:#c6d0c8}
    .identity{display:flex;align-items:center;gap:12px;font-family:Space;font-weight:600;color:#eff1eb}.mark{width:44px;height:44px}
    h1{font:176px/1 Bebas;letter-spacing:-3px;margin:12px 0 10px}.word-0{color:#a9bcff}.word-2{color:#c5a3ff}
    main{display:grid;grid-template-columns:1fr 218px 1fr;gap:55px;align-items:center}
    p{font-size:19px;line-height:1.6;max-width:320px;color:#c6d0c8}h2{font:600 50px/1.13 Space;letter-spacing:-1px;margin:0}
    .photo{padding:8px;background:#eff1eb;transform:rotate(-4deg);position:relative;isolation:isolate}
    .photo:before{content:"";position:absolute;inset:8px -13px -10px 8px;z-index:-1;background:#e8eea2;transform:rotate(6deg)}
    .portrait{width:202px;height:269px;object-fit:cover}
    footer{border-top:1px solid #424c45;margin-top:28px;padding-top:17px;font-size:16px;color:#c6d0c8}
  </style></head><body><header><span class="identity"><img class="mark" src="${mark}" alt="">${escape(content.profile.name)}</span><span>Backend engineering / Data / Applied AI</span></header>
  <h1>${name}</h1><main><p>${escape(content.profile.introduction)}</p><div class="photo"><img class="portrait" src="${portrait}" alt="Portrait of ${escape(content.profile.name)}"></div><h2>${escape(content.profile.headline)}</h2></main><footer>${projects}</footer></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page
    .locator('img')
    .evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
  await page.screenshot({ path: 'public/assets/social-preview.png' });
} finally {
  await browser.close();
}
console.log(
  'Generated 1200 × 630 social preview from verified defaults with final fonts, portrait and RR icon.',
);
