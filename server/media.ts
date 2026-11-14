import { authorizeMutation, readSession } from './auth';
import { contentNamespace, publicContent, readEnvelope } from './content';
import { database, HttpError, json, privateHeaders, readBytes } from './http';
import { maxMediaBytes, type ImageMime } from './images/common';
import { imageMime, validateRaster } from './images/raster';
import { mediaUuidPattern } from './mediaReferences';
import type { ServerEnvironment } from './types';

function notFound(): never { throw new HttpError(404, 'NOT_FOUND', 'Media not found.'); }

export async function uploadMedia(request: Request, env: ServerEnvironment): Promise<Response> {
  await authorizeMutation(request, env);
  const mime = imageMime(request.headers.get('Content-Type'));
  const bytes = await readBytes(request, maxMediaBytes);
  const { width, height } = await validateRaster(bytes, mime);
  const id = crypto.randomUUID();
  await database(env).prepare('INSERT INTO rr_portfolio_media (id, mime, bytes, width, height, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, mime, bytes.slice().buffer, width, height, Date.now()).run();
  return json({ id: `image:${id}` }, 201);
}

function storedBytes(value: unknown): Uint8Array<ArrayBuffer> {
  if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
  if (ArrayBuffer.isView(value)) return new Uint8Array(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  if (Array.isArray(value) && value.length <= maxMediaBytes && value.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)) return new Uint8Array(value);
  throw new HttpError(503, 'STORAGE_UNAVAILABLE', 'The image is temporarily unavailable.');
}

export async function readMedia(request: Request, env: ServerEnvironment, id: string): Promise<Response> {
  if (!mediaUuidPattern.test(id)) notFound();
  const envelope = await readEnvelope(env);
  const visible = publicContent(envelope.published);
  const reference = `image:${id}`;
  const isPublic = visible.profile.image === reference || visible.projects.some((project) => project.image === reference);
  if (!isPublic && !await readSession(request, env)) notFound();
  const row = await database(env).prepare('SELECT mime, bytes FROM rr_portfolio_media WHERE id = ?')
    .bind(id).first<{ mime: ImageMime; bytes: unknown }>();
  if (!row) notFound();
  const bytes = storedBytes(row.bytes);
  if (bytes.byteLength > maxMediaBytes || !['image/png', 'image/jpeg', 'image/webp'].includes(row.mime)) {
    throw new HttpError(503, 'STORAGE_UNAVAILABLE', 'The image is temporarily unavailable.');
  }
  const headers = new Headers(privateHeaders);
  headers.set('Content-Type', row.mime);
  headers.set('Vary', 'Cookie');
  if (isPublic) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('ETag', `"media-${id}"`);
  }
  headers.set('Content-Length', String(bytes.byteLength));
  return new Response(bytes.buffer, { headers });
}

export async function deleteMedia(request: Request, env: ServerEnvironment, id: string): Promise<Response> {
  await authorizeMutation(request, env);
  if (!mediaUuidPattern.test(id)) notFound();
  await readEnvelope(env);
  const db = database(env), reference = `image:${id}`;
  // Reference checks and deletion occur in the same statement, so a content
  // write racing the deletion cannot invalidate the decision made here.
  const result = await db.prepare(`DELETE FROM rr_portfolio_media WHERE id = ? AND NOT EXISTS (
    SELECT 1 FROM rr_portfolio_content WHERE namespace = ? AND (
      json_extract(document, '$.draft.profile.image') = ? OR
      json_extract(document, '$.published.profile.image') = ? OR
      EXISTS (SELECT 1 FROM json_each(document, '$.draft.projects') WHERE json_extract(value, '$.image') = ?) OR
      EXISTS (SELECT 1 FROM json_each(document, '$.published.projects') WHERE json_extract(value, '$.image') = ?)
    )
  )`).bind(id, contentNamespace, reference, reference, reference, reference).run();
  if (result.meta.changes !== 1) {
    const exists = await db.prepare('SELECT id FROM rr_portfolio_media WHERE id = ?').bind(id).first();
    if (!exists) notFound();
    throw new HttpError(409, 'MEDIA_REFERENCED', 'This image is still referenced by draft or published content. Remove those references before deleting it.');
  }
  return json({ ok: true });
}
