import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function enter(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Session phrase', { exact: true }).fill('local-editor-test');
  await page.getByRole('button', { name: 'Open workspace' }).click();
  await expect(page.getByRole('heading', { name: 'Workspace overview' })).toBeVisible();
}
async function confirm(page: Page, label: string) {
  await page.getByRole('dialog').getByRole('button', { name: label, exact: true }).click();
}
test('development gate states its limits, validates and signs out', async ({ page }) => {
  await page.goto('/admin/login');
  await expect(page.getByText('This gate is not authentication.', { exact: false })).toBeVisible({
    timeout: 20000,
  });
  await page.getByLabel('Session phrase', { exact: true }).fill('short');
  await page.getByRole('button', { name: 'Open workspace' }).click();
  await expect(page.getByRole('alert')).toContainText('8');
  await enter(page);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Local development workspace' })).toBeVisible();
});
test('project CRUD isolates saved drafts and publishes edited live URLs', async ({ page }) => {
  await enter(page);
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await page.getByRole('button', { name: 'Add project', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Admin integration project');
  await page.getByLabel('Slug', { exact: true }).fill('admin-integration-project');
  await page
    .getByLabel('Description', { exact: true })
    .fill('A unique project to verify publication safety.');
  await page.getByLabel('Live Demo URL', { exact: true }).fill('https://example.com/first');
  await page.getByLabel('Status', { exact: true }).selectOption('published');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('saved');
  const publicTab = await page.context().newPage();
  await publicTab.goto('/projects');
  await expect(publicTab.getByText('Admin integration project', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Preview saved draft', exact: true }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Projects', exact: true }).click();
  await page
    .getByRole('article')
    .filter({ hasText: 'Admin integration project' })
    .getByRole('link', { name: 'Explore Admin integration project', exact: true })
    .click();
  await expect(
    page.locator('.project-detail').getByRole('link', { name: /Live Demo/i }),
  ).toHaveAttribute('href', 'https://example.com/first');
  await page.getByRole('link', { name: 'Back to workspace' }).click();
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('this browser');
  await confirm(page, 'Publish now');
  await publicTab.goto('/projects/admin-integration-project');
  await expect(publicTab.getByRole('link', { name: /Live Demo/i })).toHaveAttribute(
    'href',
    'https://example.com/first',
  );
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await page
    .getByRole('article')
    .filter({ hasText: 'Admin integration project' })
    .getByRole('button', { name: 'Edit', exact: true })
    .click();
  await page.getByLabel('Live Demo URL').fill('https://example.com/edited');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'Admin integration project (copy)',
  );
  await page.getByRole('button', { name: 'Cancel editing' }).click();
  const copy = page.getByRole('article').filter({ hasText: 'Admin integration project (copy)' });
  await copy.getByRole('button', { name: 'Delete', exact: true }).click();
  await confirm(page, 'Cancel');
  await expect(copy).toBeVisible();
  await copy.getByRole('button', { name: 'Delete', exact: true }).click();
  await confirm(page, 'Delete project');
  await expect(copy).toHaveCount(0);
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await confirm(page, 'Publish now');
  await publicTab.reload();
  await expect(publicTab.getByRole('link', { name: /Live Demo/i })).toHaveAttribute(
    'href',
    'https://example.com/edited',
  );
});
test('skills, research, settings and backups support mobile editing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enter(page);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Skills', exact: true }).click();
  await page.getByRole('button', { name: 'Add category' }).click();
  await page.getByLabel('Category 7', { exact: true }).fill('Admin test tools');
  await page.getByRole('button', { name: 'Add skill to category 7' }).click();
  await page.getByLabel('Skill 1 in category 7', { exact: true }).fill('Browser testing');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Research', exact: true }).click();
  await page.getByRole('button', { name: 'Add research', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Admin test research');
  await page.getByLabel('Publication URL').fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'http' })).toBeVisible();
  await page.getByLabel('Publication URL').fill('https://example.com/research');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Footer note').fill('Admin backup test');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const backup = await download;
  await expect(backup.suggestedFilename()).toMatch(/backup.*json/);
  await page
    .getByLabel('Import backup file')
    .setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{broken'),
    });
  await confirm(page, 'Import draft');
  await expect(page.getByRole('alert')).toContainText('JSON');
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
test('unsaved profile edits require discard confirmation and image failures are actionable', async ({
  page,
}) => {
  await enter(page);
  await page.getByRole('link', { name: 'Profile', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Unsaved test name');
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('unsaved');
  await confirm(page, 'Keep editing');
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Unsaved test name');
  await page
    .getByLabel('Upload image')
    .setInputFiles({
      name: 'invalid.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg/>'),
    });
  await expect(page.getByRole('alert')).toContainText('PNG');
  await page.getByRole('button', { name: 'Revert to saved' }).click();
  await confirm(page, 'Discard changes');
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Rahul Reji R.');
});
test('image-containing backups restore the draft without publishing and defaults need confirmation', async ({
  page,
}) => {
  await enter(page);
  await page.getByRole('link', { name: 'Profile', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Portable backup profile');
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#305070';
    context.fillRect(0, 0, 128, 128);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page
    .getByLabel('Upload image')
    .setInputFiles({
      name: 'portrait.png',
      mimeType: 'image/png',
      buffer: Buffer.from(png, 'base64'),
    });
  await expect(page.getByRole('status')).toContainText('Image added');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const saved = await download;
  const data = await readFile((await saved.path())!);
  expect(JSON.parse(data.toString()).images).toHaveLength(1);
  await page.getByRole('button', { name: 'Restore defaults', exact: true }).click();
  await confirm(page, 'Cancel');
  await page.getByRole('button', { name: 'Restore defaults', exact: true }).click();
  await confirm(page, 'Restore defaults');
  await page.getByRole('link', { name: 'Profile', exact: true }).click();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Rahul Reji R.');
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page
    .getByLabel('Import backup file')
    .setInputFiles({ name: 'portable-backup.json', mimeType: 'application/json', buffer: data });
  await confirm(page, 'Import draft');
  await expect(page.getByRole('status')).toContainText('Backup imported');
  await page.getByRole('link', { name: 'Profile', exact: true }).click();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Portable backup profile');
  await expect(page.getByRole('img', { name: 'Profile image preview' })).toHaveAttribute(
    'src',
    /^blob:/,
  );
  const publicTab = await page.context().newPage();
  await publicTab.goto('/');
  await expect(publicTab.getByText('Portable backup profile', { exact: false })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Local development workspace' })).toBeVisible();
  await page.getByLabel('Session phrase', { exact: true }).fill('new-editor-session');
  await page.getByRole('button', { name: 'Open workspace' }).click();
  await page.getByRole('link', { name: 'Profile', exact: true }).click();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Portable backup profile');
});
test('research deletion and saved draft reversion require confirmation', async ({ page }) => {
  await enter(page);
  await page.getByRole('link', { name: 'Research', exact: true }).click();
  await page.getByRole('button', { name: 'Add research', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Removable draft research');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel editing' }).click();
  const item = page.getByRole('article').filter({ hasText: 'Removable draft research' });
  await item.getByRole('button', { name: 'Delete', exact: true }).click();
  await confirm(page, 'Cancel');
  await expect(item).toBeVisible();
  await item.getByRole('button', { name: 'Delete', exact: true }).click();
  await confirm(page, 'Delete research');
  await expect(item).toHaveCount(0);
  await page.getByRole('link', { name: 'Profile', exact: true }).click();
  await page.getByLabel('Headline', { exact: true }).fill('Saved draft reversion check');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByRole('button', { name: 'Discard saved draft', exact: true }).click();
  await confirm(page, 'Cancel');
  await expect(page.getByLabel('Headline', { exact: true })).toHaveValue(
    'Saved draft reversion check',
  );
  await page.getByRole('button', { name: 'Discard saved draft', exact: true }).click();
  await confirm(page, 'Discard saved draft');
  await expect(page.getByRole('heading', { name: 'Workspace overview' })).toBeVisible();
  await page.getByRole('link', { name: 'Profile', exact: true }).click();
  await expect(page.getByLabel('Headline', { exact: true })).not.toHaveValue(
    'Saved draft reversion check',
  );
});
for (const editor of ['Profile', 'Skills'] as const) {
  test(`browser Back can keep or discard unsaved ${editor.toLowerCase()} text`, async ({
    page,
  }) => {
    await enter(page);
    await page.getByRole('link', { name: editor, exact: true }).click();
    const input = page.getByLabel(editor === 'Profile' ? 'Name' : 'Category 1', { exact: true });
    await input.fill('Preserve this unsaved browser Back text');
    await expect(page.locator('.admin-draft-status')).toContainText('Unsaved changes');
    const dialogs: string[] = [];
    const dismiss = async (dialog: import('@playwright/test').Dialog) => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    };
    page.on('dialog', dismiss);
    await page.goBack();
    await expect.poll(() => dialogs.length).toBe(1);
    await expect(page).toHaveURL(new RegExp(`/admin/${editor.toLowerCase()}$`));
    await expect(input).toHaveValue('Preserve this unsaved browser Back text');
    expect(dialogs[0]).toContain('unsaved');
    page.off('dialog', dismiss);
    page.once('dialog', (dialog) => dialog.accept());
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Workspace overview' })).toBeVisible();
    await page.getByRole('link', { name: editor, exact: true }).click();
    await expect(input).not.toHaveValue('Preserve this unsaved browser Back text');
  });
}
test('mobile drawer transfers focus, traps Tab, closes with Escape and restores focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enter(page);
  const trigger = page.getByRole('button', { name: 'Open navigation', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const close = page.getByRole('button', { name: 'Close navigation', exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  for (let index = 0; index < 12; index++) {
    await expect
      .poll(() => page.evaluate(() => !!document.activeElement?.closest('.admin-sidebar')))
      .toBe(true);
    await page.keyboard.press('Tab');
  }
  await page.keyboard.press('Escape');
  await expect(close).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
test('browser Forward keeps the dirty form when canceled and proceeds when accepted', async ({
  page,
}) => {
  await enter(page);
  await page.getByRole('link', { name: 'Profile', exact: true }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await page.goBack();
  const name = page.getByLabel('Name', { exact: true });
  await name.fill('Retain unsaved forward navigation text');
  await expect(page.locator('.admin-draft-status')).toContainText('Unsaved changes');
  const prompt = page.waitForEvent('dialog');
  const canceled = prompt.then(async (dialog) => {
    expect(dialog.message()).toContain('unsaved');
    await dialog.dismiss();
  });
  await page.goForward();
  await canceled;
  await expect(page).toHaveURL(/\/admin\/profile$/);
  await expect(name).toHaveValue('Retain unsaved forward navigation text');
  page.once('dialog', (dialog) => dialog.accept());
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
});
test('duplicating long valid slugs preserves a valid unique project route', async ({ page }) => {
  await enter(page);
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await page.getByRole('button', { name: 'Add project', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Long slug duplicate case');
  await page.getByLabel('Slug', { exact: true }).fill(`${'a'.repeat(63)}-bc`);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'Long slug duplicate case (copy)',
  );
  await expect(page.getByLabel('Slug', { exact: true })).toHaveValue(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  await page.getByRole('button', { name: 'Cancel editing', exact: true }).click();
  await page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'Long slug duplicate case', exact: true }) })
    .getByRole('button', { name: 'Duplicate', exact: true })
    .click();
  await expect(page.getByLabel('Slug', { exact: true })).toHaveValue(
    new RegExp(`^${'a'.repeat(63)}-copy-2$`),
  );
});
test('nested skill and outcome errors describe limits at the exact invalid field', async ({
  page,
}) => {
  await enter(page);
  await page.getByRole('link', { name: 'Skills', exact: true }).click();
  const category = page.getByLabel('Category 1', { exact: true });
  await category.fill('X'.repeat(101));
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(category).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('alert').filter({ hasText: /100/ })).toBeVisible();
  await page.getByLabel('Skill 1 in category 1', { exact: true }).fill('X'.repeat(81));
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByLabel('Skill 1 in category 1', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.getByRole('button', { name: 'Revert to saved', exact: true }).click();
  await confirm(page, 'Discard changes');
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await page
    .getByRole('article')
    .filter({ hasText: 'Soho Suite' })
    .getByRole('button', { name: 'Edit', exact: true })
    .click();
  const result = page.getByLabel('Result 1', { exact: true });
  await result.fill('X'.repeat(81));
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(result).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('alert').filter({ hasText: /80/ })).toBeVisible();
});
