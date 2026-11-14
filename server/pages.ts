import type { PagesContext } from './types';
import { readEnvelope } from './content';
import { errorResponse, HttpError, publicCache } from './http';
import { escapeMarkup, metadataFor, publicPageRoutes, sitemapResponse, type PageMetadata } from './seo';

const appSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
const scriptPolicy = "default-src 'self'; script-src 'self'";
const restPolicy = "; style-src 'self' 'unsafe-inline'; img-src 'self' https: blob: data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";

function headersFor(response: Response, cache: string, robots: string): Headers {
  const headers = new Headers(response.headers);
  Object.entries(appSecurityHeaders).forEach(([key, value]) => headers.set(key, value));
  headers.set('Cache-Control', cache);
  headers.set('X-Robots-Tag', robots);
  headers.delete('ETag');
  headers.delete('Last-Modified');
  headers.delete('Content-Length');
  headers.delete('Content-Encoding');
  return headers;
}

async function structuredJson(meta: PageMetadata): Promise<{ json: string; hash: string }> {
  if (!meta.structuredData) return { json: '', hash: '' };
  const json = JSON.stringify(meta.structuredData).replace(/[<>&\u2028\u2029]/g, (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json));
  return { json, hash: btoa(String.fromCharCode(...new Uint8Array(digest))) };
}

async function rewritePublicHtml(response: Response, request: Request, meta: PageMetadata): Promise<Response> {
  const structured = await structuredJson(meta);
  const headers = headersFor(response, publicCache, meta.robots);
  headers.set('Content-Security-Policy', `${scriptPolicy}${structured.hash ? ` 'sha256-${structured.hash}'` : ''}${restPolicy}`);
  const extras = [
    `<meta name="robots" content="${meta.robots}" />`,
    `<meta name="twitter:title" content="${escapeMarkup(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeMarkup(meta.description)}" />`,
    ...(meta.canonical ? [
      `<link rel="canonical" href="${escapeMarkup(meta.canonical)}" />`,
      `<meta property="og:url" content="${escapeMarkup(meta.canonical)}" />`,
    ] : []),
    ...(structured.json ? [`<script type="application/ld+json">${structured.json}</script>`] : []),
  ].join('\n');
  const rewriter = new HTMLRewriter().on('head title', { element: (element) => { element.setInnerContent(meta.title); } });
  for (const [selector, value] of [
    ['head meta[name="description"]', meta.description],
    ['head meta[property="og:title"]', meta.title],
    ['head meta[property="og:description"]', meta.description],
    ['head meta[property="og:image"]', meta.image],
  ]) rewriter.on(selector, { element: (element) => { element.setAttribute('content', value); } });
  for (const selector of [
    'head link[rel="canonical"]', 'head meta[property="og:url"]', 'head meta[name="robots"]',
    'head meta[name="twitter:title"]', 'head meta[name="twitter:description"]', 'head script[type="application/ld+json"]',
  ]) rewriter.on(selector, { element: (element) => { element.remove(); } });
  rewriter.on('head', { element: (element) => { element.append(extras, { html: true }); } });
  const html = new Response(request.method === 'HEAD' ? null : response.body, { status: meta.notFound ? 404 : 200, headers });
  return request.method === 'HEAD' ? html : rewriter.transform(html);
}

function rewriteAdminHtml(response: Response, request: Request): Response {
  const headers = headersFor(response, 'no-store', 'noindex, nofollow');
  headers.set('Content-Security-Policy', scriptPolicy + restPolicy);
  const privateResponse = new Response(request.method === 'HEAD' ? null : response.body, { status: response.status, headers });
  if (request.method === 'HEAD' || !response.headers.get('Content-Type')?.toLowerCase().includes('text/html')) return privateResponse;
  return new HTMLRewriter()
    .on('head meta[name="robots"]', { element: (element) => { element.remove(); } })
    .on('head script[type="application/ld+json"]', { element: (element) => { element.remove(); } })
    .on('head', { element: (element) => { element.append('<meta name="robots" content="noindex, nofollow" />', { html: true }); } })
    .transform(privateResponse);
}

export async function handlePagesRequest(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  const path = new URL(request.url).pathname;
  if (!['GET', 'HEAD'].includes(request.method) || path === '/api' || path.startsWith('/api/') || path.startsWith('/assets/') || path === '/favicon.svg') {
    return context.next();
  }
  if (path === '/admin' || path.startsWith('/admin/')) return rewriteAdminHtml(await context.next(), request);
  const normalized = path.replace(/\/+$/, '') || '/';
  const publicPage = (publicPageRoutes as readonly string[]).includes(normalized) || normalized.startsWith('/projects/');
  if (path !== '/sitemap.xml' && !publicPage) return context.next();
  try {
    const envelope = await readEnvelope(env);
    if (path === '/sitemap.xml') return sitemapResponse(request, envelope);
    const meta = metadataFor(request, envelope.published);
    // All detail pages use the same static app shell. Fetching root assets
    // bypasses Functions and avoids exposing a stale prebuilt project's head.
    const template = env.ASSETS
      ? await env.ASSETS.fetch(new Request(new URL('/', request.url), { method: 'GET', headers: { Accept: 'text/html' } }))
      : await context.next();
    if (template.status !== 200 || !template.headers.get('Content-Type')?.toLowerCase().includes('text/html')) {
      throw new HttpError(503, 'SITE_UNAVAILABLE', 'The portfolio page is temporarily unavailable.');
    }
    return await rewritePublicHtml(template, request, meta);
  } catch (error) { return errorResponse(error); }
}
