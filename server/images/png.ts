import { ascii, imageDimensions, invalidImage, u32be, type ImageDimensions } from './common';

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function checksum(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

interface Scanlines { bytes: number; rows: number }

function scanlines(width: number, height: number, bitsPerPixel: number, interlaced: boolean): Scanlines[] {
  if (!interlaced) return [{ bytes: Math.ceil(width * bitsPerPixel / 8) + 1, rows: height }];
  const x = [0, 4, 0, 2, 0, 1, 0], y = [0, 0, 4, 0, 2, 0, 1];
  const dx = [8, 8, 4, 4, 2, 2, 1], dy = [8, 8, 8, 4, 4, 2, 2];
  return x.flatMap((start, pass) => {
    const columns = Math.max(0, Math.ceil((width - start) / dx[pass]));
    const rows = Math.max(0, Math.ceil((height - y[pass]) / dy[pass]));
    return columns && rows ? [{ bytes: Math.ceil(columns * bitsPerPixel / 8) + 1, rows }] : [];
  });
}

async function validatePixels(chunks: Uint8Array[], layout: Scanlines[]): Promise<void> {
  const expected = layout.reduce((total, pass) => total + pass.bytes * pass.rows, 0);
  const compressed = new Blob(chunks.map((chunk) => chunk.slice().buffer as ArrayBuffer));
  const reader = compressed.stream().pipeThrough(new DecompressionStream('deflate')).getReader();
  let received = 0, pass = 0, row = 0, column = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      if (received + part.value.byteLength > expected) invalidImage();
      let offset = 0;
      // Walk scanline boundaries rather than retaining the decoded bitmap.
      // Even a highly compressible large PNG keeps bounded stream memory.
      while (offset < part.value.byteLength) {
        if (!layout[pass] || (column === 0 && part.value[offset] > 4)) invalidImage();
        const length = Math.min(part.value.byteLength - offset, layout[pass].bytes - column);
        offset += length;
        received += length;
        column += length;
        if (column === layout[pass].bytes) {
          column = 0;
          row++;
          if (row === layout[pass].rows) { pass++; row = 0; }
        }
      }
    }
    if (received !== expected || pass !== layout.length || row || column) invalidImage();
  } catch {
    try { await reader.cancel(); } catch { /* The decoder may already be closed. */ }
    invalidImage();
  } finally { reader.releaseLock(); }
}

export async function validatePng(bytes: Uint8Array): Promise<ImageDimensions> {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.byteLength < 57 || !signature.every((byte, index) => bytes[index] === byte)) invalidImage();
  let offset = 8, dimensions: ImageDimensions | undefined, depth = 0, color = -1, interlaced = false;
  let palette = false, seenData = false, dataEnded = false, terminal = false;
  const chunks: Uint8Array[] = [];
  const depths: Record<number, number[]> = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
  const channels: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  while (offset + 12 <= bytes.byteLength) {
    const length = u32be(bytes, offset), end = offset + 8 + length;
    if (end + 4 > bytes.byteLength) invalidImage();
    const type = ascii(bytes, offset + 4, 4);
    if (!/^[A-Za-z]{4}$/.test(type) || type[2] !== type[2].toUpperCase() || checksum(bytes.subarray(offset + 4, end)) !== u32be(bytes, end)) invalidImage();
    const data = bytes.subarray(offset + 8, end);
    if (type === 'IHDR') {
      if (offset !== 8 || dimensions || length !== 13) invalidImage();
      dimensions = imageDimensions(u32be(data, 0), u32be(data, 4));
      depth = data[8]; color = data[9]; interlaced = data[12] === 1;
      if (!depths[color]?.includes(depth) || data[10] !== 0 || data[11] !== 0 || data[12] > 1) invalidImage();
    } else {
      if (!dimensions) invalidImage();
      if (type === 'PLTE') {
        if (palette || seenData || [0, 4].includes(color) || !length || length % 3 || length > 768 || (color === 3 && length > (1 << depth) * 3)) invalidImage();
        palette = true;
      } else if (type === 'IDAT') {
        if (dataEnded || (color === 3 && !palette)) invalidImage();
        seenData = true;
        if (length) chunks.push(data);
      } else if (type === 'IEND') {
        if (length || !seenData || !chunks.length || end + 4 !== bytes.byteLength) invalidImage();
        terminal = true;
      } else if (/^[A-Z]/.test(type) || ['acTL', 'fcTL', 'fdAT'].includes(type)) {
        invalidImage();
      }
      if (seenData && type !== 'IDAT') dataEnded = true;
    }
    offset = end + 4;
    if (terminal) break;
  }
  if (!terminal || !dimensions || offset !== bytes.byteLength) invalidImage();
  await validatePixels(chunks, scanlines(dimensions.width, dimensions.height, channels[color] * depth, interlaced));
  return dimensions;
}
