import { apiConfig } from '../config';
import { sessionInfoSchema, type SessionInfo } from './contracts';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string) {
    super(message);
    this.name = 'ApiError';
  }
}

let csrfToken = '';

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const target = `${apiConfig.baseUrl}${path}`;
  if (new URL(target, window.location.origin).origin !== window.location.origin) {
    throw new ApiError('The admin and portfolio API must use the same website origin.', 0, 'INVALID_API_ORIGIN');
  }
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (typeof init.body === 'string' && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(init.method ?? 'GET') && csrfToken) headers.set('X-CSRF-Token', csrfToken);
  let response: Response;
  try {
    response = await fetch(target, {
      ...init, headers, credentials: 'same-origin',
      cache: init.cache ?? 'no-store',
      signal: init.signal ?? AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError('Could not reach the portfolio server. Check your connection and try again.', 0, 'NETWORK_ERROR');
  }
  if (response.status === 204) return undefined as T;
  if (!response.headers.get('Content-Type')?.includes('application/json')) {
    throw new ApiError('The portfolio API is unavailable. Start the Cloudflare development server or finish the Cloudflare server configuration.', response.status, 'API_UNAVAILABLE');
  }
  let data: unknown;
  try { data = await response.json(); } catch {
    throw new ApiError('The server returned an unreadable response. Try again.', response.status, 'INVALID_RESPONSE');
  }
  if (!response.ok) {
    if (response.status === 401) csrfToken = '';
    const error = data as { error?: unknown; code?: unknown };
    throw new ApiError(
      typeof error?.error === 'string' ? error.error : 'This request could not be completed. Try again.',
      response.status,
      typeof error?.code === 'string' ? error.code : 'REQUEST_FAILED',
    );
  }
  return data as T;
}

function acceptSession(value: unknown): SessionInfo {
  const parsed = sessionInfoSchema.safeParse(value);
  if (!parsed.success || (parsed.data.authenticated && !parsed.data.csrfToken)) {
    throw new ApiError('The server returned an invalid sign-in session. Try signing in again.', 502, 'INVALID_SESSION');
  }
  csrfToken = parsed.data.authenticated ? parsed.data.csrfToken! : '';
  return parsed.data;
}

export const sessionApi = {
  async read(): Promise<SessionInfo> {
    return acceptSession(await apiRequest('/api/auth/session'));
  },
  async login(password: string): Promise<SessionInfo> {
    return acceptSession(await apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) }));
  },
  async logout(): Promise<void> {
    await apiRequest('/api/auth/logout', { method: 'POST', body: '{}' });
    csrfToken = '';
  },
};
