'use client';

import React from 'react';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import css from 'highlight.js/lib/languages/css';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import bash from 'highlight.js/lib/languages/bash';

hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('css', css);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('bash', bash);

const DANGEROUS_CSS_PATTERN = /url\s*\(|expression\s*\(|behavior\s*:|@import|javascript\s*:|-moz-binding/i;

DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName === 'style' && DANGEROUS_CSS_PATTERN.test(data.attrValue)) {
    data.keepAttr = false;
  }
});

// Konten ini berasal dari deskripsi yang ditulis user lain (creator add-on),
// jadi setiap <a> harus dianggap tidak tepercaya. Tanpa rel="noopener
// noreferrer", link yang dibuka di tab baru bisa memanipulasi window.opener
// milik halaman asal (reverse tabnabbing) — celah phishing klasik.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer nofollow ugc');
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

const COLOR_PAPER = '#FAF9F6';
const COLOR_INK = '#010013';

const HLJS_THEME = {
  dark: {
    bg: COLOR_INK,
    base: COLOR_PAPER,
    comment: 'rgba(250, 249, 246, 0.45)',
    keyword: '#8ab4ff',
    string: '#9fd88f',
    number: '#f2c26b',
    title: '#7fd4d1',
    attr: '#e39ad0',
    builtin: '#f28b82',
  },
  light: {
    bg: COLOR_PAPER,
    base: COLOR_INK,
    comment: 'rgba(1, 0, 19, 0.5)',
    keyword: '#2451b0',
    string: '#227a4a',
    number: '#a8620a',
    title: '#0f7f7c',
    attr: '#a13b8f',
    builtin: '#b3261e',
  },
} as const;

function buildScopedCss(scopeClass: string, mode: 'dark' | 'light'): string {
  const t = HLJS_THEME[mode];
  const line = mode === 'dark' ? 'rgba(250, 249, 246, 0.35)' : 'rgba(1, 0, 19, 0.15)';
  const lineSoft = mode === 'dark' ? 'rgba(250, 249, 246, 0.30)' : 'rgba(1, 0, 19, 0.1)';

  return `
    .${scopeClass} pre { background: ${t.bg}; }
    .${scopeClass} code.hljs { background: transparent; color: ${t.base}; }
    .${scopeClass} .hljs-comment,
    .${scopeClass} .hljs-quote { color: ${t.comment}; font-style: italic; }
    .${scopeClass} .hljs-keyword,
    .${scopeClass} .hljs-selector-tag,
    .${scopeClass} .hljs-literal { color: ${t.keyword}; }
    .${scopeClass} .hljs-string,
    .${scopeClass} .hljs-addition { color: ${t.string}; }
    .${scopeClass} .hljs-number,
    .${scopeClass} .hljs-deletion { color: ${t.number}; }
    .${scopeClass} .hljs-title,
    .${scopeClass} .hljs-section,
    .${scopeClass} .hljs-name { color: ${t.title}; }
    .${scopeClass} .hljs-attr,
    .${scopeClass} .hljs-attribute,
    .${scopeClass} .hljs-symbol { color: ${t.attr}; }
    .${scopeClass} .hljs-built_in,
    .${scopeClass} .hljs-tag { color: ${t.builtin}; }

    .${scopeClass} hr { background-color: ${line}; }
    .${scopeClass} img { border-color: ${lineSoft}; }
    .${scopeClass} table,
    .${scopeClass} th,
    .${scopeClass} td { border-color: ${lineSoft}; }
  `;
}

export function RichTextContent({ html, className = '', isDarkMode = false }: { html: string; className?: string; isDarkMode?: boolean }) {
  const clean = React.useMemo(() => sanitizeHtml(html || ''), [html]);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scopeId = React.useId().replace(/[:]/g, '');
  const scopeClass = `rtc-${scopeId}`;
  const scopedCss = React.useMemo(
    () => buildScopedCss(scopeClass, isDarkMode ? 'dark' : 'light'),
    [scopeClass, isDarkMode]
  );

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const blocks = container.querySelectorAll('pre code');
    blocks.forEach((block) => {
      if (block instanceof HTMLElement) {
        delete block.dataset.highlighted;
        hljs.highlightElement(block);
      }
    });
  }, [clean]);

  return (
    <>
      <style>{scopedCss}</style>
      <div
        ref={containerRef}
        className={`${scopeClass} max-w-none text-sm text-ink-900 leading-relaxed font-normal
        [&_h1]:text-3xl [&_h1]:font-normal [&_h1]:my-4 [&_h1]:text-ink-900 [&_h1]:tracking-tight
        [&_h2]:text-2xl [&_h2]:font-normal [&_h2]:my-3 [&_h2]:text-ink-900 [&_h2]:tracking-tight
        [&_h3]:text-xl [&_h3]:font-normal [&_h3]:my-2 [&_h3]:text-ink-900
        [&_h4]:text-lg [&_h4]:font-normal [&_h4]:my-2 [&_h4]:text-ink-900
        [&_h5]:text-base [&_h5]:font-normal [&_h5]:my-2 [&_h5]:text-ink-900
        [&_h6]:text-sm [&_h6]:font-normal [&_h6]:my-2 [&_h6]:text-ink-900
        [&_p]:mb-3 [&_p]:leading-relaxed
        [&_a]:text-terracotta-soft [&_a]:underline [&_a]:font-medium
        [&_blockquote]:border-l-2 [&_blockquote]:border-terracotta [&_blockquote]:bg-terracotta/[0.06] [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:italic [&_blockquote]:text-ink-900
        [&_pre]:rounded-lg [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:font-mono [&_pre]:text-xs
        [&_code]:bg-terracotta/[0.15] [&_code]:px-1 [&_code]:rounded [&_code]:font-mono [&_code]:text-xs
        [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:rounded-none [&_pre_code]:block
        [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2
        [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2
        [&_hr]:h-px [&_hr]:border-0 [&_hr]:my-4
        [&_img]:my-3 [&_img]:border [&_img]:rounded-lg [&_img]:max-w-full
        [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:text-sm [&_table]:border [&_table]:rounded-lg
        [&_th]:border [&_th]:bg-terracotta/[0.12] [&_th]:p-2 [&_th]:text-left [&_th]:font-bold
        [&_td]:border [&_td]:p-2 ${className}`}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    </>
  );
}
