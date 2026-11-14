import { loginRequestSchema, type SessionInfo } from '../src/content/contracts';
import { database, HttpError, json, readJson } from './http';
import type { ServerEnvironment } from './types';

const cookieName = 'rr_portfolio_session';
const sessionDuration = 8 * 60 * 60 * 1000;
const attemptWindow = 15 * 60 * 1000;
const ipAttempts = 5;
const globalAttempts = 100;
const randomTokenPattern = /^[A-Za-z0-9_-]{43}$/;

interface Credential { salt: Uint8Array; hash: Uint8Array; configured: string }
export interface AuthSession {
  tokenHash: string;
  csrfToken: string;
  expiresAt: number;
}

function decode32(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) return null;
  try {
    const decoded = atob(value);
    if (decoded.length !== 32 || btoa(decoded) !== value) return null;
    return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  } catch { return null; }
}

function credential(env: ServerEnvironment): Credential | null {
  const configured = env.ADMIN_PASSWORD_HASH;
  if (typeof configured !== 'string' || configured.length > 200) return null;
  const parts = configured.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256' || parts[1] !== '100000') return null;
  const salt = decode32(parts[2]);
  const hash = decode32(parts[3]);
  return salt && hash ? { salt, hash, configured } : null;
}

export function authenticationConfigured(env: ServerEnvironment): boolean {
  return credential(env) !== null;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < a.byteLength; index++) difference |= a[index] ^ b[index];
  return difference === 0;
}

