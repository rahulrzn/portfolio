// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handleApi } from '../api';
import type { ServerEnvironment } from '../types';
import { defaults } from '../../src/content/defaults';
import { contentSchema, envelopeSchema, type Content, type Envelope } from '../../src/content/schema';
import { publicContentResponseSchema, sessionInfoSchema } from '../../src/content/contracts';
import { testHash, testPassword } from './fixtures';
import { SqliteD1 } from './sqlite';

const origin = 'https://portfolio.example';
const hash = testHash();

async function authorizedHeaders(env: ServerEnvironment): Promise<Record<string, string>> {
  const response = await handleApi(new Request(`${origin}/api/auth/login`, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: testPassword }),
  }), env);
  expect(response.status).toBe(200);
  const session = sessionInfoSchema.parse(await response.json());
  return { Origin: origin, 'Content-Type': 'application/json', Cookie: response.headers.get('Set-Cookie')!.split(';')[0], 'X-CSRF-Token': session.csrfToken! };
}

describe('atomic draft and publication persistence', () => {
  let db: SqliteD1;
  let env: ServerEnvironment;
  let headers: Record<string, string>;

  beforeEach(async () => { db = new SqliteD1(); env = { PORTFOLIO_DB: db, ADMIN_PASSWORD_HASH: hash }; headers = await authorizedHeaders(env); });
  afterEach(() => { db.sqlite.close(); });

  const mutate = (path: string, body: unknown, method = 'POST', requestHeaders: HeadersInit = headers) =>
    handleApi(new Request(`${origin}${path}`, { method, headers: requestHeaders, body: JSON.stringify(body) }), env);
  const save = (content: Content, expectedRevision = 0, label = 'Saved profile') =>
    mutate('/api/admin/content', { content, expectedRevision, label }, 'PUT');
  const admin = async (): Promise<Envelope> => envelopeSchema.parse(await (await handleApi(new Request(`${origin}/api/admin/content`, { headers }), env)).json());
  const visitor = async () => publicContentResponseSchema.parse(await (await handleApi(new Request(`${origin}/api/content`), { PORTFOLIO_DB: db })).json());

  it('saves a draft without changing published content seen by an independent visitor', async () => {
    const content = structuredClone(defaults);
    content.profile.headline = 'A newly saved draft headline';
    const response = await save(content, 0, "Saved profile'; DELETE FROM rr_portfolio_content; --");
    expect(response.status).toBe(200);
    const envelope = envelopeSchema.parse(await response.json());
    expect(envelope.revision).toBe(1);
    expect(envelope.draft.profile.headline).toBe('A newly saved draft headline');
    expect(envelope.published.profile.headline).toBe('Software, with intention.');
    expect(envelope.activity[0].label).toBe("Saved profile'; DELETE FROM rr_portfolio_content; --");
    expect((await visitor()).content.profile.headline).toBe('Software, with intention.');
    expect((await visitor()).revision).toBe(1);
  });

  it('publishes all content atomically to independent visitors', async () => {
    const content = structuredClone(defaults);
    content.profile.name = 'Owner name updated in test';
    content.projects[0].slug = 'newly-published-project';
    content.socialLinks = [{ id: 'instagram-owner', platform: 'instagram', url: 'https://instagram.com/owner.test', enabled: true, order: 0 }];
    expect((await save(content)).status).toBe(200);
    const response = await mutate('/api/admin/publish', { expectedRevision: 1 });
    expect(response.status).toBe(200);
    expect(envelopeSchema.parse(await response.json()).revision).toBe(2);
    const published = await visitor();
    expect(published.content.profile.name).toBe('Owner name updated in test');
    expect(published.content.projects[0].slug).toBe('newly-published-project');
    expect(published.content.socialLinks[0].platform).toBe('instagram');
    expect(published.revision).toBe(2);
  });

  it('returns exactly one winner for concurrent writes against the same revision', async () => {
    await admin();
    const first = structuredClone(defaults);
    const second = structuredClone(defaults);
    first.profile.headline = 'First writer headline';
    second.profile.headline = 'Second writer headline';
    const responses = await Promise.all([save(first), save(second)]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const conflict = responses.find((response) => response.status === 409)!;
    expect(await conflict.json()).toMatchObject({ code: 'REVISION_CONFLICT' });
    const accepted = envelopeSchema.parse(await responses.find((response) => response.status === 200)!.json());
    const persisted = await admin();
    expect(persisted.draft.profile.headline).toBe(accepted.draft.profile.headline);
    expect(persisted.revision).toBe(1);
    expect(persisted.activity).toHaveLength(1);
  });

  it('rejects stale publish, revert, and reset actions without changing stored bytes', async () => {
    expect((await save(structuredClone(defaults))).status).toBe(200);
    const before = db.sqlite.prepare('SELECT document FROM rr_portfolio_content').get()?.document;
    for (const path of ['/api/admin/publish', '/api/admin/revert', '/api/admin/reset']) {
      const response = await mutate(path, { expectedRevision: 0 });
      expect(response.status).toBe(409);
      expect(db.sqlite.prepare('SELECT document FROM rr_portfolio_content').get()?.document).toBe(before);
    }
  });

  it('keeps published content intact while resetting or reverting the draft', async () => {
    const changed = structuredClone(defaults);
    changed.profile.headline = 'The published custom headline';
    await save(changed);
    await mutate('/api/admin/publish', { expectedRevision: 1 });
    const reset = await mutate('/api/admin/reset', { expectedRevision: 2 });
    expect(reset.status).toBe(200);
    const resetEnvelope = envelopeSchema.parse(await reset.json());
    expect(resetEnvelope.draft.profile.headline).toBe('Software, with intention.');
    expect(resetEnvelope.published.profile.headline).toBe('The published custom headline');
    const revert = await mutate('/api/admin/revert', { expectedRevision: 3 });
    expect(revert.status).toBe(200);
    expect(envelopeSchema.parse(await revert.json()).draft.profile.headline).toBe('The published custom headline');
    expect((await visitor()).content.profile.headline).toBe('The published custom headline');
  });

  it('rejects an invalid content payload without changing the valid document', async () => {
    await admin();
    const before = db.sqlite.prepare('SELECT document FROM rr_portfolio_content').get()?.document;
    const response = await mutate('/api/admin/content', { content: { ...defaults, unrecognized: true }, expectedRevision: 0, label: 'Bad import' }, 'PUT');
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'INVALID_REQUEST' });
    expect(db.sqlite.prepare('SELECT document FROM rr_portfolio_content').get()?.document).toBe(before);
  });

  it('refuses a valid draft whose uploaded image reference is absent from storage', async () => {
    await admin();
    const before = db.sqlite.prepare('SELECT document FROM rr_portfolio_content').get()?.document;
    const missing = structuredClone(defaults);
    missing.profile.image = 'image:10000000-0000-4000-8000-000000000001';
    const response = await save(missing);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'MEDIA_NOT_FOUND' });
    expect(db.sqlite.prepare('SELECT document FROM rr_portfolio_content').get()?.document).toBe(before);
    expect((await visitor()).content.profile.image).toBe('/assets/rahul-portrait.webp');
  });

  it('rejects a plain legacy backup with browser-only image identifiers', async () => {
    const missing = structuredClone(defaults);
    missing.projects[0].image = 'image:legacy-local-image-123';
    expect(contentSchema.safeParse(missing).success).toBe(true);
    const response = await save(missing);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'MEDIA_NOT_FOUND' });
    expect((await admin()).revision).toBe(0);
  });

  it('measures UTF-8 bytes and refuses an oversized publication while preserving its saved draft', async () => {
    const content = structuredClone(defaults);
    content.projects = Array.from({ length: 60 }, (_, index) => ({
      ...structuredClone(defaults.projects[0]), id: `large-${index}`, slug: `large-${index}`,
      description: '界'.repeat(600), overview: '界'.repeat(4000), problem: '界'.repeat(800),
      approach: '', implementation: '', order: index,
    }));
    expect(contentSchema.safeParse(content).success).toBe(true);
    const saved = await save(content);
    expect(saved.status).toBe(200);
    const before = db.sqlite.prepare('SELECT document FROM rr_portfolio_content').get()?.document;
    const response = await mutate('/api/admin/publish', { expectedRevision: 1 });
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ code: 'CONTENT_TOO_LARGE' });
    expect(db.sqlite.prepare('SELECT document FROM rr_portfolio_content').get()?.document).toBe(before);
    expect((await visitor()).content.projects).toHaveLength(3);
    expect((await admin()).draft.projects).toHaveLength(60);
  });

  it('does not leak a real database failure or partially change the document', async () => {
    await admin();
    const before = db.sqlite.prepare('SELECT document FROM rr_portfolio_content').get()?.document;
    db.sqlite.exec("CREATE TRIGGER fail_content_write BEFORE UPDATE ON rr_portfolio_content BEGIN SELECT RAISE(ABORT, 'private-database-detail'); END");
    const content = structuredClone(defaults);
    content.profile.headline = 'A save that must fail';
    const response = await save(content);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private-database-detail');
    expect(db.sqlite.prepare('SELECT document FROM rr_portfolio_content').get()?.document).toBe(before);
  });

  it('protects every content mutation with authentication, Origin, and CSRF', async () => {
    const requests = [
      { path: '/api/admin/content', method: 'PUT', body: { content: defaults, expectedRevision: 0, label: 'Save' } },
      ...['publish', 'revert', 'reset'].map((action) => ({ path: `/api/admin/${action}`, method: 'POST', body: { expectedRevision: 0 } })),
    ];
    for (const request of requests) {
      expect((await mutate(request.path, request.body, request.method, { Origin: origin, 'Content-Type': 'application/json' })).status).toBe(401);
      expect((await mutate(request.path, request.body, request.method, { ...headers, 'X-CSRF-Token': 'wrong' })).status).toBe(403);
      expect((await mutate(request.path, request.body, request.method, { ...headers, Origin: 'https://attacker.example' })).status).toBe(403);
    }
    expect((await admin()).revision).toBe(0);
  });

  it('retains publication across a closed SQLite connection and a new server environment', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'rr-portfolio-server-'));
    let persistent: SqliteD1 | null = null;
    try {
      const path = join(directory, 'portfolio.sqlite');
      persistent = new SqliteD1(path);
      let persistentEnv: ServerEnvironment = { PORTFOLIO_DB: persistent, ADMIN_PASSWORD_HASH: hash };
      const auth = await authorizedHeaders(persistentEnv);
      const content = structuredClone(defaults);
      content.profile.headline = 'Published and persisted after restart';
      const write = await handleApi(new Request(`${origin}/api/admin/content`, { method: 'PUT', headers: auth, body: JSON.stringify({ content, expectedRevision: 0, label: 'Persisted edit' }) }), persistentEnv);
      expect(write.status).toBe(200);
      const publish = await handleApi(new Request(`${origin}/api/admin/publish`, { method: 'POST', headers: auth, body: JSON.stringify({ expectedRevision: 1 }) }), persistentEnv);
      expect(publish.status).toBe(200);
      persistent.sqlite.close();
      persistent = new SqliteD1(path);
      persistentEnv = { PORTFOLIO_DB: persistent };
      const response = await handleApi(new Request(`${origin}/api/content`), persistentEnv);
      expect(publicContentResponseSchema.parse(await response.json()).content.profile.headline).toBe('Published and persisted after restart');
    } finally {
      persistent?.sqlite.close();
      const absolute = resolve(directory);
      if (dirname(absolute) !== resolve(tmpdir()) || !basename(absolute).startsWith('rr-portfolio-server-')) throw new Error('Unsafe temporary test directory');
      rmSync(absolute, { recursive: true, force: true });
    }
  });
});
