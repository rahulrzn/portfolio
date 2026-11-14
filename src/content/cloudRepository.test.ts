import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaults } from './defaults';
import { STORAGE_KEY } from './repository';
import type { Envelope } from './schema';

const cloudSnapshot = (): Envelope => ({
  version: 1, revision: 4, updatedAt: '2026-11-14T00:00:00.000Z',
  draft: { ...structuredClone(defaults), profile: { ...defaults.profile, name: 'Shared cloud profile' } },
  published: { ...structuredClone(defaults), profile: { ...defaults.profile, name: 'Shared cloud profile' } },
  activity: [],
});

beforeEach(() => { vi.resetModules(); localStorage.clear(); });
afterEach(() => { vi.unstubAllGlobals(); });

function network(write: (init?: RequestInit) => Promise<Response>) {
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path.endsWith('/api/admin/content') && (!init?.method || init.method === 'GET')) return Promise.resolve(Response.json(cloudSnapshot()));
    if (path.endsWith('/api/content')) {
      const snapshot = cloudSnapshot();
      return Promise.resolve(Response.json({ content: snapshot.published, revision: snapshot.revision, updatedAt: snapshot.updatedAt }));
    }
    return write(init);
  });
}

async function repository() {
  const { getRepository } = await import('./repository');
  const repo = getRepository();
  await repo.refresh();
  return repo;
}

describe('shared cloud repository', () => {
  it('reads the public API instead of choosing another browser’s local content', async () => {
    const legacy = cloudSnapshot();
    legacy.published.profile.name = 'Old browser content';
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    network(async () => Response.json({ error: 'Unexpected write', code: 'UNEXPECTED' }, { status: 500 }));
    const repo = await repository();
    expect(repo.read().published.profile.name).toBe('Shared cloud profile');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('Old browser content');
  });

  it('does not claim a draft is saved before the server acknowledges it', async () => {
    let finish!: (response: Response) => void;
    network(() => new Promise<Response>((resolve) => { finish = resolve; }));
    const repo = await repository();
    const changed = { ...repo.read().draft, profile: { ...repo.read().draft.profile, name: 'Acknowledged cloud edit' } };
    const saving = repo.saveDraft(changed, 'Saved profile');
    expect(repo.read().draft.profile.name).toBe('Shared cloud profile');
    const saved = cloudSnapshot();
    saved.draft = changed;
    saved.revision = 5;
    finish(Response.json(saved));
    await saving;
    expect(repo.read().draft.profile.name).toBe('Acknowledged cloud edit');
    expect(repo.read().published.profile.name).toBe('Shared cloud profile');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('retains acknowledged data when a network write fails', async () => {
    network(async () => Response.json({ error: 'Could not save changes. Try again.', code: 'SAVE_FAILED' }, { status: 503 }));
    const repo = await repository();
    const changed = { ...repo.read().draft, profile: { ...repo.read().draft.profile, name: 'Unacknowledged edit' } };
    await expect(Promise.resolve().then(() => repo.saveDraft(changed, 'Saved profile'))).rejects.toThrow('Could not save changes');
    expect(repo.read().draft.profile.name).toBe('Shared cloud profile');
    expect(repo.read().published.profile.name).toBe('Shared cloud profile');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('reports a stale revision without overwriting the acknowledged draft', async () => {
    network(async () => Response.json({ error: 'Content changed in another session. Reload the latest version before saving.', code: 'REVISION_CONFLICT' }, { status: 409 }));
    const repo = await repository();
    await expect(Promise.resolve().then(() => repo.saveDraft(repo.read().draft, 'Saved draft'))).rejects.toThrow('another session');
    expect(repo.read().revision).toBe(4);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
