import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
import { defaults } from '../src/content/defaults';
import { contentSchema } from '../src/content/schema';

async function expectFits(page: import('@playwright/test').Page, label: string) {
  await page.evaluate(() => document.fonts.ready);
  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
    offenders: [...document.querySelectorAll('main *,header *,footer *')]
      .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 12)
      .map((el) => ({
        tag: el.tagName,
        class: el.className,
        right: Math.round(el.getBoundingClientRect().right),
      })),
  }));
  expect(layout.width, `${label} ${JSON.stringify(layout)}`).toBeLessThanOrEqual(layout.viewport);
}

test('public routes are accessible and fit desktop, tablet and small phones', async ({ page }) => {
  // Includes 32 navigations and eight complete accessibility audits.
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      '/',
      '/about',
      '/skills',
      '/projects',
      '/projects/campusvoice',
      '/research',
      '/contact',
      '/missing-page',
    ]) {
      await page.goto(route);
      await expect(page.locator('main h1')).toBeVisible();
      await expectFits(page, `${width}px ${route}`);
      if (width === 390) {
        const audit = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();
        expect(audit.violations, route).toEqual([]);
      }
    }
  }
  expect(errors).toEqual([]);
});

test('schema-valid long edited content wraps on public routes', async ({ page, publishContent }) => {
  const content = structuredClone(defaults);
  content.profile.name = 'N'.repeat(100);
  content.profile.headline = 'H'.repeat(180);
  content.profile.location = 'L'.repeat(150);
  content.skills[0].category = 'C'.repeat(100);
  content.skills[0].items[0].name = 'S'.repeat(80);
  const project = content.projects[0];
  project.title = 'P'.repeat(150);
  project.category = 'C'.repeat(80);
  project.year = 'Y'.repeat(80);
  project.technologies = ['T'.repeat(60)];
  project.outcomes = [{ value: 'V'.repeat(80), label: 'L'.repeat(180), context: 'C'.repeat(400) }];
  content.research[0].title = 'R'.repeat(250);
  content.research[0].publication = 'P'.repeat(180);
  content.research[0].technologies = ['T'.repeat(60)];
  content.settings.contactHeading = 'C'.repeat(160);
  content.settings.footerNote = 'F'.repeat(250);
  content.profile.opportunities.heading = 'O'.repeat(160);
  content.profile.opportunities.careerInterests = ['R'.repeat(140)];
  content.profile.opportunities.preferredLocations = ['L'.repeat(80)];
  content.profile.opportunities.employmentTypes = ['E'.repeat(120)];
  contentSchema.parse(content);
  await publishContent(content);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      '/',
      '/about',
      '/skills',
      '/projects',
      '/projects/soho-suite',
      '/research',
      '/contact',
    ]) {
      await page.goto(route);
      await expect(page.locator('main h1')).toBeVisible();
      await expectFits(page, `${width}px ${route}`);
    }
  }
});

test('broken legacy browser data cannot change shared content and image failures have a fallback', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rahul-portfolio:content:v1', '{broken');
    localStorage.setItem('rahul-portfolio:last-valid:v1', '{also-broken');
  });
  await page.route('**/rahul-portrait.webp', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('main h1')).toContainText('Rahul Reji R.');
  await expect(page.locator('.portrait-fallback')).toHaveText('RR');
  await page.getByRole('link', { name: 'Explore projects', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Soho Suite', exact: true })).toBeVisible();
});

