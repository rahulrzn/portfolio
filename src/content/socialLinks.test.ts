import { describe, expect, it } from 'vitest';
import { contentSchema } from './schema';
import { defaults } from './defaults';

describe('social link content', () => {
  it('migrates existing profile links only when the social field is missing', () => {
    const legacy = structuredClone(defaults) as Record<string, unknown>;
    delete legacy.socialLinks;
    legacy.profile = { ...defaults.profile, githubUrl: 'https://github.com/rahul', linkedinUrl: 'https://www.linkedin.com/in/rahul' };
    const migrated = contentSchema.parse(legacy) as unknown as { socialLinks: { platform: string; url: string; enabled: boolean; order: number }[] };
    expect(migrated.socialLinks).toEqual([
      { id: 'legacy-github', platform: 'github', url: 'https://github.com/rahul', enabled: true, order: 0 },
      { id: 'legacy-linkedin', platform: 'linkedin', url: 'https://www.linkedin.com/in/rahul', enabled: true, order: 1 },
    ]);
  });

  it('keeps an intentionally empty social list instead of resurrecting old profile links', () => {
    const parsed = contentSchema.safeParse({ ...defaults, profile: { ...defaults.profile, githubUrl: 'https://github.com/rahul' }, socialLinks: [] });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect((parsed.data as unknown as { socialLinks: unknown[] }).socialLinks).toEqual([]);
  });

  it.each([
    ['github', 'https://github.com/rahul', true],
    ['linkedin', 'https://www.linkedin.com/in/rahul', true],
    ['instagram', 'https://instagram.com/rahul.reji', true],
    ['x', 'https://x.com/rahul_reji', true],
    ['x', 'https://twitter.com/rahul_reji', true],
    ['github', 'https://evil.example/rahul', false],
    ['github', 'https://github.com/rahul/project', false],
    ['github', 'https://github.com@evil.example/rahul', false],
    ['linkedin', 'https://linkedin.com/in/', false],
    ['instagram', 'https://instagram.com/p/photo', false],
    ['x', 'https://x.com/settings', false],
    ['github', 'javascript:alert(1)', false],
    ['instagram', 'http://instagram.com/rahul', false],
  ])('validates %s profile %s', (platform, url, valid) => {
    const parsed = contentSchema.safeParse({ ...defaults, socialLinks: [{ id: 'social-a', platform, url, enabled: true, order: 0 }] });
    expect(parsed.success).toBe(valid);
  });

  it('rejects duplicate social IDs even when the URLs are valid', () => {
    const parsed = contentSchema.safeParse({ ...defaults, socialLinks: [
      { id: 'same-social', platform: 'github', url: 'https://github.com/rahul', enabled: true, order: 0 },
      { id: 'same-social', platform: 'x', url: 'https://x.com/rahul', enabled: true, order: 1 },
    ] });
    expect(parsed.success).toBe(false);
  });
});
