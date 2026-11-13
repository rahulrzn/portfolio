import { beforeEach, describe, expect, it } from 'vitest';
import { contentSchema } from './schema';
import { defaults } from './defaults';
import { createRepository, STORAGE_KEY } from './repository';
import { importBackup } from './backup';

function oldContent() {
  const original = JSON.parse(JSON.stringify(defaults));
  delete original.profile.phone;
  delete original.profile.opportunities;
  return original;
}
describe('editable opportunities and legacy content', () => {
  beforeEach(() => localStorage.clear());
  it('preserves old profile details and supplies the requested career/location priorities', () => {
    const content = contentSchema.parse(oldContent());
    expect(content.profile).toMatchObject({
      name: defaults.profile.name,
      phone: '',
      opportunities: {
        visible: true,
        preferredLocations: ['Bangalore', 'Kerala', 'Chennai'],
        careerInterests: [
          'Graduate Software Engineer / Associate Software Engineer',
          'Backend Developer (Java, Spring Boot)',
          'Full Stack Developer',
          'Software Engineering',
          'Data Engineering and Analytics',
        ],
        employmentTypes: [
          'Full-time positions',
          'Graduate hiring programs',
          'Remote opportunities across India',
        ],
      },
    });
  });
  it('rejects excessive opportunity content, empty list entries and unsupported fields', () => {
    const valid = JSON.parse(JSON.stringify(defaults));
    for (const change of [
      { heading: 'x'.repeat(161) },
      { summary: 'x'.repeat(1501) },
      { flexibility: 'x'.repeat(1001) },
      { preferredLocations: [''] },
      { careerInterests: Array.from({ length: 13 }, () => 'Software') },
      { employmentTypes: ['x'.repeat(121)] },
      { html: '<script />' },
      { visible: 'yes' },
    ]) {
      expect(
        contentSchema.safeParse({
          ...valid,
          profile: {
            ...valid.profile,
            opportunities: { ...valid.profile.opportunities, ...change },
          },
        }).success,
      ).toBe(false);
    }
  });
  it('keeps default lists independent when separate old profiles are loaded', () => {
    const first = contentSchema.parse(oldContent());
    first.profile.opportunities.preferredLocations[0] = 'Changed only this profile';
    expect(contentSchema.parse(oldContent()).profile.opportunities.preferredLocations[0]).toBe(
      'Bangalore',
    );
  });
  it('loads old snapshots and imports old backups without recovery or overwriting publication', async () => {
    const legacy = JSON.parse(createRepository(localStorage).exportSnapshot());
    legacy.draft = oldContent();
    legacy.draft.profile.name = 'Legacy opportunities draft';
    legacy.published = oldContent();
    legacy.published.profile.name = 'Legacy public profile';
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    const loaded = createRepository(localStorage);
    expect(loaded.read().warning).toBe('');
    expect(loaded.read().published.profile.name).toBe('Legacy public profile');
    expect(loaded.read().draft.profile.opportunities.visible).toBe(true);
    await importBackup(
      JSON.stringify({ format: 'rahul-portfolio-backup', version: 1, content: legacy, images: [] }),
      loaded,
    );
    expect(loaded.read().draft.profile.name).toBe('Legacy opportunities draft');
    expect(loaded.read().published.profile.name).toBe('Legacy public profile');
  });
  it('stages edited availability and priorities until explicit publication', () => {
    const repository = createRepository(localStorage);
    const content = structuredClone(defaults);
    content.profile.opportunities = {
      ...content.profile.opportunities,
      visible: false,
      heading: 'Future opportunities',
      preferredLocations: ['Chennai', 'Bangalore'],
    };
    repository.saveDraft(content, 'Opportunities');
    expect(repository.read().draft.profile.opportunities).toMatchObject({
      visible: false,
      preferredLocations: ['Chennai', 'Bangalore'],
    });
    expect(repository.read().published.profile.opportunities).toMatchObject({
      visible: true,
      preferredLocations: ['Bangalore', 'Kerala', 'Chennai'],
    });
    repository.publish();
    expect(repository.read().published.profile.opportunities).toMatchObject({
      visible: false,
      heading: 'Future opportunities',
      preferredLocations: ['Chennai', 'Bangalore'],
    });
  });
});
