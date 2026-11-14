// @vitest-environment node
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleApi } from '../api';
import type { ServerEnvironment } from '../types';
import { SqliteD1 } from './sqlite';
import { testHash, testPassword } from './fixtures';
import { sessionInfoSchema } from '../../src/content/contracts';
import { envelopeSchema } from '../../src/content/schema';

const origin = 'https://portfolio.example';
const hash = testHash();

describe('server-side owner authentication', () => {
  let db: SqliteD1;
  let env: ServerEnvironment;

  beforeEach(() => { db = new SqliteD1(); env = { PORTFOLIO_DB: db, ADMIN_PASSWORD_HASH: hash }; });
  afterEach(() => { vi.useRealTimers(); db.sqlite.close(); });

  const login = (password = testPassword, headers: HeadersInit = {}, url = `${origin}/api/auth/login`) =>
    handleApi(new Request(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...headers },
      body: JSON.stringify({ password }),
    }), env);

  async function session() {
    const response = await login();
    expect(response.status).toBe(200);
    const body = sessionInfoSchema.parse(await response.json());
    return { cookie: response.headers.get('Set-Cookie')!.split(';')[0], body: { ...body, csrfToken: body.csrfToken!, expiresAt: body.expiresAt! } };
  }

  it('derives the configured PBKDF2 credential and stores only a digest of a random session token', async () => {
    const now = Date.now();
    const response = await login();
    expect(response.status).toBe(200);
    const body = sessionInfoSchema.parse(await response.json());
    expect(body.authenticated).toBe(true);
    expect(body.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(body.environment).toBe('production');
    expect(Date.parse(body.expiresAt!)).toBeGreaterThanOrEqual(now + 8 * 60 * 60 * 1000);
    expect(Date.parse(body.expiresAt!)).toBeLessThan(Date.now() + 8 * 60 * 60 * 1000 + 1000);
    const cookie = response.headers.get('Set-Cookie')!;
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Secure');
    const token = cookie.split(';')[0].split('=')[1];
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const stored = db.sqlite.prepare('SELECT token_hash, csrf_token, expires_at FROM rr_portfolio_sessions').get();
    expect(stored?.token_hash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(stored?.csrf_token).toBe(body.csrfToken);
    expect(JSON.stringify(stored)).not.toContain(token);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('reads an authenticated session and admin document only through its session cookie', async () => {
    const active = await session();
    const response = await handleApi(new Request(`${origin}/api/auth/session`, { headers: { Cookie: active.cookie } }), env);
    expect(await response.json()).toEqual(active.body);
    const admin = await handleApi(new Request(`${origin}/api/admin/content`, { headers: { Cookie: active.cookie } }), env);
    expect(admin.status).toBe(200);
    expect(envelopeSchema.parse(await admin.json()).version).toBe(1);
    const headerOnly = await handleApi(new Request(`${origin}/api/admin/content`, { headers: { Authorization: `Bearer ${active.cookie.split('=')[1]}` } }), env);
    expect(headerOnly.status).toBe(401);
  });

  it('fails closed when the password secret is missing or malformed', async () => {
    for (const configured of [undefined, 'development-password', `pbkdf2-sha256$100000$${Buffer.alloc(16).toString('base64')}$${Buffer.alloc(32).toString('base64')}`, hash.replace('$100000$', '$1$')]) {
      env.ADMIN_PASSWORD_HASH = configured;
      const response = await login();
      expect(response.status).toBe(503);
      expect(response.headers.get('Set-Cookie')).toBeNull();
      expect(await response.json()).toMatchObject({ code: 'AUTH_NOT_CONFIGURED' });
      const read = await handleApi(new Request(`${origin}/api/auth/session`), env);
      expect(await read.json()).toEqual({ authenticated: false });
    }
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM rr_portfolio_sessions').get()?.count).toBe(0);
  });

  it('rejects unknown JSON fields and out-of-bounds passwords before making sessions', async () => {
    for (const password of ['short', 'x'.repeat(257)]) {
      const response = await login(password);
      expect(response.status).toBe(400);
    }
    const response = await handleApi(new Request(`${origin}/api/auth/login`, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: testPassword, administrator: true }),
    }), env);
    expect(response.status).toBe(400);
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM rr_portfolio_sessions').get()?.count).toBe(0);
  });

  it('requires the exact allowed login Origin and ignores forwarded host headers', async () => {
    for (const incoming of ['https://attacker.example', `${origin}/`, 'null', '']) {
      const response = await login(testPassword, {
        Origin: incoming, 'X-Forwarded-Host': 'portfolio.example', 'X-Forwarded-Proto': 'https',
      });
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ code: 'INVALID_ORIGIN' });
    }
    const response = await handleApi(new Request(`${origin}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: testPassword }),
    }), env);
    expect(response.status).toBe(403);
  });

  it('refuses plain HTTP login on a non-loopback hostname', async () => {
    const response = await login(testPassword, { Origin: 'http://portfolio.example' }, 'http://portfolio.example/api/auth/login');
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: 'INSECURE_TRANSPORT' });
  });

  it('allows an explicitly configured loopback development frontend Origin', async () => {
    env.APP_ORIGIN = 'http://127.0.0.1:5173';
    const response = await login(testPassword, { Origin: env.APP_ORIGIN }, 'http://127.0.0.1:8788/api/auth/login');
    expect(response.status).toBe(200);
    expect(response.headers.get('Set-Cookie')).not.toContain('Secure');
    expect(sessionInfoSchema.parse(await response.json()).environment).toBe('local');
    const rejected = await login(testPassword, { Origin: 'http://localhost:5173' }, 'http://127.0.0.1:8788/api/auth/login');
    expect(rejected.status).toBe(403);
  });

  it('invalidates existing sessions immediately when the owner credential rotates', async () => {
    const active = await session();
    env.ADMIN_PASSWORD_HASH = testHash('replacement-owner-password-for-tests');
    const response = await handleApi(new Request(`${origin}/api/auth/session`, { headers: { Cookie: active.cookie } }), env);
    expect(await response.json()).toEqual({ authenticated: false });
    const admin = await handleApi(new Request(`${origin}/api/admin/content`, { headers: { Cookie: active.cookie } }), env);
    expect(admin.status).toBe(401);
  });

  it('expires a session after eight hours', async () => {
    const active = await session();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.parse(active.body.expiresAt) + 1);
    const response = await handleApi(new Request(`${origin}/api/auth/session`, { headers: { Cookie: active.cookie } }), env);
    expect(await response.json()).toEqual({ authenticated: false });
  });

  it('rejects ambiguous duplicate session cookies', async () => {
    const active = await session();
    const response = await handleApi(new Request(`${origin}/api/auth/session`, {
      headers: { Cookie: `${active.cookie}; ${active.cookie}` },
    }), env);
    expect(await response.json()).toEqual({ authenticated: false });
  });

  it('requires both the session CSRF token and exact Origin for logout', async () => {
    const active = await session();
    const invalidHeaders: Record<string, string>[] = [
      { Cookie: active.cookie, Origin: origin },
      { Cookie: active.cookie, Origin: origin, 'X-CSRF-Token': 'different-token' },
      { Cookie: active.cookie, Origin: 'https://attacker.example', 'X-CSRF-Token': active.body.csrfToken },
    ];
    for (const headers of invalidHeaders) {
      const response = await handleApi(new Request(`${origin}/api/auth/logout`, { method: 'POST', headers }), env);
      expect(response.status).toBe(403);
    }
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM rr_portfolio_sessions').get()?.count).toBe(1);
  });

  it('revokes the database session and expires its cookie on authorized logout', async () => {
    const active = await session();
    const response = await handleApi(new Request(`${origin}/api/auth/logout`, {
      method: 'POST', headers: { Cookie: active.cookie, Origin: origin, 'X-CSRF-Token': active.body.csrfToken },
    }), env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
    expect(response.headers.get('Set-Cookie')).toContain('HttpOnly');
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM rr_portfolio_sessions').get()?.count).toBe(0);
  });

  it('persists five failed attempts per IP and refuses the sixth attempt', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      expect((await login('incorrect-password-for-tests', { 'CF-Connecting-IP': '192.0.2.17' })).status).toBe(401);
    }
    const response = await login(testPassword, { 'CF-Connecting-IP': '192.0.2.17' });
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ code: 'RATE_LIMITED' });
    const global = db.sqlite.prepare("SELECT attempts FROM rr_portfolio_login_buckets WHERE bucket_key = 'global'").get();
    expect(global?.attempts).toBe(5);
    expect((await login(testPassword, { 'CF-Connecting-IP': '192.0.2.18' })).status).toBe(200);
  });

  it('atomically prevents concurrent guesses from exceeding the IP quota', async () => {
    const responses = await Promise.all(Array.from({ length: 6 }, () => login('incorrect-password-for-tests', { 'CF-Connecting-IP': '192.0.2.24' })));
    expect(responses.map((response) => response.status).sort()).toEqual([401, 401, 401, 401, 401, 429]);
    expect(db.sqlite.prepare("SELECT attempts FROM rr_portfolio_login_buckets WHERE bucket_key = 'global'").get()?.attempts).toBe(5);
  });

  it('applies a persistent global quota even when the requester changes IP', async () => {
    db.sqlite.prepare('INSERT INTO rr_portfolio_login_buckets (bucket_key, window_start, attempts) VALUES (?, ?, ?)')
      .run('global', Date.now(), 100);
    const response = await login(testPassword, { 'CF-Connecting-IP': '192.0.2.40' });
    expect(response.status).toBe(429);
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM rr_portfolio_sessions').get()?.count).toBe(0);
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM rr_portfolio_login_buckets').get()?.count).toBe(1);
  });

  it('reports readiness without returning secrets or credential metadata', async () => {
    const ready = await handleApi(new Request(`${origin}/api/health`), env);
    expect(ready.status).toBe(200);
    expect(await ready.json()).toEqual({ ready: true });
    env.ADMIN_PASSWORD_HASH = undefined;
    const unavailable = await handleApi(new Request(`${origin}/api/health`), env);
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({ ready: false });
  });

  it('reopens a failed-attempt bucket after fifteen minutes', async () => {
    for (let attempt = 0; attempt < 5; attempt++) await login('incorrect-password-for-tests');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 15 * 60 * 1000 + 1);
    expect((await login()).status).toBe(200);
  });
});
