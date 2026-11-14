import { envelopeSchema, validationMessage, type Content, type Envelope } from '../src/content/schema';
import { defaults } from '../src/content/defaults';
import { database, HttpError } from './http';
import type { ServerEnvironment } from './types';
import { assertMediaExist, mediaIds } from './mediaReferences';

export const contentNamespace = 'rahul-portfolio:v1';
// Leave room for the namespaced key, revision and SQLite row overhead, below
// the application's 1,800,000-byte row budget and D1's 2,000,000-byte limit.
export const maxDocumentBytes = 1_799_900;

interface ContentRow { revision: number; document: string }

function parseRow(row: ContentRow): Envelope {
  try {
    if (typeof row.document !== 'string' || new TextEncoder().encode(row.document).byteLength >= maxDocumentBytes) {
      throw new Error('Invalid document size');
    }
    const envelope = envelopeSchema.parse(JSON.parse(row.document));
    if (envelope.revision !== row.revision) throw new Error('Inconsistent revision');
    return envelope;
  } catch {
    throw new HttpError(503, 'CONTENT_INVALID', 'Stored portfolio content needs recovery. The existing data has been preserved.');
  }
}

export async function readEnvelope(env: ServerEnvironment): Promise<Envelope> {
  const db = database(env);
  const select = () => db.prepare('SELECT revision, document FROM rr_portfolio_content WHERE namespace = ?')
    .bind(contentNamespace).first<ContentRow>();
  const existing = await select();
  if (existing) return parseRow(existing);
  const envelope = envelopeSchema.parse({
    version: 1, revision: 0, updatedAt: new Date().toISOString(),
    draft: structuredClone(defaults), published: structuredClone(defaults), activity: [],
  });
  const document = JSON.stringify(envelope);
  if (new TextEncoder().encode(document).byteLength >= maxDocumentBytes) {
    throw new HttpError(413, 'CONTENT_TOO_LARGE', 'Portfolio content exceeds the storage limit.');
  }
  // Another request may have seeded or populated the row after the SELECT.
  // An insert conflict must never overwrite its document.
  await db.prepare('INSERT INTO rr_portfolio_content (namespace, revision, document) VALUES (?, ?, ?) ON CONFLICT(namespace) DO NOTHING')
    .bind(contentNamespace, envelope.revision, document).run();
  const seeded = await select();
  if (!seeded) throw new HttpError(503, 'STORAGE_UNAVAILABLE', 'Portfolio storage is temporarily unavailable.');
  return parseRow(seeded);
}

export function publicContent(content: Content): Content {
  const socialLinks = content.socialLinks.filter((link) => link.enabled);
  return {
    ...content,
    profile: {
      ...content.profile,
      // Legacy fields must honor an authoritative social-link list as well.
      githubUrl: socialLinks.find((link) => link.platform === 'github')?.url ?? '',
      linkedinUrl: socialLinks.find((link) => link.platform === 'linkedin')?.url ?? '',
    },
    projects: content.projects.filter((project) => project.status === 'published'),
    research: content.research.filter((research) => research.status === 'published'),
    socialLinks,
  };
}

export type ContentAction =
  | { type: 'save'; content: Content; label: string }
  | { type: 'publish' | 'revert' | 'reset' };

function revisionConflict(): never {
  throw new HttpError(409, 'REVISION_CONFLICT', 'The portfolio changed in another session. Refresh before saving again.');
}

export async function changeContent(env: ServerEnvironment, expectedRevision: number, action: ContentAction): Promise<Envelope> {
  const db = database(env);
  const current = await readEnvelope(env);
  if (current.revision !== expectedRevision) revisionConflict();
  const at = new Date().toISOString();
  const draft = action.type === 'save' ? action.content
    : action.type === 'revert' ? current.published
    : action.type === 'reset' ? defaults : current.draft;
  const published = action.type === 'publish' ? current.draft : current.published;
  const labels = { publish: 'Published portfolio content', revert: 'Reverted draft to published content', reset: 'Restored original defaults in draft' };
  const label = action.type === 'save' ? action.label : labels[action.type];
  const parsed = envelopeSchema.safeParse({
    ...current, draft, published, revision: current.revision + 1, updatedAt: at,
    activity: [{ id: crypto.randomUUID(), label, at }, ...current.activity].slice(0, 30),
  });
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST', validationMessage(parsed.error));
  const document = JSON.stringify(parsed.data);
  if (new TextEncoder().encode(document).byteLength >= maxDocumentBytes) {
    throw new HttpError(413, 'CONTENT_TOO_LARGE', 'The saved draft and published content exceed the storage limit. Shorten the text or remove unused entries.');
  }
  const ids = mediaIds(parsed.data.draft, parsed.data.published);
  await assertMediaExist(db, ids);
  const result = await db.prepare(`UPDATE rr_portfolio_content SET document = ?, revision = ?
    WHERE namespace = ? AND revision = ? AND NOT EXISTS (
      SELECT 1 FROM json_each(?) AS reference
      LEFT JOIN rr_portfolio_media AS media ON media.id = reference.value
      WHERE media.id IS NULL
    )`).bind(document, parsed.data.revision, contentNamespace, expectedRevision, JSON.stringify(ids)).run();
  if (result.meta.changes !== 1) {
    const latest = await readEnvelope(env);
    if (latest.revision !== expectedRevision) revisionConflict();
    // Deletion could race the initial reference check. The guarded UPDATE has
    // changed no bytes; report the missing image rather than accept a broken row.
    await assertMediaExist(db, ids);
    throw new HttpError(503, 'STORAGE_UNAVAILABLE', 'Portfolio storage is temporarily unavailable.');
  }
  return parsed.data;
}
