import { phoneNumber } from './schema';

/** Return a dialable link only after validation, without format characters or extensions. */
export function phoneHref(value: unknown): string {
  const parsed = phoneNumber.safeParse(value);
  if (!parsed.success || !parsed.data) return '';
  return `tel:${parsed.data.replace(/[^0-9+]/g, '')}`;
}
