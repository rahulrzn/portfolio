import { emitKeypressEvents } from 'node:readline';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { passwordHash } from './password-hash.mjs';

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  process.stderr.write('Run npm run admin:password in an interactive terminal so your password can be entered privately.\n');
  process.exit(1);
}

async function readPassword(prompt) {
  process.stdout.write(prompt);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const done = () => { process.stdin.off('keypress', onKey); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); };
    const onKey = (text, key) => {
      if (key.ctrl && key.name === 'c') { done(); reject(new Error('Canceled.')); return; }
      if (key.name === 'return') { done(); resolve(value); return; }
      if (key.name === 'backspace') { if (value.length) { value = value.slice(0, -1); process.stdout.write('\b \b'); } return; }
      if (text && !key.ctrl && !key.meta && !/[\r\n\x00-\x1f]/.test(text) && value.length + text.length <= 256) { value += text; process.stdout.write('*'.repeat(text.length)); }
    };
    process.stdin.on('keypress', onKey);
  });
}

try {
  const password = await readPassword('New admin password (16–256 characters): ');
  const confirmation = await readPassword('Confirm password: ');
  if (password !== confirmation) throw new Error('Passwords did not match. No configuration changed.');
  const hash = passwordHash(password);
  let vars = '';
  try { vars = await readFile('.dev.vars', 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const line = `ADMIN_PASSWORD_HASH=${JSON.stringify(hash)}`;
  vars = /^ADMIN_PASSWORD_HASH=.*$/m.test(vars) ? vars.replace(/^ADMIN_PASSWORD_HASH=.*$/m, () => line) : `${vars.trimEnd()}\n${line}\n`;
  await mkdir('.wrangler', { recursive: true });
  await writeFile('.wrangler/admin-password.secret', `${hash}\n`, { mode: 0o600 });
  await writeFile('.dev.vars', vars, { mode: 0o600 });
  process.stdout.write('Password configuration saved privately to .dev.vars and .wrangler/admin-password.secret. Restart local development to use it.\n');
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Could not create password configuration.'}\n`);
  process.exitCode = 1;
}
