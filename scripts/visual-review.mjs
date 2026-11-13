import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const directory = 'docs/screenshots';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const findings = [];
try {
  for (const [label, width, height] of [
    ['desktop', 1440, 1000],
    ['mobile', 390, 844],
    ['tablet', 768, 1024],
  ]) {
    for (const theme of ['dark', 'light']) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      await page.addInitScript(
        (theme) => localStorage.setItem('rahul-portfolio:theme:v1', theme),
        theme,
      );
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      for (const [route, name] of [
        ['/', 'home'],
        ['/about', 'about'],
        ['/skills', 'skills'],
        ['/projects', 'projects'],
        ['/projects/soho-suite', 'case-study'],
        ['/research', 'research'],
        ['/contact', 'contact'],
      ]) {
        await page.goto('http://127.0.0.1:5173' + route);
        await page.locator('main h1').waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.locator('img').evaluateAll((images) =>
          Promise.all(
            images.map((img) => {
              img.loading = 'eager';
              return img.decode().catch(() => {});
            }),
          ),
        );
        await page.screenshot({
          path: directory + '/' + label + '-' + name + '-' + theme + '.png',
          fullPage: true,
          animations: 'disabled',
        });
        if (theme === 'dark')
          await page.screenshot({
            path: directory + '/' + label + '-' + name + '.png',
            fullPage: true,
            animations: 'disabled',
          });
        if (name === 'home') {
          await page.screenshot({
            path: directory + '/' + label + '-hero-' + theme + '.png',
            animations: 'disabled',
          });
          if (theme === 'dark')
            await page.screenshot({
              path: directory + '/' + label + '-hero.png',
              animations: 'disabled',
            });
          await page.getByRole('link', { name: 'Skip to content' }).focus();
          await page.screenshot({
            path: directory + '/' + label + '-skip-' + theme + '.png',
            animations: 'disabled',
          });
          const opportunities = page.locator('.opportunities-section');
          await page.getByRole('link', { name: 'Skip to content' }).evaluate((link) => link.blur());
          if (await opportunities.count())
            await opportunities.screenshot({
              path: directory + '/' + label + '-opportunities-' + theme + '.png',
              animations: 'disabled',
              // Region captures omit sticky chrome; full-page captures retain it.
              style: '.site-header, .skip-link { visibility: hidden !important; }',
            });
        }
        findings.push({
          label,
          theme,
          route,
          overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          errors: [...errors],
        });
      }
      await page.close();
    }
  }
  const comparison = await browser.newPage({ viewport: { width: 1440, height: 555 } });
  const before = (await readFile('docs/screenshots-before/desktop-hero.png')).toString('base64');
  const after = (await readFile(directory + '/desktop-hero.png')).toString('base64');
  await comparison.setContent(
    '<html><head><style>body{margin:0;background:#171918;color:#eff1eb;font-family:Arial,sans-serif}.pair{display:flex}figure{margin:0;width:720px}figcaption{height:55px;padding:18px 24px;box-sizing:border-box;font-size:15px;font-weight:bold}img{display:block;width:720px;height:500px;object-fit:contain}</style></head><body><div class="pair"><figure><figcaption>Before — rejected split composition</figcaption><img src="data:image/png;base64,' +
      before +
      '"></figure><figure><figcaption>After — mixed-color editorial composition</figcaption><img src="data:image/png;base64,' +
      after +
      '"></figure></div></body></html>',
  );
  await comparison.screenshot({ path: directory + '/before-after-desktop.png' });
  await writeFile(directory + '/findings.json', JSON.stringify(findings, null, 2));
  console.log(
    JSON.stringify(
      {
        captures: findings.length,
        failures: findings.filter((finding) => finding.overflow || finding.errors.length),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
