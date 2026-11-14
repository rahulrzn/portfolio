import { ascii, imageDimensions, invalidImage, u16le, u24le, u32le, type ImageDimensions } from './common';

export function validateWebp(bytes: Uint8Array): ImageDimensions {
  if (bytes.byteLength < 30 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP' || u32le(bytes, 4) + 8 !== bytes.byteLength) invalidImage();
  let offset = 12, canvas: ImageDimensions | undefined, image: ImageDimensions | undefined, flags = 0, alpha = false;
  const seen = new Set<string>();
  while (offset + 8 <= bytes.byteLength) {
    const type = ascii(bytes, offset, 4), length = u32le(bytes, offset + 4), end = offset + 8 + length;
    if (end + (length & 1) > bytes.byteLength || ((length & 1) && bytes[end] !== 0)) invalidImage();
    const data = bytes.subarray(offset + 8, end);
    if (['VP8X', 'VP8 ', 'VP8L', 'ALPH', 'ICCP', 'EXIF', 'XMP '].includes(type) && seen.has(type)) invalidImage();
    if (type === 'VP8X') {
      if (offset !== 12 || length !== 10 || (data[0] & 0xc1) || data[1] || data[2] || data[3] || (data[0] & 2)) invalidImage();
      flags = data[0];
      canvas = imageDimensions(u24le(data, 4) + 1, u24le(data, 7) + 1);
    } else if (type === 'VP8 ') {
      const frame = u24le(data, 0), partition = frame >>> 5;
      if (image || length < 20 || (frame & 1) || ((frame >>> 1) & 7) > 3 || !(frame & 16) || partition < 3 || partition + 3 > length ||
        data[3] !== 0x9d || data[4] !== 1 || data[5] !== 0x2a || (u16le(data, 6) & 0xc000) || (u16le(data, 8) & 0xc000)) invalidImage();
      image = imageDimensions(u16le(data, 6), u16le(data, 8));
    } else if (type === 'VP8L') {
      if (image || alpha || length < 10 || data[0] !== 0x2f) invalidImage();
      const bits = u32le(data, 1);
      if (bits >>> 29) invalidImage();
      image = imageDimensions((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
    } else if (type === 'ALPH') {
      if (!canvas || !(flags & 16) || image || length < 2 || (data[0] & 0xc0) || (data[0] & 3) > 1 || ((data[0] >>> 4) & 3) > 1) invalidImage();
      if ((data[0] & 3) === 0 && length !== 1 + canvas.width * canvas.height) invalidImage();
      alpha = true;
    } else if (['ANIM', 'ANMF'].includes(type)) {
      invalidImage();
    } else if (['ICCP', 'EXIF', 'XMP '].includes(type)) {
      if (!canvas || !length || (type === 'ICCP' && image)) invalidImage();
    }
    seen.add(type);
    offset = end + (length & 1);
  }
  if (offset !== bytes.byteLength || !image || (canvas && (canvas.width !== image.width || canvas.height !== image.height)) ||
    (!!(flags & 32) !== seen.has('ICCP')) || (!!(flags & 8) !== seen.has('EXIF')) || (!!(flags & 4) !== seen.has('XMP ')) ||
    (seen.has('VP8 ') && !!(flags & 16) !== alpha)) invalidImage();
  return image;
}
