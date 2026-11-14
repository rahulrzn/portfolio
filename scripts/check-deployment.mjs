// Read-only checks. No login, credentials, migrations or API writes are used.
const defaultOrigin = 'https://rahul-portfolio-j94.pages.dev';
const args = process.argv.slice(2);
const usage = 'npm run deploy:check -- --url https://your-portfolio.pages.dev';

async function checkDeployment() {
  if (args.includes('--help')) { console.log(usage); return; }
  if (args.length && (args.length !== 2 || args[0] !== '--url')) throw new Error(usage);
  const target = new URL(args[1] || defaultOrigin);
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname);
  if ((target.protocol !== 'https:' && !(loopback && target.protocol === 'http:')) || target.username || target.password || target.search || target.hash || target.pathname !== '/') {
    throw new Error('Use an HTTPS website origin, or an HTTP loopback origin, without credentials or a path.');
  }
  const get = (path, headers = {}) => fetch(new URL(path, target), {
    method: 'GET', headers: { Accept: 'application/json', ...headers },
    cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  const json = async (path, status = 200) => {
    const response = await get(path);
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new Error(`${path} returned ${response.status} HTML or another non-JSON response. Deploy Pages Functions from the repository root; a static-only upload cannot provide the API.`);
    }
    if (response.status !== status) throw new Error(`${path} returned ${response.status}, expected ${status}. Check the D1 binding, applied migration and ADMIN_PASSWORD_HASH secret.`);
    return { response, value: await response.json() };
  };
  const checks = [
    ['Server readiness', async () => {
      const { value } = await json('/api/health');
      if (value.ready !== true) throw new Error('The server is not configured.');
    }],
    ['Anonymous authentication', async () => {
      const { value } = await json('/api/auth/session');
      if (value.authenticated !== false || value.csrfToken) throw new Error('An anonymous request received an unexpected session.');
    }],
    ['Protected admin reads', async () => { await json('/api/admin/content', 401); }],
    ['Published content and revalidation', async () => {
      const { response, value } = await json('/api/content');
      const content = value.content;
      if (!Number.isSafeInteger(value.revision) || value.revision < 0 || !content?.profile?.name ||
          !Array.isArray(content.projects) || !Array.isArray(content.skills) ||
          !Array.isArray(content.research) || !Array.isArray(content.socialLinks)) {
        throw new Error('The published content response is invalid.');
      }
      if ('draft' in value || 'activity' in value || content.projects.some((entry) => entry.status !== 'published') ||
          content.research.some((entry) => entry.status !== 'published') || content.socialLinks.some((link) => !link.enabled)) {
        throw new Error('The public API exposed unpublished content.');
      }
      const etag = response.headers.get('etag');
      if (!etag || !response.headers.get('cache-control')?.includes('must-revalidate')) throw new Error('Published content is missing its cache revalidation policy.');
      const unchanged = await get('/api/content', { 'If-None-Match': etag });
      if (unchanged.status !== 304) throw new Error('Unchanged content did not return HTTP 304.');
    }],
    ['Admin page privacy', async () => {
      const response = await get('/admin');
      if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/html') ||
          !response.headers.get('x-robots-tag')?.includes('noindex') || response.headers.get('cache-control') !== 'no-store') {
        throw new Error('The admin page is missing its private caching or indexing headers.');
      }
    }],
  ];
  const results = await Promise.allSettled(checks.map(async ([label, run]) => {
    await run();
    console.log(`PASS ${label}`);
  }));
  results.forEach((result, index) => {
    if (result.status === 'rejected') console.error(`FAIL ${checks[index][0]}: ${result.reason instanceof Error ? result.reason.message : 'Request failed.'}`);
  });
  if (results.some((result) => result.status === 'rejected')) process.exitCode = 1;
  else console.log(`Connected portfolio checks passed for ${target.origin}. Browser CRUD checks use isolated local databases.`);
}

checkDeployment().catch((error) => { console.error(error instanceof Error ? error.message : 'Deployment check failed.'); process.exitCode = 1; });
