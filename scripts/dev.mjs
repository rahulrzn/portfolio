import { startLocalApp } from './local-runtime.mjs';

const args = process.argv.slice(2);
const production = args.includes('--production');
const portIndex = args.indexOf('--port');
const frontendPort = portIndex >= 0 ? Number(args[portIndex + 1]) : production ? 4173 : 5173;
if (!Number.isInteger(frontendPort) || frontendPort < 1024 || frontendPort > 55000) throw new Error('Use a valid local port between 1024 and 55000.');
try {
  const { origin } = await startLocalApp({ production, frontendPort });
  process.stdout.write(`Portfolio and admin: ${origin}\nLocal D1 is separate from production. Configure admin sign-in with npm run admin:password.\n`);
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