async function sha256(value: string): Promise<string> {
  const result = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(result), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function isLoopback(url: URL): boolean {
  if (['localhost', '[::1]', '::1'].includes(url.hostname)) return true;
  const parts = url.hostname.split('.');
  return parts.length === 4 && parts[0] === '127' && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

function transportAllowed(request: Request): boolean {
  const url = new URL(request.url);
  return url.protocol === 'https:' || (url.protocol === 'http:' && isLoopback(url));
}

export function checkOrigin(request: Request, env: ServerEnvironment): void {
  let allowed = new URL(request.url).origin;
  if (env.APP_ORIGIN !== undefined) {
    try {
      const configured = new URL(env.APP_ORIGIN);
      if (!['http:', 'https:'].includes(configured.protocol) || configured.username || configured.password || configured.origin !== env.APP_ORIGIN) {
        throw new Error('Invalid origin');
      }
      allowed = configured.origin;
    } catch {
      throw new HttpError(503, 'AUTH_NOT_CONFIGURED', 'Administrator authentication is not configured.');
    }
  }
  // Only the request URL and an explicit server-side origin are authorities.
  // Forwarded headers and a browser-supplied Host never expand this allowlist.
  if (request.headers.get('Origin') !== allowed) {
    throw new HttpError(403, 'INVALID_ORIGIN', 'This request origin is not allowed.');
  }
}

function sessionCookie(request: Request, token: string, expiry: number): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  const maxAge = token ? sessionDuration / 1000 : 0;
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}; Expires=${new Date(expiry).toUTCString()}${secure}`;
}

function requestToken(request: Request): string | null {
  const matches = (request.headers.get('Cookie') ?? '').split(';').map((part) => part.trim())
    .filter((part) => part.slice(0, part.indexOf('=')) === cookieName);
  if (matches.length !== 1) return null;
  const token = matches[0].slice(matches[0].indexOf('=') + 1);
  return randomTokenPattern.test(token) ? token : null;
}

export async function readSession(request: Request, env: ServerEnvironment): Promise<AuthSession | null> {
  const configured = credential(env);
  const token = requestToken(request);
  if (!configured || !token || !env.PORTFOLIO_DB || !transportAllowed(request)) return null;
  try {
    const tokenHash = await sha256(token);
    const row = await env.PORTFOLIO_DB.prepare('SELECT csrf_token, expires_at, credential_fingerprint FROM rr_portfolio_sessions WHERE token_hash = ?')
      .bind(tokenHash).first<{ csrf_token: string; expires_at: number; credential_fingerprint: string }>();
    if (!row) return null;
    const fingerprint = await sha256(configured.configured);
    if (!Number.isSafeInteger(row.expires_at) || row.expires_at <= Date.now() ||
      !randomTokenPattern.test(row.csrf_token) ||
      !constantTimeEqual(new TextEncoder().encode(row.credential_fingerprint), new TextEncoder().encode(fingerprint))) {
      await env.PORTFOLIO_DB.prepare('DELETE FROM rr_portfolio_sessions WHERE token_hash = ?').bind(tokenHash).run();
      return null;
    }
    return { tokenHash, csrfToken: row.csrf_token, expiresAt: row.expires_at };
  } catch {
    // Anonymous session reads reveal neither configuration nor database errors.
    return null;
  }
}

export function sessionInfo(request: Request, session: AuthSession | null): SessionInfo {
  if (!session) return { authenticated: false };
  return {
    authenticated: true,
    csrfToken: session.csrfToken,
    expiresAt: new Date(session.expiresAt).toISOString(),
    environment: isLoopback(new URL(request.url)) ? 'local' : 'production',
  };
}

export async function requireSession(request: Request, env: ServerEnvironment): Promise<AuthSession> {
  const session = await readSession(request, env);
  if (!session) throw new HttpError(401, 'UNAUTHORIZED', 'Sign in to manage the portfolio.');
  return session;
}

export async function authorizeMutation(request: Request, env: ServerEnvironment): Promise<AuthSession> {
  const session = await requireSession(request, env);
  checkOrigin(request, env);
  const supplied = request.headers.get('X-CSRF-Token') ?? '';
  if (!randomTokenPattern.test(supplied) || !constantTimeEqual(new TextEncoder().encode(supplied), new TextEncoder().encode(session.csrfToken))) {
    throw new HttpError(403, 'INVALID_CSRF', 'Refresh your administrator session and try again.');
  }
  return session;
}

async function reserveAttempt(request: Request, env: ServerEnvironment): Promise<{ ipKey: string; now: number }> {
  const db = database(env);
  const now = Date.now();
  const global = await db.prepare('SELECT window_start, attempts FROM rr_portfolio_login_buckets WHERE bucket_key = ?')
    .bind('global').first<{ window_start: number; attempts: number }>();
  if (global && global.window_start > now - attemptWindow && global.attempts >= globalAttempts) {
    // Do not create arbitrary IP rows after the global ceiling has closed
    // sign-in. The transactional reservation below still rechecks the limit.
    throw new HttpError(429, 'RATE_LIMITED', 'Too many sign-in attempts. Try again in fifteen minutes.');
  }
  // Cloudflare supplies CF-Connecting-IP. Missing IPs share a conservative
  // bucket, and the global bucket also bounds distributed guesses.
  const connectingIp = request.headers.get('CF-Connecting-IP');
  const ipKey = `ip:${await sha256(connectingIp && connectingIp.length <= 64 ? connectingIp : 'unknown')}`;
  const results = await db.batch([
    db.prepare('DELETE FROM rr_portfolio_login_buckets WHERE window_start <= ?').bind(now - attemptWindow),
    db.prepare('INSERT INTO rr_portfolio_login_buckets (bucket_key, window_start, attempts) VALUES (?, ?, 0) ON CONFLICT(bucket_key) DO NOTHING').bind('global', now),
    db.prepare('INSERT INTO rr_portfolio_login_buckets (bucket_key, window_start, attempts) VALUES (?, ?, 0) ON CONFLICT(bucket_key) DO NOTHING').bind(ipKey, now),
    // Materialize quota eligibility before updating either row. One SQL
    // statement reserves both quotas or neither, inside the D1 transaction.
    db.prepare(`WITH quota AS MATERIALIZED (
      SELECT COUNT(*) AS available FROM rr_portfolio_login_buckets
      WHERE (bucket_key = ? AND attempts < ?) OR (bucket_key = ? AND attempts < ?)
    ) UPDATE rr_portfolio_login_buckets SET attempts = attempts + 1
      WHERE bucket_key IN (?, ?) AND (SELECT available FROM quota) = 2`)
      .bind(ipKey, ipAttempts, 'global', globalAttempts, ipKey, 'global'),
  ]);
  if (results[3]?.meta.changes !== 2) throw new HttpError(429, 'RATE_LIMITED', 'Too many sign-in attempts. Try again in fifteen minutes.');
  return { ipKey, now };
}

export async function login(request: Request, env: ServerEnvironment): Promise<Response> {
  if (!transportAllowed(request)) throw new HttpError(403, 'INSECURE_TRANSPORT', 'Administrator sign-in requires HTTPS.');
  checkOrigin(request, env);
  const configured = credential(env);
  if (!configured) throw new HttpError(503, 'AUTH_NOT_CONFIGURED', 'Administrator authentication is not configured.');
  const db = database(env);
  const parsed = loginRequestSchema.safeParse(await readJson(request, 4096));
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST', 'Enter a password between 16 and 256 characters.');
  const reservation = await reserveAttempt(request, env);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(parsed.data.password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: configured.salt as Uint8Array<ArrayBuffer>, iterations: 100_000 }, key, 256);
  if (!constantTimeEqual(new Uint8Array(derived), configured.hash)) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'The password is incorrect.');
  }
  const token = randomToken();
  const session: AuthSession = { tokenHash: await sha256(token), csrfToken: randomToken(), expiresAt: Date.now() + sessionDuration };
  const fingerprint = await sha256(configured.configured);
  await db.batch([
    db.prepare('DELETE FROM rr_portfolio_sessions WHERE expires_at <= ? OR credential_fingerprint <> ?').bind(Date.now(), fingerprint),
    db.prepare('INSERT INTO rr_portfolio_sessions (token_hash, csrf_token, credential_fingerprint, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(session.tokenHash, session.csrfToken, fingerprint, session.expiresAt, Date.now()),
  ]);
  // Successful verification does not spend the failed-attempt quotas. Do not
  // decrement a newer window that may have started while verification ran.
  await db.prepare('UPDATE rr_portfolio_login_buckets SET attempts = attempts - 1 WHERE bucket_key IN (?, ?) AND attempts > 0 AND window_start > ? AND window_start <= ?')
    .bind(reservation.ipKey, 'global', reservation.now - attemptWindow, reservation.now).run();
  return json(sessionInfo(request, session), 200, { 'Set-Cookie': sessionCookie(request, token, session.expiresAt) });
}

export async function logout(request: Request, env: ServerEnvironment): Promise<Response> {
  const session = await authorizeMutation(request, env);
  await database(env).prepare('DELETE FROM rr_portfolio_sessions WHERE token_hash = ?').bind(session.tokenHash).run();
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(request, '', 0) });
}
