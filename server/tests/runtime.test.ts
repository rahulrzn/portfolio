// @vitest-environment node
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, URL as NodeURL } from 'node:url';
import { build } from 'esbuild';
import { convertV4MiniflareOptions, Miniflare } from 'miniflare';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { defaults } from '../../src/content/defaults';
import { sessionInfoSchema } from '../../src/content/contracts';
import { pngBytes, testHash, testPassword } from './fixtures';

const origin = 'https://portfolio.example';
// The runtime dependency is already used by Vitest. Keep its small consumed
// interface typed without requiring another dependency for these Node tests.
interface ParsedElement { getAttribute(name: string): string | null; textContent: string | null }
interface ParsedDocument {
  title: string;
  querySelector(selector: string): ParsedElement | null;
  querySelectorAll(selector: string): ArrayLike<ParsedElement>;
}
const { JSDOM } = createRequire(import.meta.url)('jsdom') as { JSDOM: new (html: string) => { window: { document: ParsedDocument } } };

describe('native Cloudflare runtime boundaries', () => {
  let runtime: Miniflare;
  let db: Awaited<ReturnType<Miniflare['getD1Database']>>;
  let directory: string;

  beforeAll(async () => {
    const result = await build({
      entryPoints: [fileURLToPath(new NodeURL('./runtime-worker.ts', import.meta.url))],
      bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', logLevel: 'silent',
    });
    directory = mkdtempSync(join(tmpdir(), 'rr-portfolio-runtime-'));
    const options = convertV4MiniflareOptions({
      name: 'portfolio-server-tests',
      modules: true, script: result.outputFiles[0].text, compatibilityDate: '2026-11-13',
      bindings: { ADMIN_PASSWORD_HASH: testHash() }, d1Databases: ['PORTFOLIO_DB'],
    });
    runtime = new Miniflare({ ...options, enableDevRegistry: false, unsafeEnableSharedStorage: false,
      isolatedResourcePersistencePath: join(directory, 'state'), resourceTmpPath: join(directory, 'tmp'), telemetry: { enabled: false } });
    db = await runtime.getD1Database('PORTFOLIO_DB');
    const migration = readFileSync(new NodeURL('../../migrations/0001_portfolio.sql', import.meta.url), 'utf8');
    await db.batch(migration.split(';').map((statement) => statement.trim()).filter(Boolean).map((statement) => db.prepare(statement)));
  }, 20_000);
  afterAll(async () => {
    await runtime?.dispose();
    if (directory) {
      const absolute = resolve(directory);
      if (dirname(absolute) !== resolve(tmpdir()) || !basename(absolute).startsWith('rr-portfolio-runtime-')) throw new Error('Unsafe temporary runtime directory');
      rmSync(absolute, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    // These tables belong only to this isolated Miniflare instance, never to
    // the workspace's local database or a remote Cloudflare account.
    await db.batch(['rr_portfolio_content', 'rr_portfolio_sessions', 'rr_portfolio_login_buckets', 'rr_portfolio_media'].map((table) => db.prepare(`DELETE FROM ${table}`)));
  });

  const request = (path: string, init?: Parameters<Miniflare['dispatchFetch']>[1]) => runtime.dispatchFetch(`${origin}${path}`, init);
  async function authorization(): Promise<Record<string, string>> {
    const response = await request('/api/auth/login', {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: testPassword }),
    });
    expect(response.status).toBe(200);
    const session = sessionInfoSchema.parse(await response.json());
    return { Origin: origin, Cookie: response.headers.get('Set-Cookie')!.split(';')[0], 'X-CSRF-Token': session.csrfToken!, 'Content-Type': 'application/json' };
  }
  async function save(content: typeof defaults, expectedRevision: number, headers: Record<string, string>) {
    return request('/api/admin/content', { method: 'PUT', headers, body: JSON.stringify({ content, expectedRevision, label: 'Runtime edit' }) });
  }
  async function publish(expectedRevision: number, headers: Record<string, string>) {
    return request('/api/admin/publish', { method: 'POST', headers, body: JSON.stringify({ expectedRevision }) });
  }

  it('rewrites HTML using current published fields and preserves static app assets', async () => {
    const headers = await authorization();
    const content = structuredClone(defaults);
    content.projects[0].slug = 'added-after-build';
    content.projects[0].title = 'Case <img src=x onerror=alert(1)> "title"';
    content.projects[0].description = 'A description "><script>untrusted()</script> & useful text';
    expect((await save(content, 0, headers)).status).toBe(200);
    expect((await publish(1, headers)).status).toBe(200);
    const response = await request('/projects/added-after-build');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-cache, max-age=0, must-revalidate');
    const html = await response.text();
    const document = new JSDOM(html).window.document;
    expect(document.title).toBe('Case <img src=x onerror=alert(1)> "title" | Rahul Reji R.');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(content.projects[0].description);
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(document.title);
    expect(document.querySelector('head img')).toBeNull();
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${origin}/projects/added-after-build`);
    expect(document.querySelectorAll('script')).toHaveLength(2);
    expect(document.querySelector('script[type="module"]')?.getAttribute('src')).toBe('/assets/application.js');
    expect(document.querySelector('link[rel="stylesheet"]')?.getAttribute('href')).toBe('/assets/application.css');
    const structured = document.querySelector('script[type="application/ld+json"]')?.textContent ?? '';
    expect(structured).not.toContain('<script>');
    expect(JSON.parse(structured).name).toBe(content.projects[0].title);
    expect(response.headers.get('Content-Security-Policy')).toContain(`'sha256-${createHash('sha256').update(structured).digest('base64')}'`);
    expect(html).not.toContain('STALE STRUCTURED PERSON');
    expect(response.headers.get('ETag')).toBeNull();
  });

  it('returns non-indexed 404 HTML for a hidden project and excludes it from API and sitemap', async () => {
    const headers = await authorization();
    const content = structuredClone(defaults);
    content.projects[0].status = 'draft';
    content.projects[0].title = 'PRIVATE HIDDEN PROJECT';
    expect((await save(content, 0, headers)).status).toBe(200);
    expect((await publish(1, headers)).status).toBe(200);
    const response = await request('/projects/soho-suite');
    expect(response.status).toBe(404);
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    const html = await response.text();
    expect(html).not.toContain('PRIVATE HIDDEN PROJECT');
    const document = new JSDOM(html).window.document;
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
    expect(await (await request('/api/content')).text()).not.toContain('PRIVATE HIDDEN PROJECT');
    expect(await (await request('/sitemap.xml')).text()).not.toContain('soho-suite');
  });

  it('makes all admin HTML private and removes stale structured data', async () => {
    const response = await request('/admin/profile');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    const document = new JSDOM(await response.text()).window.document;
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
    expect(document.querySelector('script[type="application/ld+json"]')).toBeNull();
    expect((await db.prepare('SELECT COUNT(*) AS count FROM rr_portfolio_content').first<{ count: number }>())?.count).toBe(0);
  });

  it('validates PNG decompression and reads real D1 BLOBs through the media API', async () => {
    const headers = await authorization();
    const bytes = pngBytes();
    const uploaded = await request('/api/admin/media', { method: 'POST', headers: { ...headers, 'Content-Type': 'image/png' }, body: bytes.buffer });
    expect(uploaded.status).toBe(201);
    const id = (await uploaded.json() as { id: string }).id;
    expect((await request(`/api/media/${id.slice(6)}`)).status).toBe(404);
    const privateResponse = await request(`/api/media/${id.slice(6)}`, { headers: { Cookie: headers.Cookie } });
    expect(privateResponse.status).toBe(200);
    expect(Buffer.from(await privateResponse.arrayBuffer()).equals(Buffer.from(bytes))).toBe(true);
    const content = structuredClone(defaults);
    content.profile.image = id;
    expect((await save(content, 0, headers)).status).toBe(200);
    expect((await publish(1, headers)).status).toBe(200);
    const publicResponse = await request(`/api/media/${id.slice(6)}`);
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.headers.get('Cache-Control')).toContain('immutable');
  });

  it('enforces D1 compare-and-swap during simultaneous native runtime saves', async () => {
    const headers = await authorization();
    await request('/api/content');
    const first = structuredClone(defaults), second = structuredClone(defaults);
    first.profile.headline = 'First runtime writer';
    second.profile.headline = 'Second runtime writer';
    const responses = await Promise.all([save(first, 0, headers), save(second, 0, headers)]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect((await db.prepare('SELECT revision FROM rr_portfolio_content').first<{ revision: number }>())?.revision).toBe(1);
  });

  it('atomically limits concurrent native-runtime password failures', async () => {
    const responses = await Promise.all(Array.from({ length: 6 }, () => request('/api/auth/login', {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.50' },
      body: JSON.stringify({ password: 'incorrect-runtime-test-password' }),
    })));
    expect(responses.map((response) => response.status).sort()).toEqual([401, 401, 401, 401, 401, 429]);
    expect((await db.prepare('SELECT attempts FROM rr_portfolio_login_buckets WHERE bucket_key = ?').bind('global').first<{ attempts: number }>())?.attempts).toBe(5);
  });
});
