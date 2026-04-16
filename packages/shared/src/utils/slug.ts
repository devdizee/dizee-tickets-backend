import slugify from 'slugify';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789', 8);

export function generateSlug(text: string): string {
  return slugify(text, { lower: true, strict: true, trim: true });
}

export function generateUniqueSlug(text: string): string {
  const base = generateSlug(text);
  const suffix = nanoid(4).toLowerCase();
  return `${base}-${suffix}`;
}

export function generateShortCode(): string {
  return nanoid(8);
}
