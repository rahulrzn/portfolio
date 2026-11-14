import { randomBytes } from 'node:crypto';
import { cp, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startLocalApp } from './local-runtime.mjs';
import { passwordHash } from './password-hash.mjs';

const production = process.argv.includes('--production');
const port = production ? 4173 : 5193;
const folder = `.wrangler/e2e/${port}`;
const app = `${folder}/app`;
await mkdir(folder, { recursive: true });
await mkdir(`${app}/src/content`, { recursive: true });
// Wrangler locates its Functions bundle relative to the nearest package root.
// Keep that root beside the isolated config and secrets, rather than letting it
// rediscover the real application's config when it starts the bundled worker.
await writeFile(`${app}/package.json`, JSON.stringify({ name: `portfolio-e2e-${port}`, private: true, type: 'module' }));
await writeFile(`${folder}/server.pid`, String(process.pid));
const password = randomBytes(32).toString('base64url');
await writeFile(`${folder}/credentials.json`, JSON.stringify({ password }), { mode: 0o600 });
await writeFile(`${app}/.dev.vars`, `ADMIN_PASSWORD_HASH=${JSON.stringify(passwordHash(password))}\n`, { mode: 0o600 });
await Promise.all([
  cp('functions', `${app}/functions`, { recursive: true }),
  cp('server', `${app}/server`, { recursive: true, filter: (source) => !source.includes('tests') }),
  ...['schema.ts', 'contracts.ts', 'defaults.ts'].map((file) => cp(`src/content/${file}`, `${app}/src/content/${file}`)),
]);
await writeFile(`${app}/wrangler.jsonc`, JSON.stringify({
  name: `portfolio-e2e-${port}`,
  pages_build_output_dir: resolve(production ? 'dist' : 'public'),
  compatibility_date: '2026-11-13',
  vars: { APP_ORIGIN: `${production ? 'https' : 'http'}://127.0.0.1:${port}` },
  d1_databases: [{ binding: 'PORTFOLIO_DB', database_name: `portfolio-e2e-${port}`, database_id: '00000000-0000-0000-0000-000000000001', migrations_dir: resolve('migrations') }],
}, null, 2));
try {
  await startLocalApp({ production, frontendPort: port, apiPort: 8793, persistTo: `.wrangler/e2e-state/${port}`, workerCwd: resolve(app), https: production });
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
