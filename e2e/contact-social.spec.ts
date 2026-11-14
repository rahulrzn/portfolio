import { type Page } from '@playwright/test';
import { expect, signIn, test } from './fixtures';

async function saveDraft(page: Page) {
  const saved = page.waitForResponse(
    (response) => response.url().endsWith('/api/admin/content') && response.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  expect((await saved).status()).toBe(200);
  await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeEnabled();
}

async function publish(page: Page) {
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Publish now', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeDisabled();
}

test('published contact and social edits reach every public location and persist after refresh', async ({
  page,
  browser,
  baseURL,
}) => {
  const profiles = [
    ['github', 'GitHub', 'https://github.com/portfolio-owner'],
    ['linkedin', 'LinkedIn', 'https://www.linkedin.com/in/portfolio-owner'],
    ['instagram', 'Instagram', 'https://www.instagram.com/portfolio-owner'],
    ['x', 'X', 'https://x.com/portfolio-owner'],
  ];
  const visitorContext = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 },
  });
  try {
    const visitor = await visitorContext.newPage();
    await visitor.goto('/');
    await expect(visitor.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(visitor.locator('a[href="mailto:owner@example.com"]')).toHaveCount(0);

    await signIn(page, baseURL!);
    await page.goto('/admin/contact');
    await page.getByLabel('Email', { exact: true }).fill('owner@example.com');
    await page.getByLabel('Phone number', { exact: true }).fill('+91 98765 43210');
    await saveDraft(page);

    await page.goto('/admin/social');
    for (const [index, [platform, , url]] of profiles.entries()) {
      await page.getByRole('button', { name: 'Add social link', exact: true }).click();
      await page.getByLabel(`Platform ${index + 1}`, { exact: true }).selectOption(platform);
      await page.getByLabel(`Profile URL ${index + 1}`, { exact: true }).fill(url);
    }
    await saveDraft(page);
    await visitor.reload();
    await expect(visitor.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(visitor.locator('a[href="mailto:owner@example.com"]')).toHaveCount(0);
    await expect(visitor.getByRole('link', { name: 'GitHub', exact: true })).toHaveCount(0);

    await publish(page);
    await visitor.evaluate(() => window.dispatchEvent(new Event('focus')));
    for (const selector of ['#contact', '.hero-links', '.site-footer']) {
      const surface = visitor.locator(selector);
      await expect(surface.getByRole('link', { name: 'owner@example.com', exact: true })).toHaveAttribute(
        'href', 'mailto:owner@example.com',
      );
      await expect(surface.getByRole('link', { name: '+91 98765 43210', exact: true })).toHaveAttribute(
        'href', 'tel:+919876543210',
      );
      for (const [, label, url] of profiles) {
        await expect(surface.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', url);
      }
      expect(await surface.locator('.social-links a').allTextContents()).toEqual([
        'GitHub', 'LinkedIn', 'Instagram', 'X',
      ]);
    }
    await visitor.locator('#contact').screenshot({ path: test.info().outputPath('contact-desktop.png') });
    await visitor.setViewportSize({ width: 390, height: 844 });
    await expect(visitor.locator('#contact').getByRole('link', { name: 'owner@example.com', exact: true })).toBeVisible();
    expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await visitor.locator('#contact').screenshot({ path: test.info().outputPath('contact-mobile.png') });

    await visitor.reload();
    await expect(visitor.locator('.hero-links').getByRole('link', { name: 'GitHub', exact: true })).toBeVisible();
    await visitor.goto('/contact');
    const contact = visitor.locator('.contact-information');
    await expect(contact.getByRole('link', { name: 'owner@example.com', exact: true })).toBeVisible();
    await expect(contact.getByRole('link', { name: '+91 98765 43210', exact: true })).toBeVisible();
    for (const [, label, url] of profiles) {
      await expect(contact.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', url);
    }

    await page.getByLabel('Profile URL 1', { exact: true }).fill('https://github.com/updated-owner');
    await page.getByLabel('Show link 2 on the portfolio', { exact: true }).uncheck();
    await page.getByRole('button', { name: 'Remove social link 3', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Remove link', exact: true }).click();
    await page.getByRole('button', { name: 'Move up social link 3', exact: true }).click();
    await saveDraft(page);
    await publish(page);
    await visitor.reload();
    await expect(contact.getByRole('link', { name: 'GitHub', exact: true })).toHaveAttribute(
      'href', 'https://github.com/updated-owner',
    );
    await expect(visitor.getByRole('link', { name: 'LinkedIn', exact: true })).toHaveCount(0);
    await expect(visitor.getByRole('link', { name: 'Instagram', exact: true })).toHaveCount(0);
    expect(await contact.locator('.social-links a').allTextContents()).toEqual(['GitHub', 'X']);
  } finally {
    await visitorContext.close();
  }
});
