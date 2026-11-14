import { apiRequest } from './api';
import { publicContentResponseSchema } from './contracts';
import { defaults } from './defaults';
import { contentSchema, envelopeSchema, validationMessage, type Content, type Envelope } from './schema';
import type { ContentRepository, Snapshot } from './repository';

function visibleContent(content: Content): Content {
  return {
    ...content,
    profile: { ...content.profile, githubUrl: '', linkedinUrl: '' },
    projects: content.projects.filter((project) => project.status === 'published'),
    research: content.research.filter((entry) => entry.status === 'published'),
    socialLinks: content.socialLinks.filter((link) => link.enabled),
  };
}

export function createCloudRepository(): ContentRepository {
  let snapshot: Snapshot = {
    version: 1, revision: 0, updatedAt: '',
    draft: structuredClone(defaults), published: structuredClone(defaults), activity: [],
    warning: '', loading: true, connected: false, pending: false, mode: 'public',
  };
  let mode: 'public' | 'admin' = 'public';
  let generation = 0;
  let publicRequest: Promise<void> | undefined;
  let damagedData = '';
  const listeners = new Set<() => void>();
  const update = (next: Snapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  const envelope = (): Envelope => ({
    version: snapshot.version, revision: snapshot.revision, updatedAt: snapshot.updatedAt,
    draft: snapshot.draft, published: snapshot.published, activity: snapshot.activity,
  });

  function loadPublic(): Promise<void> {
    if (mode === 'admin') return Promise.resolve();
    if (publicRequest) return publicRequest;
    const requestGeneration = generation;
    publicRequest = (async () => {
      try {
        const response = await apiRequest('/api/content', { cache: 'no-cache' });
        const parsed = publicContentResponseSchema.safeParse(response);
        if (!parsed.success) throw new Error('The published content could not be read. Try again.');
        if (requestGeneration !== generation || mode !== 'public') return;
        const { content, revision, updatedAt } = parsed.data;
        update({ ...snapshot, revision, updatedAt, draft: content, published: content, activity: [], warning: '', loading: false, connected: true, mode: 'public' });
      } catch (error) {
        if (requestGeneration === generation && mode === 'public') update({
          ...snapshot, loading: false, warning: error instanceof Error ? error.message : 'Could not load the portfolio. Try again.',
        });
      } finally {
        publicRequest = undefined;
      }
    })();
    return publicRequest;
  }

  async function loadAdmin(): Promise<void> {
    mode = 'admin';
    generation++;
    update({ ...snapshot, loading: snapshot.mode !== 'admin' || !snapshot.connected, mode: 'admin', warning: '' });
    try {
      const value = await apiRequest('/api/admin/content');
      const parsed = envelopeSchema.safeParse(value);
      if (!parsed.success) {
        damagedData = JSON.stringify(value);
        throw new Error('Saved content could not be read safely. No content was changed. Export recovery data or contact the site owner.');
      }
      update({ ...parsed.data, loading: false, connected: true, pending: false, warning: '', mode: 'admin' });
    } catch (error) {
      update({ ...snapshot, loading: false, warning: error instanceof Error ? error.message : 'Could not load saved content.' });
      throw error;
    }
  }

  async function mutate(path: string, body: object, method = 'POST'): Promise<void> {
    if (snapshot.pending) throw new Error('A change is still being saved. Wait for it to finish.');
    update({ ...snapshot, pending: true, warning: '' });
    try {
      const value = await apiRequest(path, { method, body: JSON.stringify({ ...body, expectedRevision: snapshot.revision }) });
      const parsed = envelopeSchema.safeParse(value);
      if (!parsed.success) throw new Error('The server did not confirm a valid saved version. Reload the latest content before trying again.');
      mode = 'admin';
      generation++;
      update({ ...parsed.data, pending: true, loading: false, connected: true, warning: '', mode: 'admin' });
    } catch (error) {
      update({ ...snapshot, warning: error instanceof Error ? error.message : 'Changes could not be saved. Try again.' });
      throw error;
    } finally {
      update({ ...snapshot, pending: false });
    }
  }

  return {
    read: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    loadPublic, loadAdmin,
    refresh: () => mode === 'admin' ? loadAdmin() : loadPublic(),
    saveDraft: async (content, label) => {
      const parsed = contentSchema.safeParse(content);
      if (!parsed.success) throw new Error(validationMessage(parsed.error));
      await mutate('/api/admin/content', { content: parsed.data, label }, 'PUT');
    },
    publish: () => mutate('/api/admin/publish', {}),
    revert: () => mutate('/api/admin/revert', {}),
    resetDraft: () => mutate('/api/admin/reset', {}),
    exportSnapshot: () => JSON.stringify(envelope(), null, 2),
    importSnapshot: async (raw) => {
      if (raw.length > 4_000_000) throw new Error('Content backup is too large. No content was changed.');
      let value: unknown;
      try { value = JSON.parse(raw); } catch { throw new Error('This backup is not valid JSON. No content was changed.'); }
      const parsed = envelopeSchema.safeParse(value);
      if (!parsed.success) throw new Error('This backup is invalid or uses an unsupported version. No content was changed.');
      await mutate('/api/admin/content', { content: parsed.data.draft, label: 'Imported backup into draft' }, 'PUT');
    },
    exportDamagedData: () => damagedData,
    leaveAdmin: () => {
      mode = 'public'; generation++;
      const content = visibleContent(snapshot.published);
      update({ ...snapshot, draft: content, published: content, activity: [], mode: 'public', pending: false, warning: '' });
    },
  };
}
