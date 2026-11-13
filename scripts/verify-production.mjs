import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createServer as createViteServer, loadEnv } from 'vite';

const directory = resolve(process.argv[2] || 'dist');
const loader = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' });
let content;
try {
  ({ defaults: content } = await loader.ssrLoadModule('/src/content/defaults.ts'));
} finally {
  await loader.close();
}
const env = loadEnv('production', process.cwd(), 'VITE_');
const site = env.VITE_SITE_URL || content.settings.siteUrl;
const origin = site ? new URL(site).origin : '';
const publicPages = [
  { path: '', title: content.settings.seoTitle },
  { path: 'projects', title: `Projects | ${content.profile.name}` },
  {
    path: 'about',
    title: `About | ${content.profile.name}`,
    description: content.profile.introduction,
  },
  { path: 'skills', title: `Skills | ${content.profile.name}` },
  ...content.projects
    .filter((project) => project.status === 'published')
    .map((project) => ({
      path: `projects/${project.slug}`,
      title: `${project.title} | ${content.profile.name}`,
      description: project.description,
    })),
  { path: 'research', title: `Research | ${content.profile.name}` },
  { path: 'contact', title: `Contact | ${content.profile.name}` },
];
const adminPages = [
  'admin',
  ...['login', 'dashboard', 'profile', 'projects', 'skills', 'research', 'settings'].map(
    (path) => `admin/${path}`,
  ),
].map((path) => ({ path, title: `Content workspace | ${content.profile.name}`, private: true }));
const rawHeaders = await readFile(resolve(directory, '_headers'), 'utf8');
const headers = Object.fromEntries(
  rawHeaders
    .split('\n')
    .filter((line) => line.startsWith('  '))
    .slice(0, 5)
    .map((line) => {
      const split = line.indexOf(':');
      return [line.slice(0, split).trim(), line.slice(split + 1).trim()];
    }),
);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let filename = resolve(directory, `.${pathname}`);
    if (filename !== directory && !filename.startsWith(directory + sep)) {
      response.writeHead(403);
      response.end();
      return;
    }
    try {
      if ((await stat(filename)).isDirectory()) filename = resolve(filename, 'index.html');
      await stat(filename);
    } catch {
      if (pathname.startsWith('/assets/')) {
        response.writeHead(404);
        response.end();
        return;
      }
      filename = resolve(directory, 'index.html');
    }
    response.writeHead(200, {
      ...headers,
      'Content-Type': mime[extname(filename)] || 'application/octet-stream',
      ...(pathname.startsWith('/admin') ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}),
    });
    response.end(await readFile(filename));
  } catch {
    response.writeHead(500);
    response.end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  for (const expected of [...publicPages, ...adminPages]) {
    const route = `/${expected.path}`;
    const html = await readFile(resolve(directory, expected.path, 'index.html'), 'utf8');
    // Inspect the static head before the runtime Seo effect can repair it.
    // DOMParser handles formatting, attribute order and HTML entity decoding.
    const head = await page.evaluate((source) => {
      const document = new DOMParser().parseFromString(source, 'text/html');
      const values = (selector) =>
        [...document.head.querySelectorAll(selector)].map((element) =>
          element.getAttribute('content'),
        );
      return {
        title: document.title,
        description: values('meta[name="description"]'),
        ogTitle: values('meta[property="og:title"]'),
        ogDescription: values('meta[property="og:description"]'),
        robots: values('meta[name="robots"]'),
        canonical: [...document.head.querySelectorAll('link[rel="canonical"]')].map((element) =>
          element.getAttribute('href'),
        ),
        ogUrl: values('meta[property="og:url"]'),
        ogImage: values('meta[property="og:image"]'),
        structuredData: [
          ...document.head.querySelectorAll('script[type="application/ld+json"]'),
        ].map((element) => element.textContent),
      };
    }, html);
    const description = expected.description || content.settings.seoDescription;
    assert.equal(head.title, expected.title, `${route}: static title must match content`);
    assert.deepEqual(
      head.description,
      [description],
      `${route}: static description must match content`,
    );
    assert.deepEqual(
      head.ogTitle,
      [expected.title],
      `${route}: Open Graph title must match content`,
    );
    assert.deepEqual(
      head.ogDescription,
      [description],
      `${route}: Open Graph description must match content`,
    );
    assert.deepEqual(
      head.robots,
      [expected.private ? 'noindex, nofollow' : 'index, follow'],
      `${route}: static indexing directive`,
    );
    const canonical = origin && !expected.private ? `${origin}${route}` : '';
    assert.deepEqual(
      head.canonical,
      canonical ? [canonical] : [],
      `${route}: configured canonical origin`,
    );
    assert.deepEqual(
      head.ogUrl,
      canonical ? [canonical] : [],
      `${route}: configured Open Graph URL`,
    );
    assert.deepEqual(
      head.ogImage,
      [canonical ? `${origin}/assets/social-preview.png` : '/assets/social-preview.png'],
      `${route}: social image origin`,
    );
    assert.equal(
      head.structuredData.length,
      origin && !expected.path ? 1 : 0,
      `${route}: structured data scope`,
    );
    if (head.structuredData.length) {
      const person = JSON.parse(head.structuredData[0]);
      assert.deepEqual(
        person,
        {
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: content.profile.name,
          url: origin,
          image: `${origin}/assets/rahul-portrait.webp`,
          sameAs: [content.profile.githubUrl, content.profile.linkedinUrl].filter(Boolean),
        },
        'Structured data must use the configured origin and verified profile',
      );
      const hash = createHash('sha256').update(head.structuredData[0]).digest('base64');
      assert.ok(
        headers['Content-Security-Policy'].includes(`'sha256-${hash}'`),
        'CSP must authorize the exact structured-data bytes',
      );
    }
  }
  const robots = await readFile(resolve(directory, 'robots.txt'), 'utf8');
  assert.equal(
    robots,
    `User-agent: *\nAllow: /\nDisallow: /admin\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ''}`,
  );
  if (origin) {
    const xml = await readFile(resolve(directory, 'sitemap.xml'), 'utf8');
    const urls = await page.evaluate(
      (source) =>
        [...new DOMParser().parseFromString(source, 'application/xml').querySelectorAll('loc')].map(
          (element) => element.textContent,
        ),
      xml,
    );
    assert.deepEqual(
      urls,
      publicPages.map((expected) => `${origin}/${expected.path}`),
      'Sitemap must contain exactly public routes at the configured origin',
    );
  } else
    await assert.rejects(
      readFile(resolve(directory, 'sitemap.xml')),
      { code: 'ENOENT' },
      'An unset origin must not publish a fabricated sitemap',
    );
  for (const expected of publicPages) {
    const response = await page.goto(`${base}/${expected.path}`);
    assert.equal(response.status(), 200);
    await page.locator('main h1').waitFor();
    assert.equal(await page.title(), expected.title);
    assert.equal(await page.locator('.error-page').count(), 0);
  }
  await page.goto(`${base}/admin/login`);
  await page.getByRole('heading', { name: 'Local development workspace' }).waitFor();
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
  await page.goto(`${base}/`);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download résumé', exact: true }).first().click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'rahul-reji-resume.pdf');
  const pdf = await readFile(await download.path());
  assert.equal(pdf.subarray(0, 8).toString(), '%PDF-1.4');
  assert.deepEqual(errors, []);
  async function files(folder) {
    const entries = await readdir(folder, { withFileTypes: true });
    return (
      await Promise.all(
        entries.map((entry) =>
          entry.isDirectory() ? files(resolve(folder, entry.name)) : resolve(folder, entry.name),
        ),
      )
    ).flat();
  }
  const outputFiles = await files(directory);
  assert.ok(outputFiles.every((file) => !/(reference|\.pdf$|\.env|node_modules)/i.test(file)));
  assert.ok((await stat(resolve(directory, 'assets/rahul-portrait.webp'))).size < 100_000);
  assert.ok((await stat(resolve(directory, 'assets/social-preview.png'))).size > 1000);
  console.log(
    `Production smoke passed: ${publicPages.length} public routes, ${adminPages.length} static admin noindex pages, exact descriptions and Open Graph metadata, ${origin ? 'configured origin/sitemap/structured-data CSP' : 'unset origin without fabricated URLs'}, loaded assets, résumé download and private-file exclusion.`,
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
