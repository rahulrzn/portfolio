// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { metadataFor, sitemapResponse } from '../seo';
import { handlePagesRequest } from '../pages';
import { defaults } from '../../src/content/defaults';
import { initialEnvelope } from './fixtures';
import { SqliteD1 } from './sqlite';

const origin = 'https://portfolio.example';

describe('metadata derived only from current published routes', () => {
  it('uses newly published project titles and descriptions without relying on a built route', () => {
    const content = structuredClone(defaults);
    content.projects[0].slug = 'new-project-after-build';
    content.projects[0].title = 'New project after build';
    content.projects[0].description = 'The published description from the database.';
    const meta = metadataFor(new Request(`${origin}/projects/new-project-after-build`), content);
    expect(meta.title).toBe('New project after build | Rahul Reji R.');
    expect(meta.description).toBe('The published description from the database.');
    expect(meta.canonical).toBe(`${origin}/projects/new-project-after-build`);
    expect(meta.notFound).toBe(false);
  });

  it('returns a generic non-indexed page for a hidden project without exposing its content', () => {
    const content = structuredClone(defaults);
    content.projects[0].status = 'draft';
    content.projects[0].title = 'PRIVATE DRAFT TITLE';
    content.projects[0].description = 'PRIVATE DRAFT DESCRIPTION';
    content.projects[0].image = 'image:10000000-0000-4000-8000-000000000001';
    const meta = metadataFor(new Request(`${origin}/projects/soho-suite`), content);
    expect(meta.notFound).toBe(true);
    expect(meta.robots).toBe('noindex, nofollow');
    expect(meta.canonical).toBe('');
    expect(JSON.stringify(meta)).not.toContain('PRIVATE DRAFT');
    expect(JSON.stringify(meta)).not.toContain('10000000');
  });

  it('treats a removed build-time slug as unavailable', () => {
    const content = structuredClone(defaults);
    content.projects = content.projects.filter((project) => project.slug !== 'soho-suite');
    const meta = metadataFor(new Request(`${origin}/projects/soho-suite`), content);
    expect(meta.notFound).toBe(true);
    expect(meta.title).not.toContain('Soho Suite');
    expect(meta.robots).toBe('noindex, nofollow');
  });

  it('uses a configured site origin while normalizing duplicate trailing-slash routes', () => {
    const content = structuredClone(defaults);
    content.settings.siteUrl = 'https://configured.example/subdirectory?tracking=1';
    const meta = metadataFor(new Request(`${origin}/about/`), content);
    expect(meta.canonical).toBe('https://configured.example/about');
    expect(meta.title).toBe('About | Rahul Reji R.');
    expect(meta.description).toBe(content.profile.introduction);
  });

  it('selects a published project image through the public media endpoint', () => {
    const content = structuredClone(defaults);
    content.projects[0].image = 'image:10000000-0000-4000-8000-000000000001';
    const meta = metadataFor(new Request(`${origin}/projects/soho-suite`), content);
    expect(meta.image).toBe(`${origin}/api/media/10000000-0000-4000-8000-000000000001`);
  });

  it('derives person structured data from enabled published social links', () => {
    const content = structuredClone(defaults);
    content.profile.name = 'Name <script>unsafe markup</script>';
    content.socialLinks = [
      { id: 'hidden-link', platform: 'github', url: 'https://github.com/hidden-owner', enabled: false, order: 0 },
      { id: 'enabled-link', platform: 'instagram', url: 'https://instagram.com/visible.owner', enabled: true, order: 1 },
    ];
    const meta = metadataFor(new Request(`${origin}/`), content);
    expect(meta.structuredData?.name).toBe('Name <script>unsafe markup</script>');
    expect(meta.structuredData?.sameAs).toEqual(['https://instagram.com/visible.owner']);
    expect(JSON.stringify(meta)).not.toContain('hidden-owner');
  });
});

describe('dynamic sitemap', () => {
  it('lists only actual published public routes and excludes old build-time slugs', async () => {
    const envelope = initialEnvelope();
    envelope.revision = 4;
    envelope.published.projects = [
      { ...envelope.published.projects[0], slug: 'new-case' },
      { ...envelope.published.projects[1], slug: 'hidden-case', status: 'draft' },
    ];
    const response = sitemapResponse(new Request(`${origin}/sitemap.xml`), envelope);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/xml');
    expect(response.headers.get('Cache-Control')).toBe('no-cache, max-age=0, must-revalidate');
    const xml = await response.text();
    expect(xml).toContain(`<loc>${origin}/projects/new-case</loc>`);
    expect(xml).toContain(`<loc>${origin}/contact</loc>`);
    expect(Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g), (match) => match[1])).toEqual([
      `${origin}/`, `${origin}/about`, `${origin}/skills`, `${origin}/projects`,
      `${origin}/research`, `${origin}/contact`, `${origin}/projects/new-case`,
    ]);
    expect(xml).not.toContain('admin');
    expect(xml).not.toContain('hidden-case');
    expect(xml).not.toContain('soho-suite');
  });

  it('revalidates a sitemap revision with a bodyless 304', async () => {
    const envelope = initialEnvelope();
    envelope.revision = 4;
    const response = sitemapResponse(new Request(`${origin}/sitemap.xml`, { headers: { 'If-None-Match': 'W/"sitemap-4"' } }), envelope);
    expect(response.status).toBe(304);
    expect(await response.text()).toBe('');
    expect(response.headers.get('ETag')).toBe('"sitemap-4"');
  });

  it('escapes XML values from a configured origin', async () => {
    const envelope = initialEnvelope();
    envelope.published.settings.siteUrl = 'https://portfolio&team.example';
    const response = sitemapResponse(new Request(`${origin}/sitemap.xml`), envelope);
    const xml = await response.text();
    expect(xml).toContain('https://portfolio&amp;team.example/');
    expect(xml).not.toContain('<loc>https://portfolio&team.example/');
  });
});

describe('Pages middleware boundaries', () => {
  let db: SqliteD1;
  beforeEach(() => { db = new SqliteD1(); });
  afterEach(() => { db.sqlite.close(); });

  it.each(['/assets/application.js', '/assets/portrait.webp', '/favicon.svg', '/api/content'])('preserves $0 without doing metadata database work', async (path) => {
    const response = await handlePagesRequest({
      request: new Request(`${origin}${path}`), env: { PORTFOLIO_DB: db },
      next: async () => new Response('unchanged asset or API response', { headers: { 'Content-Type': 'application/octet-stream' } }),
    });
    expect(await response.text()).toBe('unchanged asset or API response');
    expect(db.sqlite.prepare('SELECT COUNT(*) AS count FROM rr_portfolio_content').get()?.count).toBe(0);
  });

  it('serves the sitemap through middleware using the database published document', async () => {
    const envelope = initialEnvelope();
    envelope.published.projects[0].slug = 'from-published-database';
    db.sqlite.prepare('INSERT INTO rr_portfolio_content (namespace, revision, document) VALUES (?, ?, ?)').run('rahul-portfolio:v1', 0, JSON.stringify(envelope));
    const response = await handlePagesRequest({
      request: new Request(`${origin}/sitemap.xml`), env: { PORTFOLIO_DB: db },
      next: async () => new Response('stale static sitemap'),
    });
    expect(await response.text()).toContain('/projects/from-published-database</loc>');
  });
});
