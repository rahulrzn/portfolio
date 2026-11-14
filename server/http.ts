import type { PortfolioDatabase, ServerEnvironment } from './types';

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export const privateHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
};

export const publicCache = 'no-cache, max-age=0, must-revalidate';

export function json(value: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(privateHeaders);
  new Headers(headers).forEach((value, name) => responseHeaders.set(name, value));
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(value), { status, headers: responseHeaders });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) return json({ error: error.message, code: error.code }, error.status);
  // Database errors can include SQL, bound content and platform information.
  // Return a stable error without logging or serializing the original error.
  return json({ error: 'Portfolio storage is temporarily unavailable. Please try again.', code: 'STORAGE_UNAVAILABLE' }, 503);
}

export function database(env: ServerEnvironment): PortfolioDatabase {
  if (!env.PORTFOLIO_DB) throw new HttpError(503, 'NOT_CONFIGURED', 'Portfolio storage is not configured.');
  return env.PORTFOLIO_DB;
}

export function revisionHeaders(revision: number): HeadersInit {
  return { 'Cache-Control': publicCache, ETag: `"portfolio-${revision}"` };
}

export function matchesRevision(request: Request, revision: number): boolean {
  const etag = `"portfolio-${revision}"`;
  return (request.headers.get('If-None-Match') ?? '').split(',')
    .some((value) => value.trim() === '*' || value.trim().replace(/^W\//, '') === etag);
}

export async function readBytes(request: Request, limit: number): Promise<Uint8Array> {
  const announced = request.headers.get('Content-Length');
  if (announced !== null && (!/^\d+$/.test(announced) || !Number.isSafeInteger(Number(announced)))) {
    throw new HttpError(400, 'INVALID_REQUEST', 'Invalid request size.');
  }
  if (announced !== null && Number(announced) > limit) {
    throw new HttpError(413, 'TOO_LARGE', 'The request is too large.');
  }
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new HttpError(413, 'TOO_LARGE', 'The request is too large.');
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export async function readJson(request: Request, limit = 1_799_900): Promise<unknown> {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new HttpError(415, 'UNSUPPORTED_TYPE', 'Send JSON with Content-Type application/json.');
  }
  const bytes = await readBytes(request, limit);
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes));
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'The request must contain valid JSON.');
  }
}
