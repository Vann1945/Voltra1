import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'a', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'hr', 'img', 'video', 'source', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    '*': ['class', 'title'],
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    video: ['controls', 'poster', 'width', 'height'],
    source: ['src', 'type'],
    table: ['width'],
    th: ['width'],
    td: ['width'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    a: ['http', 'https', 'mailto'],
    img: ['http', 'https'],
    video: ['http', 'https'],
    source: ['http', 'https'],
  },
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    a: (_tagName, attribs) => ({
      tagName: 'a',
      attribs: {
        ...attribs,
        target: '_blank',
        rel: 'noopener noreferrer nofollow ugc',
      },
    }),
  },
};

/**
 * Sanitizes rich-text descriptions without importing jsdom. Keeping this
 * dependency-free from a DOM implementation is important for Vercel's
 * serverless runtime, where jsdom's CommonJS/ESM dependency chain can fail
 * during cold starts before the request handler runs.
 */
export function sanitizeDescriptionForStorage(html: string): string {
  if (!html) return '';
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}
