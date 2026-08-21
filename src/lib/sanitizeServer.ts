import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Client-side (RichTextContent.tsx) sudah mem-sanitasi HTML sebelum
// dirender — tapi itu SATU-SATUNYA lapisan yang ada sebelumnya, dan hanya
// jalan kalau request datang lewat UI kita. Siapapun yang memanggil
// /api/addons langsung (curl, script, API klien lain) bisa menyimpan HTML
// mentah tanpa pernah lewat sanitizer. Data itu memang tetap disanitasi lagi
// saat dirender di RichTextContent, tapi menyimpan HTML berbahaya mentah di
// database masih berisiko dipakai di jalur lain di masa depan (RSS, email
// digest, ekspor admin, dll) yang mungkin lupa mem-sanitasi ulang.
// Defense-in-depth: sanitasi juga di server, persis sebelum disimpan.
const jsdomWindow = new JSDOM('').window;
const serverPurify: typeof DOMPurify = (DOMPurify as unknown as (w: unknown) => typeof DOMPurify)(jsdomWindow);

const DANGEROUS_CSS_PATTERN = /url\s*\(|expression\s*\(|behavior\s*:|@import|javascript\s*:|-moz-binding/i;

serverPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName === 'style' && DANGEROUS_CSS_PATTERN.test(data.attrValue)) {
    data.keepAttr = false;
  }
});

serverPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer nofollow ugc');
  }
});

export function sanitizeDescriptionForStorage(html: string): string {
  if (!html) return '';
  return serverPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'a', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'hr', 'img', 'video', 'source', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'target', 'rel', 'class', 'style', 'width', 'height',
      'controls', 'poster', 'type',
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}
