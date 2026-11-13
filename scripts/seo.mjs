import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { createServer, loadEnv } from 'vite';

// Build metadata from the same validated defaults that ship to visitors.
// Browser-local admin edits do not change deployed files.
const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
});
let content;
try {
  ({ defaults: content } = await server.ssrLoadModule('/src/content/defaults.ts'));
} finally {
  await server.close();
}
const env = loadEnv('production', process.cwd(), 'VITE_');
const suppliedOrigin = env.VITE_SITE_URL || content.settings.siteUrl;
let origin = '';
if (suppliedOrigin) {
  const parsed = new URL(suppliedOrigin);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password)
    throw new Error('VITE_SITE_URL must be a full HTTP(S) URL without credentials.');
  origin = parsed.origin;
}
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
const directory = resolve(process.argv[2] || 'dist');
const source = await readFile(resolve(directory, 'index.html'), 'utf8');
function replaceMeta(html, attribute, key, value) {
  // Prettier may wrap attributes onto separate lines. Attribute order should
  // not affect the content we publish into the static head.
  const identity = new RegExp(`\\b${attribute}\\s*=\\s*(["'])${key}\\1`, 'i');
  const target = html.match(/<meta\b[^>]*>/gi)?.find((tag) => identity.test(tag));
  if (!target) throw new Error(`Missing ${key} meta tag in the built HTML template.`);
  return html.replace(target, () => `<meta ${attribute}="${key}" content="${escape(value)}" />`);
}
let structuredDataHash = '';
const pages = [
  {
    path: '',
    title: content.settings.seoTitle,
    description: content.settings.seoDescription,
  },
  { path: 'projects', title: `Projects | ${content.profile.name}` },
  {
    path: 'about',
    title: `About | ${content.profile.name}`,
    description: content.profile.introduction,
  },
  { path: 'skills', title: `Skills | ${content.profile.name}` },
  ...content.projects
    .filter((p) => p.status === 'published')
    .map((p) => ({
      path: `projects/${p.slug}`,
      title: `${p.title} | ${content.profile.name}`,
      description: p.description,
    })),
  { path: 'research', title: `Research | ${content.profile.name}` },
  { path: 'contact', title: `Contact | ${content.profile.name}` },
  {
    path: 'admin',
    title: `Content workspace | ${content.profile.name}`,
    private: true,
  },
  ...['login', 'dashboard', 'profile', 'projects', 'skills', 'research', 'settings'].map((p) => ({
    path: `admin/${p}`,
    title: `Content workspace | ${content.profile.name}`,
    private: true,
  })),
];
for (const page of pages) {
  const description = page.description || content.settings.seoDescription;
  let html = source.replace(
    /<title>[\s\S]*?<\/title>/i,
    () => `<title>${escape(page.title)}</title>`,
  );
  html = replaceMeta(html, 'name', 'description', description);
  html = replaceMeta(html, 'property', 'og:title', page.title);
  html = replaceMeta(html, 'property', 'og:description', description);
  const url = origin ? `${origin}/${page.path}` : '';
  let extra = `<meta name="robots" content="${page.private ? 'noindex, nofollow' : 'index, follow'}" />`;
  if (url && !page.private) {
    extra += `\n<link rel="canonical" href="${escape(url)}" />\n<meta property="og:url" content="${escape(url)}" />`;
    html = replaceMeta(html, 'property', 'og:image', `${origin}/assets/social-preview.png`);
    if (!page.path) {
      const person = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: content.profile.name,
        url: origin,
        image: `${origin}/assets/rahul-portrait.webp`,
        sameAs: [content.profile.githubUrl, content.profile.linkedinUrl].filter(Boolean),
      };
      const json = JSON.stringify(person).replace(/</g, '\\u003c');
      structuredDataHash = createHash('sha256').update(json).digest('base64');
      extra += `\n<script type="application/ld+json">${json}</script>`;
    }
  }
  html = html.replace('</head>', `${extra}\n</head>`);
  const pageDirectory = resolve(directory, page.path);
  await mkdir(pageDirectory, { recursive: true });
  await writeFile(resolve(pageDirectory, 'index.html'), html);
}
await writeFile(
  resolve(directory, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /admin\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ''}`,
);
if (structuredDataHash) {
  const headers = await readFile(resolve(directory, '_headers'), 'utf8');
  await writeFile(
    resolve(directory, '_headers'),
    headers.replace("script-src 'self';", `script-src 'self' 'sha256-${structuredDataHash}';`),
  );
}
if (origin) {
  await writeFile(
    resolve(directory, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
      .filter((p) => !p.private)
      .map((p) => `  <url><loc>${escape(`${origin}/${p.path}`)}</loc></url>`)
      .join('\n')}\n</urlset>\n`,
  );
}
console.log(
  `Generated metadata for ${pages.length} routes.${origin ? ' Sitemap generated.' : ' Set VITE_SITE_URL to add canonical URLs and a sitemap.'}`,
);
