import type { Content } from '../src/content/schema';
import { HttpError } from './http';
import type { PortfolioDatabase } from './types';

export const mediaUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function mediaIds(...contents: Content[]): string[] {
  const images = contents.flatMap((content) => [content.profile.image, ...content.projects.map((project) => project.image)]);
  const ids = [...new Set(images.filter((image) => image.startsWith('image:')).map((image) => image.slice(6)))];
  if (ids.some((id) => !mediaUuidPattern.test(id))) missingMedia();
  return ids;
}

function missingMedia(): never {
  throw new HttpError(400, 'MEDIA_NOT_FOUND', 'A referenced image is unavailable. Upload the image again or import its portable backup.');
}

export async function assertMediaExist(db: PortfolioDatabase, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(', ');
  const rows = await db.prepare(`SELECT id FROM rr_portfolio_media WHERE id IN (${placeholders})`).bind(...ids).all<{ id: string }>();
  if (rows.results.length !== ids.length) missingMedia();
}