test('project filters expose empty results and recover', async ({ page }) => {
  await page.goto('/projects');
  await page.getByRole('button', { name: 'Applied AI', exact: true }).click();
  await expect(page.locator('.results-count')).toHaveText('1 project');
  await expect(page.getByRole('heading', { name: 'CampusVoice', exact: true })).toBeVisible();
  await page.getByLabel('Search projects').fill('no-project-matches');
  await expect(page.getByRole('heading', { name: 'No projects found' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.results-count')).toHaveText('3 projects');
});

test('keyboard skip link, public navigation and reduced motion remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('main h1')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toHaveCount(0);
  expect(
    await page.locator('.portrait-composition').evaluate((el) => getComputedStyle(el).transform),
  ).toBe('none');
});

test('skills disclosures work with keyboard and section navigation clears on other pages', async ({
  page,
}) => {
  await page.goto('/#skills');
  const group = page
    .locator('.skill-group')
    .filter({ has: page.locator('summary').filter({ hasText: 'Data engineering' }) });
  await expect(group.getByText('Databricks', { exact: true })).not.toBeVisible();
  await group.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(group.getByText('Databricks', { exact: true })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(group.getByText('Databricks', { exact: true })).not.toBeVisible();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Projects', exact: true })
    .click();
  await expect(page.locator('.desktop-nav nav a.active')).toHaveCount(1);
  await expect(page.locator('.desktop-nav nav a.active')).toHaveText('Projects');
});

test('header stays visible and follows the current section after a cold load', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(page.locator('main h1')).toBeVisible();
  await expect(nav.locator('a.active')).toHaveText('Home');
  for (const [id, label] of [
    ['work', 'Projects'],
    ['about', 'About'],
    ['skills', 'Skills'],
    ['research', 'Research'],
    ['opportunities', 'Contact'],
    ['contact', 'Contact'],
  ]) {
    await page.locator('#' + id).evaluate((element) => element.scrollIntoView());
    await expect(nav.locator('a.active')).toHaveCount(1);
    await expect(nav.locator('a.active')).toHaveText(label);
    await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute(
      'aria-current',
      'location',
    );
    expect((await page.locator('.site-header').boundingBox())?.y).toBe(0);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(nav.locator('a.active')).toHaveText('Home');
});

test('About and Skills are separate mobile pages with real content', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'About', exact: true })
    .click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('heading', { name: 'About me', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'SRM Institute of Science and Technology' }),
  ).toBeVisible();
  await expectFits(page, 'About mobile');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
  await expect(nav.getByRole('link', { name: 'About', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await nav.getByRole('link', { name: 'Skills', exact: true }).click();
  await expect(page).toHaveURL(/\/skills$/);
  await expect(page.getByRole('heading', { name: 'Skills & tools', exact: true })).toBeVisible();
  await expect(page.getByText('Databricks', { exact: true })).toBeVisible();
  await expect(page.getByText('PyTorch', { exact: true })).toBeVisible();
  await expectFits(page, 'Skills mobile');
});

test('compact projects expose case studies without decorative media on phones', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/projects');
  await expect(page.locator('.project-card')).toHaveCount(3);
  await expect(page.locator('main canvas, .project-cover, .project-media')).toHaveCount(0);
  const project = page.locator('.project-card').first();
  await expect(project.getByRole('heading', { name: 'Soho Suite' })).toBeVisible();
  await expect(project.getByText('Databricks', { exact: true })).toBeVisible();
  const bounds = await project.boundingBox();
  expect(bounds?.height).toBeLessThan(470);
  const action = project.getByRole('link', { name: 'Explore Soho Suite' });
  expect((await action.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await action.click();
  await expect(page).toHaveURL(/\/projects\/soho-suite$/);
  await expect(page.getByRole('heading', { name: 'The problem' })).toBeVisible();
  await expect(page.locator('main canvas, .detail-visual')).toHaveCount(0);
});

test('animated theme toggle persists and both theme palettes stay accessible', async ({ page }) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.public-site')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
  await page.reload();
  await expect(page.locator('.public-site')).toHaveAttribute('data-theme', 'light');
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/', '/about', '/skills', '/projects', '/research', '/contact']) {
      await page.goto(route);
      await expect(page.locator('main h1')).toBeVisible();
      await expectFits(page, 'light ' + width + ' ' + route);
      if (width === 390) {
        const audit = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();
        expect(audit.violations, route).toEqual([]);
      }
    }
  }
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('.public-site')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
});

test('configured social and telephone links are available on the public site', async ({ page, publishContent }) => {
  const content = structuredClone(defaults);
  content.profile.githubUrl = 'https://github.com/example';
  content.profile.linkedinUrl = 'https://www.linkedin.com/in/example/';
  content.profile.email = 'portfolio@example.com';
  content.profile.phone = '+1 (202) 555-0123';
  content.socialLinks = [
    { id: 'contact-github', platform: 'github', url: content.profile.githubUrl, enabled: true, order: 0 },
    { id: 'contact-linkedin', platform: 'linkedin', url: content.profile.linkedinUrl, enabled: true, order: 1 },
  ];
  await publishContent(content);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/contact');
  const links = page.locator('.contact-information .profile-links');
  await expect(links.getByRole('link', { name: 'GitHub', exact: true })).toHaveAttribute(
    'href',
    content.profile.githubUrl,
  );
  await expect(links.getByRole('link', { name: 'LinkedIn', exact: true })).toHaveAttribute(
    'href',
    content.profile.linkedinUrl,
  );
  await expect(
    links.getByRole('link', { name: content.profile.email, exact: true }),
  ).toHaveAttribute('href', 'mailto:portfolio@example.com');
  await expect(
    links.getByRole('link', { name: content.profile.phone, exact: true }),
  ).toHaveAttribute('href', 'tel:+12025550123');
  await expectFits(page, 'configured contacts phone');
});

test('opportunities show the supplied career preferences and can be hidden through content', async ({
  page, publishContent,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const section = page.locator('.opportunities-section');
  await expect(
    section.getByRole('heading', { name: 'Open to Opportunities', exact: true }),
  ).toBeVisible();
  await expect(section.locator('.career-interests li')).toHaveText(
    defaults.profile.opportunities.careerInterests,
  );
  await expect(section.locator('ol li')).toHaveText(['Bangalore', 'Kerala', 'Chennai']);
  await expect(section).toContainText('entry-level');
  await expect(section).toContainText('technology');
  await section.getByRole('link', { name: 'Discuss an opportunity' }).click();
  await expect(page).toHaveURL(/\/contact$/);
  const content = structuredClone(defaults);
  content.profile.opportunities.visible = false;
  await publishContent(content);
  await page.goto('/about');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'About me', exact: true })).toBeVisible();
  await expect(page.locator('.opportunities-section')).toHaveCount(0);
  await expectFits(page, 'hidden opportunities mobile');
});
