import { apiRequest } from './api';
import { apiConfig } from '../config';

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_SHARED_IMAGE_BYTES = 1_000_000;
const MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export function validateImageFile(file: Blob) {
  if (!MIME_TYPES.includes(file.type))
    throw new Error(
      'Choose a PNG, JPEG or WebP image. SVG and animated formats are not supported.',
    );
  if (!file.size) throw new Error('The image file is empty.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Choose an image smaller than 3 MB.');
}
export async function decodeImage(file: Blob): Promise<HTMLImageElement> {
  validateImageFile(file);
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      const timeout = setTimeout(
        () => reject(new Error('The image could not be decoded. Choose another image.')),
        8000,
      );
      img.onload = () => {
        clearTimeout(timeout);
        if (
          img.naturalWidth < 64 ||
          img.naturalHeight < 64 ||
          img.naturalWidth > 5000 ||
          img.naturalHeight > 5000 ||
          img.naturalWidth * img.naturalHeight > 16_000_000
        )
          reject(
            new Error('Image dimensions must be 64–5000 pixels, with at most 16 million pixels.'),
          );
        else resolve(img);
      };
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('This file is not a readable image.'));
      };
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
let database: Promise<IDBDatabase> | undefined;
function openDatabase(): Promise<IDBDatabase> {
  if (!database)
    database = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) {
        reject(new Error('Image storage is unavailable in this browser.'));
        return;
      }
      const request = indexedDB.open('rahul-portfolio-images', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('images');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        database = undefined;
        reject(new Error('Image storage could not be opened.'));
      };
      request.onblocked = () => {
        database = undefined;
        reject(new Error('Close other portfolio tabs and try again.'));
      };
    });
  return database;
}
async function transaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', mode);
    const request = operation(tx.objectStore('images'));
    let result: T;
    request.onsuccess = () => {
      result = request.result;
    };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () =>
      reject(new Error('Image storage failed. Free browser storage and try again.'));
    tx.onabort = () => reject(new Error('Image storage was interrupted.'));
  });
}
// Read only: previous browser uploads remain available for an explicit portable migration.
export const legacyImageStore = {
  async get(id: string): Promise<Blob | null> {
    try {
      return (await transaction('readonly', (store) => store.get(id))) ?? null;
    } catch {
      return null;
    }
  },
};

async function optimizeImage(file: Blob, image: HTMLImageElement): Promise<Blob> {
  if (file.size <= MAX_SHARED_IMAGE_BYTES) return file;
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not optimize the image. Choose an image smaller than 1 MB.');
  for (let attempt = 0; attempt < 4; attempt++) {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const optimized = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86 - attempt * 0.1));
    if (optimized && optimized.size <= MAX_SHARED_IMAGE_BYTES) return optimized;
    canvas.width = Math.max(64, Math.round(canvas.width * 0.8));
    canvas.height = Math.max(64, Math.round(canvas.height * 0.8));
  }
  throw new Error('The optimized image is still too large. Choose a smaller image.');
}

export function mediaUrl(reference: string): string {
  return `${apiConfig.baseUrl}/api/media/${encodeURIComponent(reference.replace(/^image:/, ''))}`;
}

export const imageStore = {
  async put(file: Blob): Promise<string> {
    const image = await decodeImage(file);
    const upload = await optimizeImage(file, image);
    const response = await apiRequest<{ id: string }>('/api/admin/media', { method: 'POST', body: upload, headers: { 'Content-Type': upload.type } });
    if (!/^image:[a-zA-Z0-9-]{8,80}$/.test(response.id)) throw new Error('The server did not return a valid image reference. Try again.');
    return response.id;
  },
  async get(id: string): Promise<Blob | null> {
    try {
      const response = await fetch(mediaUrl(id), { credentials: 'same-origin', signal: AbortSignal.timeout(15000) });
      if (!response.ok || !MIME_TYPES.includes(response.headers.get('Content-Type') ?? '')) return null;
      return await response.blob();
    } catch { return null; }
  },
  async remove(id: string): Promise<void> {
    await apiRequest(`/api/admin/media/${encodeURIComponent(id.replace(/^image:/, ''))}`, { method: 'DELETE' });
  },
};
