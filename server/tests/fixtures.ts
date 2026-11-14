import { pbkdf2Sync } from 'node:crypto';
import { crc32, deflateSync } from 'node:zlib';
import { defaults } from '../../src/content/defaults';
import type { Envelope } from '../../src/content/schema';

export const testPassword = 'owner-password-only-for-local-tests';
export const testHash = (password = testPassword): string => {
  const salt = Buffer.alloc(32, 31);
  const hash = pbkdf2Sync(password, salt, 100_000, 32, 'sha256');
  return `pbkdf2-sha256$100000$${salt.toString('base64')}$${hash.toString('base64')}`;
};

export function initialEnvelope(): Envelope {
  return {
    version: 1, revision: 0, updatedAt: '2026-11-14T00:00:00.000Z',
    draft: structuredClone(defaults), published: structuredClone(defaults), activity: [],
  };
}

export function pngBytes(width = 64, height = 64, rawOverride?: Uint8Array, compressedOverride?: Uint8Array): Uint8Array<ArrayBuffer> {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const invalidDimensions = width > 5000 || height > 5000 || width * height > 16_000_000;
  const raw = rawOverride ?? Buffer.alloc(invalidDimensions ? (64 * 3 + 1) * 64 : (width * 3 + 1) * height);
  const chunk = (type: string, data: Uint8Array): Buffer => {
    const tag = Buffer.from(type, 'ascii');
    const size = Buffer.alloc(4);
    size.writeUInt32BE(data.byteLength);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc32(Buffer.concat([tag, data])));
    return Buffer.concat([size, tag, data, checksum]);
  };
  return new Uint8Array(Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header),
    chunk('IDAT', compressedOverride ?? deflateSync(raw)), chunk('IEND', new Uint8Array()),
  ]));
}
