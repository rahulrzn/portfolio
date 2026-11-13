import { z } from 'zod';
import { envelopeSchema, imageReference, type Envelope } from './schema';
import { imageStore, decodeImage } from './images';
import type { ContentRepository } from './repository';
const portableSchema = z
  .object({
    format: z.literal('rahul-portfolio-backup'),
    version: z.literal(1),
    content: envelopeSchema,
    images: z
      .array(
        z
          .object({
            id: imageReference.refine((value) => value.startsWith('image:')),
            type: z.enum(['image/png', 'image/jpeg', 'image/webp']),
            data: z
              .string()
              .max(4_200_000)
              .regex(/^[A-Za-z0-9+/]*={0,2}$/),
          })
          .strict(),
      )
      .max(122),
  })
  .strict();
const references = (data: Envelope) =>
  new Set(
    [
      data.draft.profile.image,
      ...data.draft.projects.map((p) => p.image),
      data.published.profile.image,
      ...data.published.projects.map((p) => p.image),
    ].filter((ref) => ref.startsWith('image:')),
  );
export async function exportBackup(repository: ContentRepository): Promise<string> {
  const content = envelopeSchema.parse(JSON.parse(repository.exportSnapshot()));
  const images = [];
  let bytes = 0;
  for (const id of references(content)) {
    const blob = await imageStore.get(id);
    if (!blob)
      throw new Error(
        'A saved image is unavailable, so a complete backup could not be created. Enable image storage or remove the missing image reference from draft and published content, then try again.',
      );
    bytes += blob.size;
    if (bytes > 20 * 1024 * 1024)
      throw new Error(
        'Images exceed the 20 MB backup limit. Remove unused large images and try again.',
      );
    const buffer = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < buffer.length; i += 8192)
      binary += String.fromCharCode(...buffer.subarray(i, i + 8192));
    images.push({ id, type: blob.type, data: btoa(binary) });
  }
  return JSON.stringify(
    portableSchema.parse({ format: 'rahul-portfolio-backup', version: 1, content, images }),
    null,
    2,
  );
}
export async function importBackup(raw: string, repository: ContentRepository): Promise<void> {
  if (raw.length > 32 * 1024 * 1024) throw new Error('Backup must be smaller than 32 MB.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('This file is not valid JSON. No content was changed.');
  }
  // Plain versioned content exports remain supported; imports always stage the draft.
  if (typeof parsed === 'object' && parsed !== null && !('format' in parsed)) {
    repository.importSnapshot(raw);
    return;
  }
  const result = portableSchema.safeParse(parsed);
  if (!result.success)
    throw new Error(
      'This backup has invalid content, images or an unsupported version. No content was changed.',
    );
  if (new Set(result.data.images.map((image) => image.id)).size !== result.data.images.length)
    throw new Error('The backup contains duplicate image IDs.');
  const blobs: { id: string; blob: Blob }[] = [];
  let total = 0;
  for (const image of result.data.images) {
    const decoded = atob(image.data);
    const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
    total += bytes.length;
    if (total > 20 * 1024 * 1024) throw new Error('Backup images exceed 20 MB.');
    const blob = new Blob([bytes], { type: image.type });
    await decodeImage(blob);
    blobs.push({ id: image.id, blob });
  }
  const replacements = new Map<string, string>();
  const staged: string[] = [];
  const draftReferences = new Set(
    [
      result.data.content.draft.profile.image,
      ...result.data.content.draft.projects.map((project) => project.image),
    ].filter((ref) => ref.startsWith('image:')),
  );
  if ([...draftReferences].some((ref) => !blobs.some((image) => image.id === ref)))
    throw new Error(
      'The backup is missing an image used by its draft. Restore the image before importing.',
    );
  try {
    for (const image of blobs) {
      if (!draftReferences.has(image.id)) continue;
      const ref = await imageStore.put(image.blob);
      staged.push(ref);
      replacements.set(image.id, ref);
    }
    const data = result.data.content;
    data.draft.profile.image =
      replacements.get(data.draft.profile.image) ?? data.draft.profile.image;
    for (const project of data.draft.projects)
      project.image = replacements.get(project.image) ?? project.image;
    repository.importSnapshot(JSON.stringify(data));
  } catch (error) {
    await Promise.allSettled(staged.map((id) => imageStore.remove(id)));
    throw error;
  }
}
export function downloadFile(text: string, filename: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
