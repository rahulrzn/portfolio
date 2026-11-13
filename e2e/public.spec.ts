import { test, expect } from '@playwright/test';
test('public home presents the real identity and project content without login', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Rahul Reji R.');
  await expect(
    page.getByRole('heading', { name: 'Software, with intention.', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('img', { name: 'Portrait of Rahul Reji R.' })).toBeVisible();
  await page.getByRole('link', { name: 'Explore projects', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Selected projects', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Explore Soho Suite' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Soho Suite' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Live Demo', exact: true })).toHaveAttribute(
    'href',
    'https://soho-suite.pages.dev/',
  );
  await expect(page.getByRole('link', { name: 'GitHub', exact: true })).toHaveCount(0);
});
test('contact validates, missing email is honest, and the clean resume downloads', async ({
  page,
}) => {
  await page.goto('/contact');
  await page.getByRole('button', { name: 'Prepare email' }).click();
  await expect(page.getByText('Enter your name.')).toBeVisible();
  await page.getByLabel('Name', { exact: true }).fill('Test Visitor');
  await page.getByLabel('Email', { exact: true }).fill('visitor@example.com');
  await page.getByLabel('Subject', { exact: true }).fill('A project conversation');
  await page
    .getByLabel('Message', { exact: true })
    .fill('I would like to discuss your engineering work.');
  await page.getByRole('button', { name: 'Prepare email' }).click();
  await expect(page.getByRole('status')).toContainText('No contact email');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download résumé', exact: true }).first().click();
  expect((await download).suggestedFilename()).toContain('resume');
});
test('mobile menu, responsive layouts and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'Projects', exact: true })
    .click();
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Selected projects',
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
