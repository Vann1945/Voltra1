import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if (trimmed && trimmed.length <= 30) seen.add(trimmed);
  }
  return Array.from(seen).slice(0, 20);
}

export function formatTags(tags: string[] | undefined): string {
  return (tags || []).join(', ');
}

export function nowISO(): string {
  return new Date().toISOString();
}

export interface AddonUploadInput {
  title: string;
  description: string;
  projectClass: string;
  mainCategory: string;
  additionalCategory: string;
  tagsInput: string;
  imageUrl: string;
  imageUrls: string[];
  downloadUrl: string;
  demoUrl: string;
  license: string;
  distributionPref: string;
  unlisted: boolean;
  allowComments: boolean;
  socials: { platform: string; url: string }[];
}

const ALLOWED_STATUSES = ['pending', 'approved', 'rejected'];

function isSafeUrl(v: unknown): v is string {
  if (typeof v !== 'string' || v.length === 0 || v.length > 2000) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Validasi body PATCH /api/addons sebelum masuk ke query SQL. Ini lapisan
 * kedua (setelah parameterized query mencegah SQL injection) untuk mencegah:
 * - string sepanjang berkilo-kilo karakter membengkakkan DB / jadi vektor DoS,
 * - URL non-http(s) seperti `javascript:` disimpan lalu dirender sebagai link,
 * - field admin-only (status, isFeatured, dst) diselundupkan lewat tipe yang salah.
 * Mengembalikan pesan error, atau string kosong kalau valid.
 */
export function validateAddonPatch(body: Record<string, any>, isAdmin: boolean): string {
  if (isAdmin && 'status' in body && !ALLOWED_STATUSES.includes(body.status)) {
    return 'Invalid status.';
  }
  if (isAdmin && 'category' in body && (typeof body.category !== 'string' || body.category.length > 100)) {
    return 'Invalid category.';
  }
  if (isAdmin && 'tags' in body) {
    if (!Array.isArray(body.tags) || body.tags.length > 20 || body.tags.some((t: any) => typeof t !== 'string' || t.length > 30)) {
      return 'Invalid tags.';
    }
  }
  if ('title' in body && (typeof body.title !== 'string' || body.title.trim().length < 1 || body.title.length > 150)) {
    return 'Title must be 1-150 characters.';
  }
  if ('description' in body && (typeof body.description !== 'string' || body.description.length > 20000)) {
    return 'Description must be at most 20,000 characters.';
  }
  if ('downloadUrl' in body && !isSafeUrl(body.downloadUrl)) {
    return 'Invalid download URL.';
  }
  if ('demoUrl' in body && body.demoUrl !== '' && !isSafeUrl(body.demoUrl)) {
    return 'Invalid demo URL.';
  }
  return '';
}

export function buildAddonPayload(
  input: AddonUploadInput,
  addonId: string,
  authorId: string,
  authorName: string
) {
  return {
    id: addonId,
    title: input.title.trim(),
    description: input.description,
    category: input.mainCategory,
    imageUrl: input.imageUrl,
    imageUrls: input.imageUrls.length > 0 ? input.imageUrls : [input.imageUrl].filter(Boolean),
    downloadUrl: input.downloadUrl,
    demoUrl: input.demoUrl || '',
    authorId,
    authorName,
    createdAt: nowISO(),
    likesCount: 0,
    isFeatured: false,
    downloadsCount: 0,
    status: 'pending' as const,
    tags: parseTags(input.tagsInput),
    projectClass: input.projectClass,
    additionalCategory: input.additionalCategory || '',
    license: input.license,
    distributionPref: input.distributionPref,
    ratingCount: 0,
    averageRating: 0,
    unlisted: input.unlisted,
    allowComments: input.allowComments,
    socials: input.socials.filter(s => s.url.trim()),
  };
}
