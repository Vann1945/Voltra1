export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const MAX_COVER_IMAGES = 20;
export const MAX_COVER_IMAGE_BYTES = 4 * 1024 * 1024;

export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if (trimmed && trimmed.length <= 30) seen.add(trimmed);
  }
  return Array.from(seen).slice(0, 20);
}

export function getCoverFileError(file: Pick<File, 'type' | 'size'>): string {
  if (!IMAGE_ACCEPT.split(',').includes(file.type)) return 'Cover images must be JPG, PNG, or WebP files.';
  if (file.size > MAX_COVER_IMAGE_BYTES) return 'Each cover image must be smaller than 4 MB.';
  return '';
}
