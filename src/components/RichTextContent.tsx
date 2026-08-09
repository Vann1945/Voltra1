import React from 'react';
import DOMPurify from 'dompurify';

const DANGEROUS_CSS_PATTERN = /url\s*\(|expression\s*\(|behavior\s*:|@import|javascript\s*:|-moz-binding/i;

DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName === 'style' && DANGEROUS_CSS_PATTERN.test(data.attrValue)) {
    data.keepAttr = false;
  }
});

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
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

export function RichTextContent({ html, className = '' }: { html: string; className?: string }) {
  const clean = React.useMemo(() => sanitizeHtml(html || ''), [html]);
  return (
    <div
      className={`max-w-none text-sm text-ink leading-relaxed font-normal
      [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:my-4 [&_h1]:text-ink [&_h1]:tracking-tight
      [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:my-3 [&_h2]:text-ink [&_h2]:tracking-tight
      [&_h3]:text-xl [&_h3]:font-bold [&_h3]:my-2 [&_h3]:text-ink
      [&_h4]:text-lg [&_h4]:font-bold [&_h4]:my-2 [&_h4]:text-ink
      [&_h5]:text-base [&_h5]:font-bold [&_h5]:my-2 [&_h5]:text-ink
      [&_h6]:text-sm [&_h6]:font-bold [&_h6]:my-2 [&_h6]:text-ink
      [&_p]:mb-3 [&_p]:leading-relaxed
      [&_a]:text-accent-soft [&_a]:underline [&_a]:font-medium
      [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:bg-accent/[0.06] [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:italic [&_blockquote]:text-ink
      [&_pre]:bg-ink [&_pre]:text-accent [&_pre]:border [&_pre]:border-ink [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:font-mono [&_pre]:text-xs
      [&_code]:bg-accent/[0.15] [&_code]:px-1 [&_code]:rounded [&_code]:font-mono [&_code]:text-xs
      [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 
      [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 
      [&_hr]:border-t [&_hr]:border-ink/15 [&_hr]:my-4
      [&_img]:my-3 [&_img]:border [&_img]:border-ink/10 [&_img]:rounded-lg [&_img]:max-w-full
      [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:text-sm [&_table]:border [&_table]:border-ink/10 [&_table]:rounded-lg
      [&_th]:border [&_th]:border-ink/10 [&_th]:bg-accent/[0.12] [&_th]:p-2 [&_th]:text-left [&_th]:font-bold
      [&_td]:border [&_td]:border-ink/10 [&_td]:p-2 ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
