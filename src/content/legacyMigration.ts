import { envelopeSchema } from './schema';
import { BACKUP_KEY, STORAGE_KEY, createRepository } from './repository';
import { exportBackup } from './backup';
import { legacyImageStore } from './images';

export async function readLegacyBackup(): Promise<string | null> {
  let storage: Storage;
  let raw: string | null;
  try { storage = window.localStorage; raw = storage.getItem(STORAGE_KEY); } catch {
    throw new Error('Existing browser content is unavailable. Import a previously exported backup instead.');
  }
  if (!raw) return null;
  const valid = (value: string | null) => {
    if (!value || value.length > 4_000_000) return false;
    try { return envelopeSchema.safeParse(JSON.parse(value)).success; } catch { return false; }
  };
  if (!valid(raw) && !valid(storage.getItem(BACKUP_KEY))) throw new Error('Existing browser content is damaged. Keep the browser data and recover a valid backup before importing.');
  return exportBackup(createRepository(storage), legacyImageStore);
}
