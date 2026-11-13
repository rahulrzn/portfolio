import { beforeEach, describe, expect, it } from 'vitest';
import { createRepository, STORAGE_KEY, BACKUP_KEY } from './repository';
import { defaults } from './defaults';
import { contentSchema, webUrl } from './schema';

describe('controlled content validation', () => {
  it('accepts verified defaults and rejects executable or credential-bearing URLs', () => {
    expect(contentSchema.safeParse(defaults).success).toBe(true);
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,hello',
      'https://user:pass@example.com',
      '//example.com',
    ])
      expect(webUrl.safeParse(url).success).toBe(false);
    expect(webUrl.safeParse('https://soho-suite.pages.dev/').success).toBe(true);
  });
  it('rejects duplicate project slugs and unknown content fields', () => {
    const content = structuredClone(defaults);
    content.projects[1].slug = content.projects[0].slug;
    expect(contentSchema.safeParse(content).success).toBe(false);
    expect(contentSchema.safeParse({ ...defaults, html: '<script />' }).success).toBe(false);
  });
});

describe('safe local repository', () => {
  beforeEach(() => localStorage.clear());
  it('keeps edits private until publication and preserves them across repository reloads', () => {
    const repository = createRepository(localStorage);
    const draft = structuredClone(repository.read().draft);
    draft.profile.name = 'Edited local name';
    repository.saveDraft(draft, 'Edited profile');
    expect(repository.read().published.profile.name).toBe(defaults.profile.name);
    expect(createRepository(localStorage).read().draft.profile.name).toBe('Edited local name');
    repository.publish();
    expect(repository.read().published.profile.name).toBe('Edited local name');
  });
  it('recovers corrupt data from the last valid snapshot without silently replacing it', () => {
    const repository = createRepository(localStorage);
    const draft = structuredClone(defaults);
    draft.profile.name = 'Preserved';
    repository.saveDraft(draft, 'Profile');
    localStorage.setItem(STORAGE_KEY, '{malformed');
    const recovered = createRepository(localStorage);
    expect(recovered.read().draft.profile.name).toBe('Preserved');
    expect(recovered.read().warning).toMatch(/recover/i);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{malformed');
    expect(localStorage.getItem(BACKUP_KEY)).toBeTruthy();
  });
  it('rejects invalid drafts and imports without modifying valid storage', () => {
    const repository = createRepository(localStorage);
    repository.saveDraft(defaults, 'Saved');
    const original = localStorage.getItem(STORAGE_KEY);
    expect(() => repository.saveDraft({ ...defaults, projects: null } as never, 'Bad')).toThrow();
    expect(() => repository.importSnapshot('{"version":999}')).toThrow();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
  });
  it('rejects quota failures without claiming saved edits or changing the snapshot', () => {
    const failing = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const repository = createRepository(failing);
    const original = repository.read();
    const draft = structuredClone(defaults);
    draft.profile.name = 'Unsaved';
    expect(() => repository.saveDraft(draft, 'Bad')).toThrow(/storage/i);
    expect(repository.read()).toBe(original);
  });
  it('preserves the last valid in-memory content when later storage reads are denied', () => {
    let denied = false;
    const storage = {
      getItem: (key: string) => {
        if (denied) throw new Error('Denied');
        return localStorage.getItem(key);
      },
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
    };
    const repository = createRepository(storage);
    const draft = structuredClone(defaults);
    draft.profile.name = 'Retained custom name';
    repository.saveDraft(draft, 'Profile');
    repository.publish();
    denied = true;
    repository.refresh();
    expect(repository.read().published.profile.name).toBe('Retained custom name');
    expect(repository.read().warning).toMatch(/unavailable/);
    expect(createRepository(undefined).read().warning).toMatch(/unavailable/);
  });
  it('retains valid draft and published memory when both persisted copies become malformed', () => {
    const repository = createRepository(localStorage);
    const draft = structuredClone(defaults);
    draft.profile.name = 'Valid publication';
    repository.saveDraft(draft, 'Profile');
    repository.publish();
    draft.profile.name = 'Valid saved draft';
    repository.saveDraft(draft, 'Profile');
    localStorage.setItem(STORAGE_KEY, '{damaged primary');
    localStorage.setItem(BACKUP_KEY, '{damaged recovery');
    repository.refresh();
    expect(repository.read().published.profile.name).toBe('Valid publication');
    expect(repository.read().draft.profile.name).toBe('Valid saved draft');
    expect(repository.read().warning).toMatch(/last valid/);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{damaged primary');
    expect(localStorage.getItem(BACKUP_KEY)).toBe('{damaged recovery');
  });
  it('roundtrips pretty-printed exports even when whitespace exceeds the compact storage limit', () => {
    const repository = createRepository(localStorage);
    const draft = structuredClone(defaults);
    draft.projects = Array.from({ length: 37 }, (_, i) => ({
      ...draft.projects[0],
      id: `large-${i}`,
      slug: `large-${i}`,
      overview: 'x'.repeat(4000),
      problem: 'x'.repeat(3000),
      approach: 'x'.repeat(3000),
      implementation: 'x'.repeat(5000),
      description: 'x'.repeat(600),
      technologies: Array.from({ length: 40 }, (_, j) => `Technology ${j} ${'x'.repeat(40)}`),
      outcomes: Array.from({ length: 12 }, (_, j) => ({
        value: `Outcome ${j}`,
        label: 'x'.repeat(180),
        context: 'x'.repeat(400),
      })),
    }));
    repository.saveDraft(draft, 'Large supported content');
    const exported = repository.exportSnapshot();
    expect(exported.length).toBeGreaterThan(1_000_000);
    expect(() => repository.importSnapshot(exported)).not.toThrow();
  });
  it('exports portable valid snapshots, stages imported content, and restores defaults safely', () => {
    const repository = createRepository(localStorage);
    const draft = structuredClone(defaults);
    draft.profile.name = 'Backup name';
    repository.saveDraft(draft, 'Profile');
    const backup = repository.exportSnapshot();
    repository.resetDraft();
    expect(repository.read().draft.profile.name).toBe(defaults.profile.name);
    repository.importSnapshot(backup);
    expect(repository.read().draft.profile.name).toBe('Backup name');
    expect(repository.read().published.profile.name).toBe(defaults.profile.name);
    repository.revert();
    expect(repository.read().draft.profile.name).toBe(defaults.profile.name);
  });
});
