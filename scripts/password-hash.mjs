import { pbkdf2Sync, randomBytes } from 'node:crypto';

export function passwordHash(password) {
  if (typeof password !== 'string' || password.length < 16 || password.length > 256) throw new Error('Use a password of 16–256 characters.');
  const salt = randomBytes(32);
  const hash = pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  return `pbkdf2-sha256$100000$${salt.toString('base64')}$${hash.toString('base64')}`;
}
