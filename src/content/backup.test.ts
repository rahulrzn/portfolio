import { expect, it, vi } from 'vitest';
import { exportBackup, importBackup } from './backup';
import { createRepository } from './repository';
import { defaults } from './defaults';
import { imageStore } from './images';
it('does not silently export an incomplete backup when a referenced image is unavailable', async () => {
  localStorage.clear();
  const repository = createRepository(localStorage);
  const draft = structuredClone(defaults);
  draft.profile.image = 'image:missing-image';
  repository.saveDraft(draft, 'Photo');
  const spy = vi.spyOn(imageStore, 'get').mockResolvedValue(null);
  await expect(exportBackup(repository)).rejects.toThrow(/image/i);
  spy.mockRestore();
});
it('rejects invalid portable backup content without changing the draft', async () => {
  localStorage.clear();
  const repository = createRepository(localStorage);
  const before = repository.exportSnapshot();
  await expect(
    importBackup('{"format":"rahul-portfolio-backup","version":2}', repository),
  ).rejects.toThrow(/invalid|unsupported/i);
  expect(repository.exportSnapshot()).toBe(before);
});

it('does not report a plain backup import as complete when its shared save is rejected', async () => {
  const repository = createRepository(localStorage);
  const failure = Promise.reject(new Error('The shared database rejected the import.'));
  void failure.catch(() => {});
  const spy = vi.spyOn(repository, 'importSnapshot').mockReturnValue(failure);
  await expect(importBackup(repository.exportSnapshot(), repository)).rejects.toThrow('shared database rejected');
  spy.mockRestore();
});
