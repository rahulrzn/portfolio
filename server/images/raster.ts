import { HttpError } from '../http';
import type { ImageDimensions, ImageMime } from './common';
import { validateJpeg } from './jpeg';
import { validatePng } from './png';
import { validateWebp } from './webp';

export function imageMime(header: string | null): ImageMime {
  const mime = header?.split(';')[0].trim().toLowerCase();
  if (mime !== 'image/png' && mime !== 'image/jpeg' && mime !== 'image/webp') {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Upload a PNG, JPEG or WebP image.');
  }
  return mime;
}

export async function validateRaster(bytes: Uint8Array, mime: ImageMime): Promise<ImageDimensions> {
  if (mime === 'image/png') return validatePng(bytes);
  if (mime === 'image/jpeg') return validateJpeg(bytes);
  return validateWebp(bytes);
}
