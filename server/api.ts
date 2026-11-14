import { changeContent, publicContent, readEnvelope } from './content';
import { authenticationConfigured, authorizeMutation, login, logout, readSession, requireSession, sessionInfo } from './auth';
import { errorResponse, HttpError, json, matchesRevision, privateHeaders, readJson, revisionHeaders } from './http';
import { revisionRequestSchema, saveContentRequestSchema } from '../src/content/contracts';
import { validationMessage } from '../src/content/schema';
import { deleteMedia, readMedia, uploadMedia } from './media';
import type { ServerEnvironment } from './types';

export async function handleApi(request: Request, env: ServerEnvironment): Promise<Response> {
  try {
    const path = new URL(request.url).pathname;
    if (path === '/api/health' && request.method === 'GET') {
      let ready = false;
      if (env.PORTFOLIO_DB && authenticationConfigured(env)) {
        try {
          const row = await env.PORTFOLIO_DB.prepare(`SELECT
            (SELECT COUNT(*) FROM rr_portfolio_content) +
            (SELECT COUNT(*) FROM rr_portfolio_sessions) +
            (SELECT COUNT(*) FROM rr_portfolio_login_buckets) +
            (SELECT COUNT(*) FROM rr_portfolio_media) AS records`).first();
          ready = row !== null;
        } catch { ready = false; }
      }
      return json({ ready }, ready ? 200 : 503);
    }
    if (path === '/api/content' && request.method === 'GET') {
      const envelope = await readEnvelope(env);
      const headers = revisionHeaders(envelope.revision);
      if (matchesRevision(request, envelope.revision)) {
        return new Response(null, { status: 304, headers: { ...privateHeaders, ...headers } });
      }
      return json({ content: publicContent(envelope.published), revision: envelope.revision, updatedAt: envelope.updatedAt }, 200, headers);
    }
    if (path === '/api/auth/session' && request.method === 'GET') return json(sessionInfo(request, await readSession(request, env)));
    if (path === '/api/auth/login' && request.method === 'POST') return await login(request, env);
    if (path === '/api/auth/logout' && request.method === 'POST') return await logout(request, env);
    if (path === '/api/admin/content' && request.method === 'GET') {
      await requireSession(request, env);
      return json(await readEnvelope(env));
    }
    if (path === '/api/admin/content' && request.method === 'PUT') {
      await authorizeMutation(request, env);
      const parsed = saveContentRequestSchema.safeParse(await readJson(request));
      if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST', validationMessage(parsed.error));
      return json(await changeContent(env, parsed.data.expectedRevision, { type: 'save', content: parsed.data.content, label: parsed.data.label }));
    }
    if (['/api/admin/publish', '/api/admin/revert', '/api/admin/reset'].includes(path) && request.method === 'POST') {
      await authorizeMutation(request, env);
      const parsed = revisionRequestSchema.safeParse(await readJson(request, 4096));
      if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST', validationMessage(parsed.error));
      const type = path.slice('/api/admin/'.length) as 'publish' | 'revert' | 'reset';
      return json(await changeContent(env, parsed.data.expectedRevision, { type }));
    }
    if (path === '/api/admin/media' && request.method === 'POST') return await uploadMedia(request, env);
    const media = /^\/api\/media\/([^/]+)$/.exec(path);
    if (media && request.method === 'GET') return await readMedia(request, env, media[1]);
    const adminMedia = /^\/api\/admin\/media\/([^/]+)$/.exec(path);
    if (adminMedia && request.method === 'DELETE') return await deleteMedia(request, env, adminMedia[1]);
    return json({ error: 'API route not found.', code: 'NOT_FOUND' }, 404);
  } catch (error) { return errorResponse(error); }
}
