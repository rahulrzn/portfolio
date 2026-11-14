import { imageDimensions, invalidImage, u16be, type ImageDimensions } from './common';

interface Component { id: number; table: number }

export function validateJpeg(bytes: Uint8Array): ImageDimensions {
  if (bytes.byteLength < 20 || bytes[0] !== 0xff || bytes[1] !== 0xd8) invalidImage();
  let offset = 2, dimensions: ImageDimensions | undefined, progressive = false, scanCount = 0, restartInterval = 0;
  const components: Component[] = [], quantizers = new Set<number>(), huffman = new Set<number>(), scanned = new Set<number>();
  while (offset < bytes.byteLength) {
    if (bytes[offset++] !== 0xff) invalidImage();
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9) {
      if (offset !== bytes.byteLength || !dimensions || !scanCount || components.some((component) => !scanned.has(component.id))) invalidImage();
      return dimensions;
    }
    if (!marker || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || offset + 2 > bytes.byteLength) invalidImage();
    const length = u16be(bytes, offset), end = offset + length;
    if (length < 2 || end > bytes.byteLength) invalidImage();
    const data = bytes.subarray(offset + 2, end);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (dimensions || data.byteLength < 6 || data[0] !== 8 || ![1, 3, 4].includes(data[5]) || data.byteLength !== 6 + 3 * data[5]) invalidImage();
      dimensions = imageDimensions(u16be(data, 3), u16be(data, 1));
      progressive = marker === 0xc2;
      for (let index = 0; index < data[5]; index++) {
        const id = data[6 + 3 * index], sampling = data[7 + 3 * index], table = data[8 + 3 * index];
        if (components.some((component) => component.id === id) || (sampling >>> 4) < 1 || (sampling >>> 4) > 4 || (sampling & 15) < 1 || (sampling & 15) > 4 || table > 3) invalidImage();
        components.push({ id, table });
      }
    } else if (marker === 0xdb) {
      let position = 0;
      while (position < data.byteLength) {
        const descriptor = data[position++], precision = descriptor >>> 4, table = descriptor & 15;
        const size = precision === 0 ? 64 : 128;
        if (precision > 1 || table > 3 || position + size > data.byteLength) invalidImage();
        for (let item = 0; item < 64; item++) {
          if (!(precision ? u16be(data, position + item * 2) : data[position + item])) invalidImage();
        }
        position += size;
        quantizers.add(table);
      }
      if (!position) invalidImage();
    } else if (marker === 0xc4) {
      let position = 0;
      while (position < data.byteLength) {
        const descriptor = data[position++];
        if ((descriptor >>> 4) > 1 || (descriptor & 15) > 3 || position + 16 > data.byteLength) invalidImage();
        let symbols = 0, available = 1;
        for (let bits = 0; bits < 16; bits++) {
          const count = data[position + bits];
          symbols += count;
          available = available * 2 - count;
          if (available < 0) invalidImage();
        }
        position += 16;
        if (!symbols || symbols > 256 || position + symbols > data.byteLength) invalidImage();
        if ((descriptor >>> 4) === 0 && data.subarray(position, position + symbols).some((symbol) => symbol > 11)) invalidImage();
        position += symbols;
        huffman.add(descriptor);
      }
      if (!position) invalidImage();
    } else if (marker === 0xdd) {
      if (data.byteLength !== 2) invalidImage();
      restartInterval = u16be(data, 0);
    } else if (marker === 0xda) {
      if (!dimensions || !data.byteLength || !data[0] || data[0] > components.length || data.byteLength !== 4 + 2 * data[0]) invalidImage();
      const start = data[1 + 2 * data[0]], stop = data[2 + 2 * data[0]], approximation = data[3 + 2 * data[0]];
      if (start > stop || stop > 63 || (approximation >>> 4) > 13 || (approximation & 15) > 13 ||
        (!progressive && (start !== 0 || stop !== 63 || approximation !== 0)) ||
        (progressive && ((start === 0 && stop !== 0) || (start > 0 && data[0] !== 1)))) invalidImage();
      const selected = new Set<number>();
      for (let index = 0; index < data[0]; index++) {
        const id = data[1 + 2 * index], tables = data[2 + 2 * index], dc = tables >>> 4, ac = tables & 15;
        const component = components.find((component) => component.id === id);
        if (!component || selected.has(id) || !quantizers.has(component.table) || dc > 3 || ac > 3 ||
          ((start === 0 && (approximation >>> 4) === 0) && !huffman.has(dc)) ||
          (stop > 0 && !huffman.has(16 | ac))) invalidImage();
        selected.add(id); scanned.add(id);
      }
      offset = end;
      let entropy = 0, restart = 0;
      while (offset < bytes.byteLength) {
        if (bytes[offset] !== 0xff) { offset++; entropy++; continue; }
        const prefix = offset++;
        while (bytes[offset] === 0xff) offset++;
        const next = bytes[offset];
        if (next === 0) { offset++; entropy++; continue; }
        if (next >= 0xd0 && next <= 0xd7) {
          if (!restartInterval || next !== 0xd0 + restart) invalidImage();
          restart = (restart + 1) % 8;
          offset++;
          continue;
        }
        offset = prefix;
        break;
      }
      if (!entropy || offset >= bytes.byteLength) invalidImage();
      scanCount++;
      continue;
    } else if (!(marker >= 0xe0 && marker <= 0xef) && marker !== 0xfe) {
      invalidImage();
    }
    offset = end;
  }
  invalidImage();
}
