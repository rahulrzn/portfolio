import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { defaults } from '../src/content/defaults';
import { contentSchema, envelopeSchema, type Content } from '../src/content/schema';

export async function testPassword(baseURL: string): Promise<string> {
  const url = new URL(baseURL);
  if (url.hostname !== '127.0.0.1' || !['5193', '4173'].includes(url.port)) throw new Error('Test writes are restricted to the isolated loopback test servers.');
  const credentials = JSON.parse(await readFile(`.wrangler/e2e/${url.port}/credentials.json`, 'utf8')) as { password: string };
  return credentials.password;
}

export async function signIn(page: Page, baseURL: string) {
  await page.goto('/admin/login');
  const password = page.getByLabel('Password', { exact: true });
  await expect(password.or(page.locator('.admin-page-heading h1'))).toBeVisible();
  if (await password.isVisible()) {
    await password.fill(await testPassword(baseURL));
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  }
  await expect(page.locator('.admin-page-heading h1')).toBeVisible();
}

type Fixtures = { publishContent: (content: Content) => Promise<void>; baseline: void };

async function editorSession(request: APIRequestContext, origin: string) {
  const response = await request.post('/api/auth/login', { headers: { Origin: origin }, data: { password: await testPassword(origin) } });
  expect(response.status(), 'The isolated test admin should authenticate').toBe(200);
  const session = await response.json() as { csrfToken: string };
  return { Origin: origin, 'X-CSRF-Token': session.csrfToken };
}

export const test = base.extend<Fixtures>({
  publishContent: async ({ request, baseURL }, use) => {
    const origin = new URL(baseURL!).origin;
    const headers = await editorSession(request, origin);
    const publish = async (content: Content) => {
      const currentResponse = await request.get('/api/admin/content');
      expect(currentResponse.status()).toBe(200);
      const current = envelopeSchema.parse(await currentResponse.json());
      const save = await request.put('/api/admin/content', { headers, data: { content: contentSchema.parse(content), expectedRevision: current.revision, label: 'Isolated Playwright content' } });
      expect(save.status(), 'The isolated test draft should save').toBe(200);
      const draft = envelopeSchema.parse(await save.json());
      const published = await request.post('/api/admin/publish', { headers, data: { expectedRevision: draft.revision } });
      expect(published.status(), 'The isolated test draft should publish').toBe(200);
    };
    await use(publish);
    await request.post('/api/auth/logout', { headers, data: {} });
  },
  baseline: [async ({ publishContent }, use) => {
    await publishContent(structuredClone(defaults));
    try { await use(); } finally { await publishContent(structuredClone(defaults)); }
  }, { auto: true }],
});

export { expect };
