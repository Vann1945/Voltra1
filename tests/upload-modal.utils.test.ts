import { describe, expect, it } from 'vitest';
import { getCoverFileError, parseTags } from '../src/lib/uploadValidation';

describe('Upload modal helpers', () => {
  it('normalizes and de-duplicates tags while respecting the 20-tag limit', () => {
    const raw = Array.from({ length: 22 }, (_, index) => ` tag-${index % 3} `).join(',');
    expect(parseTags(raw)).toEqual(['tag-0', 'tag-1', 'tag-2']);
  });

  it('accepts supported cover images below the API size limit', () => {
    expect(getCoverFileError({ type: 'image/webp', size: 4 * 1024 * 1024 })).toBe('');
  });

  it('rejects unsupported cover types and oversized images before upload', () => {
    expect(getCoverFileError({ type: 'image/svg+xml', size: 100 })).toContain('JPG, PNG, or WebP');
    expect(getCoverFileError({ type: 'image/png', size: 4 * 1024 * 1024 + 1 })).toContain('smaller than 4 MB');
  });
});
