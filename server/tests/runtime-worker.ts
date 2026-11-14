import { handleApi } from '../api';
import { handlePagesRequest } from '../pages';
import type { ServerEnvironment } from '../types';

// A static fixture stands in for the Pages asset binding. All metadata,
// authentication, persistence and image code is the production implementation.
const shell = `<!doctype html><html lang="en"><head>
  <title>Stale build title</title>
  <meta name="description" content="Stale build description">
  <meta property="og:title" content="Stale build title">
  <meta property="og:description" content="Stale build description">
  <meta property="og:image" content="/assets/social-preview.png">
  <link rel="canonical" href="https://stale.example/old-project">
  <meta property="og:url" content="https://stale.example/old-project">
  <meta name="robots" content="index, follow">
  <script type="application/ld+json">{"name":"STALE STRUCTURED PERSON"}</script>
  <link rel="stylesheet" href="/assets/application.css">
</head><body><div id="root"></div><script type="module" src="/assets/application.js"></script></body></html>`;

async function asset(request: Request): Promise<Response> {
  if (new URL(request.url).pathname.startsWith('/assets/')) return new Response('original static asset', { headers: { 'Content-Type': 'application/javascript' } });
  return new Response(shell, { headers: { 'Content-Type': 'text/html; charset=utf-8', ETag: '"stale-asset-tag"' } });
}

export default {
  async fetch(request: Request, env: ServerEnvironment): Promise<Response> {
    if (new URL(request.url).pathname.startsWith('/api/')) return handleApi(request, env);
    return handlePagesRequest({ request, env: { ...env, ASSETS: { fetch: asset } }, next: () => asset(request) });
  },
};
