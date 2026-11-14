// @vitest-environment node
import { readFileSync } from 'node:fs';
import { URL as NodeURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handleApi } from '../api';
import type { ServerEnvironment } from '../types';
import { defaults } from '../../src/content/defaults';
import { sessionInfoSchema } from '../../src/content/contracts';
import { testHash, testPassword, pngBytes } from './fixtures';
import { SqliteD1 } from './sqlite';

const origin = 'https://portfolio.example';
const hash = testHash();
const jpeg = new Uint8Array(readFileSync(new NodeURL('./fixtures/jpeg-64.jpg', import.meta.url)));
const webp = new Uint8Array(readFileSync(new NodeURL('./fixtures/webp-64.webp', import.meta.url)));

describe('validated, access-controlled raster media', () => {
  let db: SqliteD1;
  let env: ServerEnvironment;
  let auth: Record<string, string>;

  beforeEach(async () => {
    db = new SqliteD1();
    env = { PORTFOLIO_DB: db, ADMIN_PASSWORD_HASH: hash };
    const response = await handleApi(new Request(`${origin}/api/auth/login`, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: testPassword }),
    }), env);
    expect(response.status).toBe(200);
    const session = sessionInfoSchema.parse(await response.json());
    auth = { Cookie: response.headers.get('Set-Cookie')!.split(';')[0], Origin: origin, 'X-CSRF-Token': session.csrfToken! };
  });
  afterEach(() => { db.sqlite.close(); });

  const upload = (bytes: Uint8Array = pngBytes(), mime = 'image/png', headers: HeadersInit = auth) => handleApi(new Request(`${origin}/api/admin/media`, {
    method: 'POST', headers: { ...headers, 'Content-Type': mime }, body: bytes.slice().buffer,
  }), env);
  const preview = (id: string, authenticated = false) => handleApi(new Request(`${origin}/api/media/${id.slice(6)}`, {
    headers: authenticated ? { Cookie: auth.Cookie } : {},
  }), env);
  const remove = (id: string, headers: HeadersInit = auth) => handleApi(new Request(`${origin}/api/admin/media/${id.slice(6)}`, { method: 'DELETE', headers }), env);
  const save = (content: typeof defaults, revision: number) => handleApi(new Request(`${origin}/api/admin/content`, {
    method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ content, expectedRevision: revision, label: 'Saved media' }),
  }), env);
  const publish = (revision: number) => handleApi(new Request(`${origin}/api/admin/publish`, {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: revision }),
  }), env);
  async function uploaded(bytes: Uint8Array = pngBytes(), mime = 'image/png'): Promise<string> {
    const response = await upload(bytes, mime);
    expect(response.status).toBe(201);
    const body = await response.json() as { id: string };
    expect(body.id).toMatch(/^image:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    return body.id;
  }

  it('stores genuine PNG bytes and makes an unreferenced upload private', async () => {
    const bytes = pngBytes();
    const id = await uploaded(bytes);
    const stored = db.sqlite.prepare('SELECT mime, width, height, bytes FROM rr_portfolio_media WHERE id = ?').get(id.slice(6));
    expect(stored?.mime).toBe('image/png');
    expect(stored?.width).toBe(64);
    expect(stored?.height).toBe(64);
    expect(Buffer.from(stored?.bytes as Uint8Array).equals(Buffer.from(bytes))).toBe(true);
    expect((await preview(id)).status).toBe(404);
    const privateResponse = await preview(id, true);
    expect(privateResponse.status).toBe(200);
    expect(privateResponse.headers.get('Cache-Control')).toBe('no-store');
    expect(privateResponse.headers.get('Vary')).toContain('Cookie');
    expect(Buffer.from(await privateResponse.arrayBuffer()).equals(Buffer.from(bytes))).toBe(true);
  });

  it.each([
    { mime: 'image/jpeg', bytes: jpeg },
    { mime: 'image/webp', bytes: webp },
  ])('accepts a genuine 64-pixel $mime image and preserves its MIME', async ({ mime, bytes }) => {
    const id = await uploaded(bytes, mime);
    const response = await preview(id, true);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(mime);
  });

  it('makes a profile image public only after its draft is published', async () => {
    const id = await uploaded();
    const content = structuredClone(defaults);
    content.profile.image = id;
    expect((await save(content, 0)).status).toBe(200);
    expect((await preview(id)).status).toBe(404);
    expect((await preview(id, true)).status).toBe(200);
    expect((await publish(1)).status).toBe(200);
    const response = await preview(id);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('never exposes media referenced only by a hidden project in the published document', async () => {
    const id = await uploaded();
    const content = structuredClone(defaults);
    content.projects[0].status = 'draft';
    content.projects[0].image = id;
    expect((await save(content, 0)).status).toBe(200);
    expect((await publish(1)).status).toBe(200);
    expect((await preview(id)).status).toBe(404);
    expect((await preview(id, true)).status).toBe(200);
    const publicResponse = await handleApi(new Request(`${origin}/api/content`), env);
    expect(await publicResponse.text()).not.toContain(id);
  });

  it('prevents deletion while either the draft or published document references a blob', async () => {
    const id = await uploaded();
    const content = structuredClone(defaults);
    content.profile.image = id;
    expect((await save(content, 0)).status).toBe(200);
    const draftReferenced = await remove(id);
    expect(draftReferenced.status).toBe(409);
    expect(await draftReferenced.json()).toMatchObject({ code: 'MEDIA_REFERENCED' });
    expect((await publish(1)).status).toBe(200);
    content.profile.image = '';
    expect((await save(content, 2)).status).toBe(200);
    expect((await remove(id)).status).toBe(409);
    expect((await publish(3)).status).toBe(200);
    const removed = await remove(id);
    expect(removed.status).toBe(200);
    expect(await removed.json()).toEqual({ ok: true });
    expect((await preview(id, true)).status).toBe(404);
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM rr_portfolio_media').get()?.count).toBe(0);
  });

  it('allows cleanup of a newly staged, unreferenced upload', async () => {
    const id = await uploaded();
    expect((await remove(id)).status).toBe(200);
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM rr_portfolio_media').get()?.count).toBe(0);
  });

  it('protects upload and deletion with cookie authentication, Origin, and CSRF', async () => {
    expect((await upload(pngBytes(), 'image/png', { Origin: origin })).status).toBe(401);
    expect((await upload(pngBytes(), 'image/png', { ...auth, 'X-CSRF-Token': 'wrong' })).status).toBe(403);
    expect((await upload(pngBytes(), 'image/png', { ...auth, Origin: 'https://attacker.example' })).status).toBe(403);
    const id = await uploaded();
    expect((await remove(id, { Origin: origin })).status).toBe(401);
    expect((await remove(id, { ...auth, 'X-CSRF-Token': 'wrong' })).status).toBe(403);
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM rr_portfolio_media').get()?.count).toBe(1);
  });

  it('refuses an oversized body even when Content-Length understates its actual size', async () => {
    const response = await upload(new Uint8Array(1_000_001), 'image/png', { ...auth, 'Content-Length': '1' });
    expect(response.status).toBe(413);
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM rr_portfolio_media').get()?.count).toBe(0);
  });

  it.each(['image/svg+xml', 'text/html', 'image/gif', 'application/octet-stream'])('refuses active or unsupported $0 content', async (mime) => {
    const response = await upload(new TextEncoder().encode('<svg><script>alert(1)</script></svg>'), mime);
    expect(response.status).toBe(415);
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM rr_portfolio_media').get()?.count).toBe(0);
  });

  it('requires the declared MIME to match the actual image signature', async () => {
    const response = await upload(jpeg, 'image/png');
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'INVALID_MEDIA' });
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM rr_portfolio_media').get()?.count).toBe(0);
  });

  it.each([
    { width: 63, height: 64 }, { width: 64, height: 5001 }, { width: 4001, height: 4001 },
  ])('refuses dimensions $width × $height outside the image limits', async ({ width, height }) => {
    const response = await upload(pngBytes(width, height));
    expect(response.status).toBe(400);
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM rr_portfolio_media').get()?.count).toBe(0);
  });

  it('checks PNG chunk checksums and a terminal IEND instead of trusting its signature', async () => {
    const corrupt = pngBytes();
    corrupt[16] ^= 1;
    for (const bytes of [corrupt, pngBytes().slice(0, -12)]) {
      expect((await upload(bytes)).status).toBe(400);
    }
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM rr_portfolio_media').get()?.count).toBe(0);
  });

  it('rejects PNG data with valid checksums but corrupt compressed scanlines', async () => {
    for (const bytes of [
      pngBytes(64, 64, new Uint8Array(10)),
      pngBytes(64, 64, undefined, new Uint8Array([1, 2, 3, 4, 5])),
      pngBytes(64, 64, Uint8Array.from({ length: (64 * 3 + 1) * 64 }, (_, index) => index === 0 ? 5 : 0)),
    ]) {
      expect((await upload(bytes)).status).toBe(400);
    }
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM rr_portfolio_media').get()?.count).toBe(0);
  });

  it('rejects truncated JPEG and forged SOI/EOI-only data', async () => {
    for (const bytes of [jpeg.slice(0, -2), new Uint8Array([255, 216, 255, 217])]) {
      expect((await upload(bytes, 'image/jpeg')).status).toBe(400);
    }
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM rr_portfolio_media').get()?.count).toBe(0);
  });

  it('checks JPEG frame dimensions before storing its compressed body', async () => {
    const bytes = jpeg.slice();
    const offset = Buffer.from(bytes).indexOf(Buffer.from([255, 192]));
    expect(offset).toBeGreaterThan(0);
    bytes[offset + 7] = 0;
    bytes[offset + 8] = 63;
    expect((await upload(bytes, 'image/jpeg')).status).toBe(400);
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM rr_portfolio_media').get()?.count).toBe(0);
  });

  it('rejects a WebP whose RIFF size is wrong or compressed payload is absent', async () => {
    const wrongSize = webp.slice();
    wrongSize[4] ^= 1;
    expect((await upload(wrongSize, 'image/webp')).status).toBe(400);
    const headerOnly = Buffer.alloc(30);
    headerOnly.write('RIFF', 0);
    headerOnly.writeUInt32LE(22, 4);
    headerOnly.write('WEBPVP8 ', 8);
    headerOnly.writeUInt32LE(10, 16);
    headerOnly.set([0x10, 0, 0, 0x9d, 0x01, 0x2a, 64, 0, 64, 0], 20);
    expect((await upload(new Uint8Array(headerOnly), 'image/webp')).status).toBe(400);
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM rr_portfolio_media').get()?.count).toBe(0);
  });
});
