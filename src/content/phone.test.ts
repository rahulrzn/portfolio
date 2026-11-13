import { beforeEach, describe, expect, it } from 'vitest';
import { contentSchema, profileSchema } from './schema';
import { defaults } from './defaults';
import { createRepository, STORAGE_KEY } from './repository';
import { importBackup } from './backup';
import { phoneHref } from './contact';

function legacyEnvelope() {
  const original = JSON.parse(createRepository(localStorage).exportSnapshot());
  original.draft.profile.name = 'Preserved legacy draft';
  original.published.profile.name = 'Preserved legacy publication';
  delete original.draft.profile.phone;
  delete original.published.profile.phone;
  return original;
}
describe('optional phone content and old backups', () => {
  beforeEach(() => localStorage.clear());
  it('defaults a missing phone to blank while preserving old profile data', () => {
    const original = JSON.parse(JSON.stringify(defaults));
    delete original.profile.phone;
    const parsed = contentSchema.parse(original);
    expect(parsed.profile).toMatchObject({ phone: '', name: defaults.profile.name });
  });
  it('accepts optional formatted phone numbers and rejects commands or malformed numbers', () => {
    for (const phone of ['', '+91 98765 43210', '(044) 2345-6789', '555.1234']) {
      const parsed = profileSchema.safeParse({ ...defaults.profile, phone });
      expect(parsed.success, phone).toBe(true);
    }
    for (const phone of [
      'tel:+919876543210',
      'javascript:alert(1)',
      '+1;123456789',
      '++123456789',
      '123',
      '1'.repeat(16),
      '1234567 ext 12',
      '+１２３４５６７',
      ' '.repeat(41) + '1234567',
    ]) {
      expect(profileSchema.safeParse({ ...defaults.profile, phone }).success, phone).toBe(false);
    }
  });
  it('loads legacy version-one snapshots without recovery or changing draft/publication', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyEnvelope()));
    const repository = createRepository(localStorage);
    expect(repository.read().warning).toBe('');
    expect(repository.read().draft.profile).toMatchObject({
      name: 'Preserved legacy draft',
      phone: '',
    });
    expect(repository.read().published.profile).toMatchObject({
      name: 'Preserved legacy publication',
      phone: '',
    });
  });
  it('rejects invalid phone saves without changing stored or published content', () => {
    const repository = createRepository(localStorage);
    repository.saveDraft(defaults, 'Original');
    const before = repository.exportSnapshot();
    const content = structuredClone(defaults);
    content.profile.phone = '+1;123456789';
    expect(() => repository.saveDraft(content, 'Unsafe phone')).toThrow(/phone|digits/i);
    expect(repository.exportSnapshot()).toBe(before);
  });
  it('imports legacy plain and portable backups into draft without publishing', async () => {
    const legacy = legacyEnvelope();
    for (const raw of [
      JSON.stringify(legacy),
      JSON.stringify({ format: 'rahul-portfolio-backup', version: 1, content: legacy, images: [] }),
    ]) {
      const repository = createRepository(localStorage);
      await importBackup(raw, repository);
      expect(repository.read().draft.profile).toMatchObject({
        name: 'Preserved legacy draft',
        phone: '',
      });
      expect(repository.read().published.profile).toMatchObject({
        name: defaults.profile.name,
        phone: '',
      });
    }
  });
});
describe('safe dialable contact links', () => {
  it('preserves a leading country prefix and removes display formatting', () => {
    expect(phoneHref('+91 (98765) 43210')).toBe('tel:+919876543210');
    expect(phoneHref('(044) 2345-6789')).toBe('tel:04423456789');
    expect(phoneHref(' 555.1234 ')).toBe('tel:5551234');
  });
  it('does not create links for blank, missing, malformed or command-bearing values', () => {
    for (const value of [
      '',
      undefined,
      null,
      {},
      'tel:+919876543210',
      'javascript:alert(1)',
      '+1;123456789',
      '1234567#12',
      '1234567?subject=test',
      '1234567\n890',
    ]) {
      expect(phoneHref(value)).toBe('');
    }
  });
});
