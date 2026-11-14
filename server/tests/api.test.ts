// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handleApi } from '../api';
import { SqliteD1 } from './sqlite';
import { initialEnvelope } from './fixtures';
import { publicContentResponseSchema } from '../../src/content/contracts';

describe('public content and fail-closed API behavior', () => {
  let db: SqliteD1;

  beforeEach(() => { db = new SqliteD1(); });
  afterEach(() => { db.sqlite.close(); });

  it('initializes an absent row with factual defaults and revalidation headers', async () => {
    const response = await handleApi(new Request('https://portfolio.example/api/content'), { PORTFOLIO_DB: db });
    expect(response.status).toBe(200);
    const body = publicContentResponseSchema.parse(await response.json());
    expect(body.content.profile.name).toBe('Rahul Reji R.');
    expect(body.content.projects.map((project: { slug: string }) => project.slug)).toEqual(['soho-suite', 'campusvoice', 'claimwise']);
    expect(body.content.projects[1].outcomes[0].value).toBe('90.01%');
    expect(body.revision).toBe(0);
    expect(response.headers.get('Cache-Control')).toBe('no-cache, max-age=0, must-revalidate');
    expect(response.headers.get('ETag')).toBe('"portfolio-0"');
    const row = db.sqlite.prepare('SELECT revision, document FROM rr_portfolio_content').get();
    expect(row?.revision).toBe(0);
    expect(JSON.parse(row?.document as string).draft.profile.name).toBe('Rahul Reji R.');
  });

  it('responds to a matching public revision with 304 and no body', async () => {
    await handleApi(new Request('https://portfolio.example/api/content'), { PORTFOLIO_DB: db });
    const response = await handleApi(new Request('https://portfolio.example/api/content', {
      headers: { 'If-None-Match': 'W/"portfolio-0", "unrelated"' },
    }), { PORTFOLIO_DB: db });
    expect(response.status).toBe(304);
    expect(await response.text()).toBe('');
    expect(response.headers.get('ETag')).toBe('"portfolio-0"');
  });

  it('omits hidden entries and disabled social profiles from every public field', async () => {
    const envelope = initialEnvelope();
    envelope.published.projects[0].status = 'draft';
    envelope.published.projects[0].title = 'PRIVATE DRAFT PROJECT';
    envelope.published.research[0].status = 'draft';
    envelope.published.research[0].title = 'PRIVATE DRAFT RESEARCH';
    envelope.published.profile.githubUrl = 'https://github.com/hidden-owner';
    envelope.published.socialLinks = [
      { id: 'hidden-social', platform: 'github', url: 'https://github.com/hidden-owner', enabled: false, order: 0 },
      { id: 'visible-social', platform: 'instagram', url: 'https://instagram.com/visible.owner', enabled: true, order: 1 },
    ];
    db.sqlite.prepare('INSERT INTO rr_portfolio_content (namespace, revision, document) VALUES (?, ?, ?)')
      .run('rahul-portfolio:v1', 0, JSON.stringify(envelope));
    const response = await handleApi(new Request('https://portfolio.example/api/content'), { PORTFOLIO_DB: db });
    expect(response.status).toBe(200);
    const raw = await response.text();
    expect(raw).not.toContain('PRIVATE DRAFT');
    expect(raw).not.toContain('hidden-owner');
    expect(JSON.parse(raw).content.socialLinks).toEqual([
      { id: 'visible-social', platform: 'instagram', url: 'https://instagram.com/visible.owner', enabled: true, order: 1 },
    ]);
  });

  it('rejects a row whose document revision disagrees with its atomic revision', async () => {
    db.sqlite.prepare('INSERT INTO rr_portfolio_content (namespace, revision, document) VALUES (?, ?, ?)')
      .run('rahul-portfolio:v1', 4, JSON.stringify(initialEnvelope()));
    const response = await handleApi(new Request('https://portfolio.example/api/content'), { PORTFOLIO_DB: db });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'CONTENT_INVALID' });
    expect(db.sqlite.prepare('SELECT revision FROM rr_portfolio_content').get()?.revision).toBe(4);
  });

  it('never replaces a populated damaged content document with defaults', async () => {
    db.sqlite.prepare('INSERT INTO rr_portfolio_content (namespace, revision, document) VALUES (?, ?, ?)')
      .run('rahul-portfolio:v1', 7, '{preserve-this-damaged-document');
    const response = await handleApi(new Request('https://portfolio.example/api/content'), { PORTFOLIO_DB: db });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'CONTENT_INVALID' });
    expect(db.sqlite.prepare('SELECT document FROM rr_portfolio_content').get()?.document).toBe('{preserve-this-damaged-document');
  });

  it('returns a private unauthenticated session when server configuration is absent', async () => {
    const response = await handleApi(new Request('https://portfolio.example/api/auth/session'), {});
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authenticated: false });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('does not trust a browser authentication header for admin reads', async () => {
    const response = await handleApi(new Request('https://portfolio.example/api/admin/content', {
      headers: { Authorization: 'Bearer browser-controlled-value' },
    }), { PORTFOLIO_DB: db });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: 'UNAUTHORIZED' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns structured JSON for unknown API routes without touching the database', async () => {
    const response = await handleApi(new Request('https://portfolio.example/api/unknown'), {});
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'API route not found.', code: 'NOT_FOUND' });
  });

  it('returns a setup error without exposing database details', async () => {
    const response = await handleApi(new Request('https://portfolio.example/api/content'), {});
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Portfolio storage is not configured.', code: 'NOT_CONFIGURED' });
  });
});
