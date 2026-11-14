import { HttpError } from '../http';

export interface ImageDimensions { width: number; height: number }
export type ImageMime = 'image/png' | 'image/jpeg' | 'image/webp';
export const maxMediaBytes = 1_000_000;

export function invalidImage(): never {
  throw new HttpError(400, 'INVALID_MEDIA', 'Upload a valid PNG, JPEG or WebP image, 64–5000 pixels per side and at most 16 million pixels.');
}

export function imageDimensions(width: number, height: number): ImageDimensions {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 64 || height < 64 || width > 5000 || height > 5000 || width * height > 16_000_000) invalidImage();
  return { width, height };
}

export const u16be = (bytes: Uint8Array, offset: number): number => (bytes[offset] << 8) | bytes[offset + 1];
export const u16le = (bytes: Uint8Array, offset: number): number => bytes[offset] | (bytes[offset + 1] << 8);
export const u24le = (bytes: Uint8Array, offset: number): number => bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
export const u32be = (bytes: Uint8Array, offset: number): number => ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
export const u32le = (bytes: Uint8Array, offset: number): number => (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
export const ascii = (bytes: Uint8Array, offset: number, length: number): string => String.fromCharCode(...bytes.subarray(offset, offset + length));
