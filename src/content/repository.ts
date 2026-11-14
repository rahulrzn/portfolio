import {
  contentSchema,
  envelopeSchema,
  validationMessage,
  type Content,
  type Envelope,
} from './schema';
import { defaults } from './defaults';
import { createCloudRepository } from './cloudRepository';
export const STORAGE_KEY = 'rahul-portfolio:content:v1';
export const BACKUP_KEY = 'rahul-portfolio:last-valid:v1';
const RECOVERY_KEY = 'rahul-portfolio:recovery:v1';
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export type Snapshot = Envelope & {
  warning: string;
  loading?: boolean;
  connected?: boolean;
  pending?: boolean;
  mode?: 'public' | 'admin';
};
export interface ContentRepository {
  read(): Snapshot;
  subscribe(listener: () => void): () => void;
  refresh(): void | Promise<void>;
  loadPublic(): Promise<void>;
  loadAdmin(): Promise<void>;
  leaveAdmin(): void;
  saveDraft(content: Content, label: string): void | Promise<void>;
  publish(): void | Promise<void>;
  revert(): void | Promise<void>;
  resetDraft(): void | Promise<void>;
  exportSnapshot(): string;
  importSnapshot(raw: string): void | Promise<void>;
  exportDamagedData(): string;
}
const initial = (): Envelope => ({
  version: 1,
  revision: 0,
  updatedAt: '',
  draft: structuredClone(defaults),
  published: structuredClone(defaults),
  activity: [],
});
const parse = (raw: string | null, rawLimit = 1_000_000): Envelope | null => {
  if (!raw || raw.length > rawLimit) return null;
  try {
    const result = envelopeSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};
export function createRepository(storage?: StoragePort): ContentRepository {
  let snapshot: Snapshot;
  const listeners = new Set<() => void>();
  const readStorage = () => {
    let warning = storage
      ? ''
      : 'Browser storage is unavailable. Original content is available; edits cannot be saved until storage is enabled.';
    let envelope: Envelope | null = null;
    try {
      const raw = storage?.getItem(STORAGE_KEY) ?? null;
      envelope = parse(raw);
      if (raw && !envelope) {
        envelope = parse(storage?.getItem(BACKUP_KEY) ?? null);
        if (!envelope && snapshot) {
          const { warning: _, ...previous } = snapshot;
          envelope = previous;
        }
        warning = envelope
          ? 'Saved content was damaged. Recovered the last valid content; the damaged data remains available for export.'
          : 'Saved content was damaged. Recovered original defaults; the damaged data remains available for export.';
      }
    } catch {
      if (snapshot) {
        const { warning: _, ...previous } = snapshot;
        envelope = previous;
      }
      warning =
        'Browser storage is unavailable. The last valid content remains available; edits cannot be saved until storage is enabled.';
    }
    snapshot = { ...(envelope ?? initial()), warning };
  };
  readStorage();
  function commit(next: Envelope, label: string) {
    const result = envelopeSchema.safeParse({
      ...next,
      revision: snapshot.revision + 1,
      updatedAt: new Date().toISOString(),
      activity: [
        { id: crypto.randomUUID(), label, at: new Date().toISOString() },
        ...snapshot.activity,
      ].slice(0, 30),
    });
    if (!result.success) throw new Error(validationMessage(result.error));
    const serialized = JSON.stringify(result.data);
    if (serialized.length > 1_000_000)
      throw new Error('Content is too large. Shorten the text or remove unused items.');
    if (!storage)
      throw new Error('Browser storage is unavailable. Enable browser storage to save edits.');
    const { warning: previousWarning, ...previous } = snapshot;
    void previousWarning;
    try {
      const existing = storage.getItem(STORAGE_KEY);
      if (existing && !parse(existing)) storage.setItem(RECOVERY_KEY, existing);
      // Keep a durable previous state before the authoritative single-key write.
      storage.setItem(BACKUP_KEY, JSON.stringify(previous));
      storage.setItem(STORAGE_KEY, serialized);
    } catch {
      throw new Error(
        'Browser storage could not save these changes. Export your content and free browser storage, then try again.',
      );
    }
    snapshot = { ...result.data, warning: '' };
    // Mirror the newest valid state. A mirror failure cannot invalidate the committed primary write.
    try {
      storage.setItem(BACKUP_KEY, serialized);
    } catch {
      snapshot = {
        ...snapshot,
        warning: 'Changes were saved, but the recovery copy could not be updated. Export a backup.',
      };
    }
    listeners.forEach((listener) => listener());
  }
  const envelope = (): Envelope => {
    const { warning: _, ...value } = snapshot;
    return value;
  };
  return {
    read: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    refresh: () => {
      readStorage();
      listeners.forEach((listener) => listener());
    },
    loadPublic: async () => { readStorage(); listeners.forEach((listener) => listener()); },
    loadAdmin: async () => { readStorage(); listeners.forEach((listener) => listener()); },
    leaveAdmin: () => {},
    saveDraft: (content, label) => {
      const result = contentSchema.safeParse(content);
      if (!result.success) throw new Error(validationMessage(result.error));
      commit({ ...envelope(), draft: result.data }, label);
    },
    publish: () =>
      commit(
        { ...envelope(), published: structuredClone(snapshot.draft) },
        'Published content in this browser',
      ),
    revert: () =>
      commit(
        { ...envelope(), draft: structuredClone(snapshot.published) },
        'Reverted draft to published content',
      ),
    resetDraft: () =>
      commit(
        { ...envelope(), draft: structuredClone(defaults) },
        'Restored original defaults in draft',
      ),
    exportSnapshot: () => JSON.stringify(envelope(), null, 2),
    importSnapshot: (raw) => {
      const imported = parse(raw, 4_000_000);
      if (!imported)
        throw new Error(
          'This backup is invalid or uses an unsupported version. No content was changed.',
        );
      commit({ ...envelope(), draft: imported.draft }, 'Imported backup into draft');
    },
    exportDamagedData: () => {
      try {
        return storage?.getItem(RECOVERY_KEY) ?? storage?.getItem(STORAGE_KEY) ?? '';
      } catch {
        return '';
      }
    },
  };
}
let browserRepository: ContentRepository | undefined;
export function getRepository(): ContentRepository {
  if (!browserRepository) {
    browserRepository = createCloudRepository();
  }
  return browserRepository;
}
