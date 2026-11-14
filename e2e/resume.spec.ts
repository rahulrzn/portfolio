import { readFile } from 'node:fs/promises';
import { defaults } from '../src/content/defaults';
import { expect, test } from './fixtures';

test('public resume preview shows published details, downloads a PDF and preserves resume references', async ({
  page, publishContent,
}) => {
  const content = structuredClone(defaults);
  content.profile.email = 'resume-owner@example.com';
  content.profile.phone = '+91 98765 43210';
  content.socialLinks = [
    { id: 'resume-github', platform: 'github', url: 'https://github.com/portfolio-owner', enabled: true, order: 0 },
    { id: 'resume-hidden', platform: 'instagram', url: 'https://instagram.com/hidden_owner', enabled: false, order: 1 },
  ];
  content.projects[0].githubUrl = 'https://github.com/portfolio-owner/soho-suite';
  content.projects.push({
    ...content.projects[0], id: 'private-resume-project', slug: 'private-resume-project',
    title: 'PRIVATE UNPUBLISHED RESUME PROJECT', status: 'draft',
  });
  await publishContent(content);
  await page.goto('/');
  await page.locator('.hero-primary-actions').getByRole('link', { name: 'Preview résumé', exact: true }).click();
  await expect(page).toHaveURL(/\/resume$/);
  await expect(page.getByRole('heading', { name: 'Résumé', level: 1 })).toBeVisible();
  const preview = page.getByRole('article', { name: 'Résumé preview', exact: true });
  await expect(preview.getByRole('heading', { name: 'Rahul Reji R.', exact: true })).toBeVisible();
  await expect(preview.getByRole('link', { name: 'resume-owner@example.com', exact: true })).toHaveAttribute(
    'href', 'mailto:resume-owner@example.com',
  );
  await expect(preview.getByRole('link', { name: '+91 98765 43210', exact: true })).toHaveAttribute(
    'href', 'tel:+919876543210',
  );
  await expect(preview.locator('a[href="https://github.com/portfolio-owner"]')).toBeVisible();
  await expect(preview.locator('a[href="https://github.com/portfolio-owner/soho-suite"]')).toBeVisible();
  await expect(preview.getByRole('heading', { name: 'Soho Suite', exact: true })).toBeVisible();
  await expect(preview.getByRole('heading', { name: 'Education', exact: true })).toBeVisible();
  await expect(preview.getByRole('heading', { name: 'Skills', exact: true })).toBeVisible();
  await expect(page.getByText('PRIVATE UNPUBLISHED RESUME PROJECT')).toHaveCount(0);
  await expect(page.locator('a[href="https://instagram.com/hidden_owner"]')).toHaveCount(0);

  const downloaded = page.waitForEvent('download');
  await page.locator('.resume-page').getByRole('button', { name: 'Download résumé', exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('rahul-reji-resume.pdf');
  const pdf = await readFile((await download.path())!, 'utf8');
  expect(pdf).toMatch(/^%PDF-1\.4/);
  expect(pdf).toContain('resume-owner@example.com');
  expect(pdf).toContain('https://github.com/portfolio-owner/soho-suite');
  expect(pdf).not.toContain('PRIVATE UNPUBLISHED RESUME PROJECT');
  expect(pdf).not.toContain('hidden_owner');

  expect((await page.reload())?.status()).toBe(200);
  await expect(preview.getByRole('heading', { name: 'Rahul Reji R.', exact: true })).toBeVisible();
  await expect(page).toHaveTitle('Résumé | Rahul Reji R.');
  await page.locator('.resume-document-header').screenshot({ path: test.info().outputPath('resume-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('.resume-document-header').screenshot({ path: test.info().outputPath('resume-mobile.png') });

  content.settings.resumeUrl = 'https://example.com/public-resume.pdf';
  await publishContent(content);
  await page.reload();
  const reference = page.locator('.resume-page').getByRole('link', { name: 'Open résumé', exact: true });
  await expect(reference).toHaveAttribute('href', 'https://example.com/public-resume.pdf');
  await expect(reference).toHaveAttribute('target', '_blank');
  await expect(reference).toHaveAttribute('rel', 'noopener noreferrer');
});
