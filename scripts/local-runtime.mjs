import { spawn, spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const workspaceRoot = fileURLToPath(new URL('../', import.meta.url));
const wrangler = join(workspaceRoot, 'node_modules/wrangler/bin/wrangler.js');
export const localDatabaseId = '00000000-0000-0000-0000-000000000001';

export async function startLocalApp({ production = false, frontendPort = 5173, apiPort = 8788, persistTo = '.wrangler/state', workerCwd = workspaceRoot, https = false } = {}) {
  const persistence = resolve(workspaceRoot, persistTo);
  mkdirSync(persistence, { recursive: true });
  const runtimeEnv = { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_INCLUDE_PROCESS_ENV: 'false', WRANGLER_LOG_PATH: join(workspaceRoot, `.wrangler/logs/${frontendPort}.log`) };
  const migration = spawnSync(process.execPath, [wrangler, 'd1', 'migrations', 'apply', 'PORTFOLIO_DB', '--local', '--config', 'wrangler.local.jsonc', '--persist-to', persistence], { cwd: workspaceRoot, env: runtimeEnv, stdio: 'inherit', windowsHide: true });
  if (migration.status !== 0) throw new Error('Local D1 setup failed. No production database was accessed.');
  const origin = `${https ? 'https' : 'http'}://127.0.0.1:${frontendPort}`;
  const children = new Set();
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    for (const child of children) {
      if (process.platform === 'win32' && child.pid) spawnSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
      else child.kill('SIGTERM');
    }
  };
  const launch = (args, extraEnv = {}, cwd = workspaceRoot) => {
    const child = spawn(process.execPath, args, { cwd, env: { ...runtimeEnv, ...extraEnv }, stdio: 'inherit', windowsHide: true });
    children.add(child);
    child.on('error', () => { process.stderr.write('A local server could not start.\n'); stop(); process.exitCode = 1; });
    child.on('exit', (code) => { children.delete(child); if (!stopping) { stop(); process.exitCode = code ?? 1; } });
  };
  const workerPort = production ? frontendPort : apiPort;
  const workerArgs = [wrangler, 'pages', 'dev', join(workspaceRoot, production ? 'dist' : 'public'), '--ip', '127.0.0.1', '--port', String(workerPort), '--inspector-port', String(workerPort + 10000), '--persist-to', persistence, '--d1', `PORTFOLIO_DB=${localDatabaseId}`, '--binding', `APP_ORIGIN=${origin}`, '--log-level', 'warn'];
  if (https) workerArgs.push('--local-protocol', 'https');
  launch(workerArgs, {}, workerCwd);
  if (!production) launch([join(workspaceRoot, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(frontendPort), '--strictPort'], { PORTFOLIO_API_PROXY_TARGET: `http://127.0.0.1:${apiPort}` });
  process.on('SIGINT', () => { stop(); process.exitCode = 130; });
  process.on('SIGTERM', () => { stop(); process.exitCode = 0; });
  process.on('exit', stop);
  return { origin, stop };
}
