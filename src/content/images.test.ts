import { expect, it } from 'vitest';
import { validateImageFile } from './images';
it('rejects executable image formats and oversized uploads before decoding', () => {
  expect(() =>
    validateImageFile(new File(['<svg />'], 'image.svg', { type: 'image/svg+xml' })),
  ).toThrow(/PNG, JPEG or WebP/);
  expect(() =>
    validateImageFile(
      new File([new Uint8Array(3 * 1024 * 1024 + 1)], 'image.png', { type: 'image/png' }),
    ),
  ).toThrow(/3 MB/);
  expect(() => validateImageFile(new File([], 'empty.png', { type: 'image/png' }))).toThrow(
    /empty/,
  );
  expect(() =>
    validateImageFile(new File([new Uint8Array(100)], 'image.png', { type: 'image/png' })),
  ).not.toThrow();
});
