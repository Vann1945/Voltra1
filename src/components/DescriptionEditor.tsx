import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight, MoreHorizontal, List, ListOrdered,
  Indent, Outdent, Image as ImageIcon, Code, Quote, Minus,
  Code2, X, Undo2, Redo2, ChevronDown, Baseline, Highlighter, Ban, Palette, Check,
  Video, Lock, Unlock, UploadCloud, Table as TableIcon
} from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import { sanitizeHtml } from './RichTextContent';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export { RichTextContent } from './RichTextContent';

interface DescriptionEditorProps {
  value: string;
  onChange: (html: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
  placeholder?: string;
  required?: boolean;
}

type ModalType = 'link' | 'image' | 'media' | 'table' | 'code' | 'source' | 'customColor' | null;
type EditorMode = 'wysiwyg' | 'markdown';

const CODE_LANGUAGES = ['HTML/XML', 'JavaScript', 'JSON', 'CSS', 'Python', 'Java', 'Bash', 'Plain Text'];

const FORMAT_BLOCKS = [
  { value: 'P', label: 'Paragraph', preview: 'text-xs font-normal' },
  { value: 'H1', label: 'Heading 1', preview: 'text-xl font-semibold' },
  { value: 'H2', label: 'Heading 2', preview: 'text-lg font-normal' },
  { value: 'H3', label: 'Heading 3', preview: 'text-base font-normal' },
  { value: 'H4', label: 'Heading 4', preview: 'text-sm font-normal' },
  { value: 'H5', label: 'Heading 5', preview: 'text-xs font-normal' },
  { value: 'H6', label: 'Heading 6', preview: 'text-[11px] font-normal' },
  { value: 'PRE', label: 'Preformatted', preview: 'text-xs font-mono border border-parchment-border rounded px-2 py-1 inline-block' },
];

const PALETTE_COLORS = [
  '#2dbb63', '#F5CC04', '#CE9ED3', '#8a5cf6', '#4aa8ff',
  '#22b8a3', '#f0a63c', '#E2434B', '#8732E0', '#3aa0e0',
  '#d8dde3', '#FAF9F6', '#8f97a3', '#4b5563', '#010013'
];

const UnorderedListDiscSVG = () => (
  <svg viewBox="0 0 32 32" className="w-6 h-6 text-current fill-current">
    <circle cx="6" cy="9" r="2.5" />
    <circle cx="6" cy="16" r="2.5" />
    <circle cx="6" cy="23" r="2.5" />
    <rect x="12" y="7.5" width="16" height="3" rx="1.5" />
    <rect x="12" y="14.5" width="16" height="3" rx="1.5" />
    <rect x="12" y="21.5" width="16" height="3" rx="1.5" />
  </svg>
);

const UnorderedListCircleSVG = () => (
  <svg viewBox="0 0 32 32" className="w-6 h-6 text-current fill-current">
    <circle cx="6" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="6" cy="16" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="6" cy="23" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <rect x="12" y="7.5" width="16" height="3" rx="1.5" />
    <rect x="12" y="14.5" width="16" height="3" rx="1.5" />
    <rect x="12" y="21.5" width="16" height="3" rx="1.5" />
  </svg>
);

const UnorderedListSquareSVG = () => (
  <svg viewBox="0 0 32 32" className="w-6 h-6 text-current fill-current">
    <rect x="4" y="7" width="4" height="4" rx="0.5" />
    <rect x="4" y="14" width="4" height="4" rx="0.5" />
    <rect x="4" y="21" width="4" height="4" rx="0.5" />
    <rect x="12" y="7.5" width="16" height="3" rx="1.5" />
    <rect x="12" y="14.5" width="16" height="3" rx="1.5" />
    <rect x="12" y="21.5" width="16" height="3" rx="1.5" />
  </svg>
);

const OrderedListDecimalSVG = () => (
  <svg viewBox="0 0 36 32" className="w-7 h-6 text-current fill-current">
    <text x="1" y="11" fontSize="9" fontWeight="700" fontFamily="sans-serif">1.</text>
    <text x="1" y="19" fontSize="9" fontWeight="700" fontFamily="sans-serif">2.</text>
    <text x="1" y="27" fontSize="9" fontWeight="700" fontFamily="sans-serif">3.</text>
    <rect x="15" y="7" width="18" height="3" rx="1.5" />
    <rect x="15" y="15" width="18" height="3" rx="1.5" />
    <rect x="15" y="23" width="18" height="3" rx="1.5" />
  </svg>
);

const OrderedListLowerAlphaSVG = () => (
  <svg viewBox="0 0 36 32" className="w-7 h-6 text-current fill-current">
    <text x="1" y="11" fontSize="9" fontWeight="700" fontFamily="sans-serif">a.</text>
    <text x="1" y="19" fontSize="9" fontWeight="700" fontFamily="sans-serif">b.</text>
    <text x="1" y="27" fontSize="9" fontWeight="700" fontFamily="sans-serif">c.</text>
    <rect x="15" y="7" width="18" height="3" rx="1.5" />
    <rect x="15" y="15" width="18" height="3" rx="1.5" />
    <rect x="15" y="23" width="18" height="3" rx="1.5" />
  </svg>
);

const OrderedListLowerGreekSVG = () => (
  <svg viewBox="0 0 36 32" className="w-7 h-6 text-current fill-current">
    <text x="1" y="11" fontSize="9" fontWeight="700" fontFamily="sans-serif">α.</text>
    <text x="1" y="19" fontSize="9" fontWeight="700" fontFamily="sans-serif">β.</text>
    <text x="1" y="27" fontSize="9" fontWeight="700" fontFamily="sans-serif">γ.</text>
    <rect x="15" y="7" width="18" height="3" rx="1.5" />
    <rect x="15" y="15" width="18" height="3" rx="1.5" />
    <rect x="15" y="23" width="18" height="3" rx="1.5" />
  </svg>
);

const OrderedListLowerRomanSVG = () => (
  <svg viewBox="0 0 38 32" className="w-7 h-6 text-current fill-current">
    <text x="0" y="11" fontSize="8" fontWeight="700" fontFamily="sans-serif">i.</text>
    <text x="0" y="19" fontSize="8" fontWeight="700" fontFamily="sans-serif">ii.</text>
    <text x="0" y="27" fontSize="8" fontWeight="700" fontFamily="sans-serif">iii.</text>
    <rect x="17" y="7" width="18" height="3" rx="1.5" />
    <rect x="17" y="15" width="18" height="3" rx="1.5" />
    <rect x="17" y="23" width="18" height="3" rx="1.5" />
  </svg>
);

const OrderedListUpperAlphaSVG = () => (
  <svg viewBox="0 0 36 32" className="w-7 h-6 text-current fill-current">
    <text x="1" y="11" fontSize="9" fontWeight="700" fontFamily="sans-serif">A.</text>
    <text x="1" y="19" fontSize="9" fontWeight="700" fontFamily="sans-serif">B.</text>
    <text x="1" y="27" fontSize="9" fontWeight="700" fontFamily="sans-serif">C.</text>
    <rect x="15" y="7" width="18" height="3" rx="1.5" />
    <rect x="15" y="15" width="18" height="3" rx="1.5" />
    <rect x="15" y="23" width="18" height="3" rx="1.5" />
  </svg>
);

const OrderedListUpperRomanSVG = () => (
  <svg viewBox="0 0 38 32" className="w-7 h-6 text-current fill-current">
    <text x="0" y="11" fontSize="8" fontWeight="700" fontFamily="sans-serif">I.</text>
    <text x="0" y="19" fontSize="8" fontWeight="700" fontFamily="sans-serif">II.</text>
    <text x="0" y="27" fontSize="8" fontWeight="700" fontFamily="sans-serif">III.</text>
    <rect x="17" y="7" width="18" height="3" rx="1.5" />
    <rect x="17" y="15" width="18" height="3" rx="1.5" />
    <rect x="17" y="23" width="18" height="3" rx="1.5" />
  </svg>
);

const ClearFormatSVG = (_props: { size?: number }) => (
  <svg viewBox="0 0 20 20" className="w-[15px] h-[15px] text-current" fill="none" stroke="currentColor">
    <path d="M4 4h9M8.3 4v11.5" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M3 17L17 3" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export function DescriptionEditor({ value, onChange, onUploadImage,  placeholder, required }: DescriptionEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const editingLinkRef = useRef<HTMLAnchorElement | null>(null);
  const [mode, setMode] = useState<EditorMode>('wysiwyg');
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  useBodyScrollLock(activeModal !== null);
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showBgColorMenu, setShowBgColorMenu] = useState(false);
  const [showUnorderedListMenu, setShowUnorderedListMenu] = useState(false);
  const [showOrderedListMenu, setShowOrderedListMenu] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [currentFormatTag, setCurrentFormatTag] = useState('P');
  const [currentUlStyle, setCurrentUlStyle] = useState<string | null>(null);
  const [currentOlStyle, setCurrentOlStyle] = useState<string | null>(null);

  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false, strike: false });

  const pendingSelectionTextRef = useRef('');

  const [linkPopup, setLinkPopup] = useState<{ top: number; left: number; mode: 'new' | 'edit' } | null>(null);

  const [tableRows, setTableRows] = useState('3');
  const [tableCols, setTableCols] = useState('3');
  const moreToolsBtnRef = useRef<HTMLButtonElement>(null);
  const [moreToolsOpenRight, setMoreToolsOpenRight] = useState(false);

  const toggleMoreTools = () => {
    const next = !showMoreTools;
    closeAllMenus();
    if (next && moreToolsBtnRef.current) {
      const rect = moreToolsBtnRef.current.getBoundingClientRect();
      setMoreToolsOpenRight(rect.left < window.innerWidth * 0.4);
    }
    setShowMoreTools(next);
  };

  const closeAllMenus = () => {
    setShowMoreTools(false);
    setShowFormatMenu(false);
    setShowColorMenu(false);
    setShowBgColorMenu(false);
    setShowUnorderedListMenu(false);
    setShowOrderedListMenu(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        closeAllMenus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const [currentColor, setCurrentColor] = useState('#FAF9F6');
  const [currentBgColor, setCurrentBgColor] = useState<string | null>(null);
  const [customColorTarget, setCustomColorTarget] = useState<'text' | 'bg'>('text');
  const [customR, setCustomR] = useState('153');
  const [customG, setCustomG] = useState('153');
  const [customB, setCustomB] = useState('153');
  const [customHex, setCustomHex] = useState('999999');

  const [sourceText, setSourceText] = useState(value);
  const [wordCount, setWordCount] = useState(0);

  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkTarget, setLinkTarget] = useState<'_blank' | '_self'>('_blank');

  const [imageTab, setImageTab] = useState<'general' | 'upload'>('general');
  const [imageSrc, setImageSrc] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageWidth, setImageWidth] = useState('');
  const [imageHeight, setImageHeight] = useState('');
  const [imageAspectLocked, setImageAspectLocked] = useState(true);
  const [imageNaturalRatio, setImageNaturalRatio] = useState<number | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const [mediaTab, setMediaTab] = useState<'general' | 'embed' | 'advanced'>('general');
  const [mediaSrc, setMediaSrc] = useState('');
  const [mediaWidth, setMediaWidth] = useState('');
  const [mediaHeight, setMediaHeight] = useState('');
  const [mediaAspectLocked, setMediaAspectLocked] = useState(true);
  const [mediaEmbed, setMediaEmbed] = useState('');
  const [mediaAltSrc, setMediaAltSrc] = useState('');
  const [mediaPoster, setMediaPoster] = useState('');

  useEffect(() => {
    if (!imageSrc.trim()) { setImageNaturalRatio(null); return; }
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (cancelled || !img.naturalWidth || !img.naturalHeight) return;
      setImageNaturalRatio(img.naturalWidth / img.naturalHeight);
      setImageWidth((w) => w || String(img.naturalWidth));
      setImageHeight((h) => h || String(img.naturalHeight));
    };
    img.src = imageSrc.trim();
    return () => { cancelled = true; };
  }, [imageSrc]);

  const handleImageWidthChange = (val: string) => {
    setImageWidth(val);
    if (imageAspectLocked && imageNaturalRatio && val.trim()) {
      const w = parseFloat(val);
      if (!isNaN(w) && w > 0) setImageHeight(String(Math.round(w / imageNaturalRatio)));
    }
  };
  const handleImageHeightChange = (val: string) => {
    setImageHeight(val);
    if (imageAspectLocked && imageNaturalRatio && val.trim()) {
      const h = parseFloat(val);
      if (!isNaN(h) && h > 0) setImageWidth(String(Math.round(h * imageNaturalRatio)));
    }
  };

  const handleMediaWidthChange = (val: string) => {
    const prevW = parseFloat(mediaWidth);
    const prevH = parseFloat(mediaHeight);
    setMediaWidth(val);
    if (mediaAspectLocked && prevW > 0 && prevH > 0 && val.trim()) {
      const w = parseFloat(val);
      if (!isNaN(w)) setMediaHeight(String(Math.round((w * prevH) / prevW)));
    }
  };
  const handleMediaHeightChange = (val: string) => {
    const prevW = parseFloat(mediaWidth);
    const prevH = parseFloat(mediaHeight);
    setMediaHeight(val);
    if (mediaAspectLocked && prevW > 0 && prevH > 0 && val.trim()) {
      const h = parseFloat(val);
      if (!isNaN(h)) setMediaWidth(String(Math.round((h * prevW) / prevH)));
    }
  };

  const [codeLanguage, setCodeLanguage] = useState(CODE_LANGUAGES[0]);
  const [codeText, setCodeText] = useState('');

  const [mdText, setMdText] = useState('');

  const convertToWebp = (file: File, maxDimension = 1600, quality = 0.82): Promise<File> => {
    return new Promise(resolve => {
      if (!file.type.startsWith('image/')) { resolve(file); return; }
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          const scale = maxDimension / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          blob => {
            if (!blob) { resolve(file); return; }
            const newName = file.name.replace(/\.[^.]+$/, '') + '.webp';
            resolve(new File([blob], newName, { type: 'image/webp' }));
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
      img.src = objectUrl;
    });
  };

  const uploadToImgbb = async (file: File): Promise<string> => {
    const imageBase64: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });

    const res = await fetch('/api/upload-image', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    });
    const data = await res.json();
    if (!res.ok || !data?.url) {
      throw new Error(data?.error || 'Image upload failed.');
    }
    return data.url as string;
  };

  const handleImageFile = async (file: File) => {
    setImageUploading(true);
    try {
      const webpFile = await convertToWebp(file);
      const url = onUploadImage ? await onUploadImage(webpFile) : await uploadToImgbb(webpFile);
      setImageSrc(url);
      setImageTab('general');
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setImageUploading(false);
    }
  };

  useEffect(() => {
    if (editorRef.current) {
      if (!editorRef.current.innerHTML) {
        editorRef.current.innerHTML = value || '';
      }
      const text = editorRef.current.textContent?.trim() || '';
      setWordCount(text ? text.split(/\s+/).length : 0);
    }
  }, []);

  const emitChange = useCallback(() => {
    if (editorRef.current) {
      onChange(sanitizeHtml(editorRef.current.innerHTML));
      const text = editorRef.current.textContent?.trim() || '';
      setWordCount(text ? text.split(/\s+/).length : 0);
    }
  }, [onChange]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0);
  };

  const restoreSelection = () => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const exec = (command: string, arg?: string) => {
    editorRef.current?.focus();
    if (command === 'formatBlock' && arg) {
      document.execCommand('formatBlock', false, `<${arg.toLowerCase()}>`);
      setCurrentFormatTag(arg.toUpperCase());
    } else {
      document.execCommand(command, false, arg);
    }
    emitChange();
  };

  const findAncestorTag = (startNode: Node | null, tagName: string): HTMLElement | null => {
    let node: Node | null = startNode;
    while (node && node !== editorRef.current) {
      if (node.nodeType === 1 && (node as HTMLElement).tagName === tagName) return node as HTMLElement;
      node = node.parentNode;
    }
    return null;
  };

  const applyListStyle = (type: 'ul' | 'ol', styleType: string) => {
    editorRef.current?.focus();
    const targetTag = type === 'ul' ? 'UL' : 'OL';
    const sel = window.getSelection();
    const existingList = sel && sel.rangeCount > 0 ? findAncestorTag(sel.getRangeAt(0).startContainer, targetTag) : null;

    if (existingList) {
      if (existingList.style.listStyleType === styleType) {
        document.execCommand(type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList', false);
      } else {
        existingList.style.listStyleType = styleType;
      }
      if (type === 'ul') setCurrentUlStyle(existingList.style.listStyleType === styleType ? null : styleType);
      else setCurrentOlStyle(existingList.style.listStyleType === styleType ? null : styleType);
    } else {
      document.execCommand(type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList', false);
      const sel2 = window.getSelection();
      const newList = sel2 && sel2.rangeCount > 0 ? findAncestorTag(sel2.getRangeAt(0).startContainer, targetTag) : null;
      if (newList) newList.style.listStyleType = styleType;
      if (type === 'ul') setCurrentUlStyle(styleType); else setCurrentOlStyle(styleType);
    }

    setShowUnorderedListMenu(false);
    setShowOrderedListMenu(false);
    emitChange();
  };

  const openModal = (type: ModalType) => {
    saveSelection();
    setShowMoreTools(false);
    setLinkPopup(null);
    if (type === 'link') {
      editingLinkRef.current = null;
      const selectedText = window.getSelection()?.toString().trim() || pendingSelectionTextRef.current;
      setLinkUrl(''); setLinkText(selectedText);
      setLinkTitle(''); setLinkTarget('_blank');
      pendingSelectionTextRef.current = '';
    }
    if (type === 'image') {
      setImageTab('general'); setImageSrc(''); setImageAlt('');
      setImageWidth(''); setImageHeight(''); setImageAspectLocked(true); setImageNaturalRatio(null);
    }
    if (type === 'media') {
      setMediaTab('general'); setMediaSrc(''); setMediaWidth(''); setMediaHeight('');
      setMediaAspectLocked(true); setMediaEmbed(''); setMediaAltSrc(''); setMediaPoster('');
    }
    if (type === 'table') { setTableRows('3'); setTableCols('3'); }
    if (type === 'code') { setCodeLanguage(CODE_LANGUAGES[0]); setCodeText(''); }
    if (type === 'source') { setSourceText(editorRef.current?.innerHTML || ''); }
    setActiveModal(type);
  };

  const openLinkEditPopup = (anchor: HTMLAnchorElement) => {
    saveSelection();
    editingLinkRef.current = anchor;
    setLinkUrl(anchor.getAttribute('href') || '');
    setLinkText(anchor.textContent || '');
    setLinkTitle(anchor.getAttribute('title') || '');
    setLinkTarget(anchor.getAttribute('target') === '_blank' ? '_blank' : '_self');
    setLinkPopup(null);
    setActiveModal('link');
  };

  const closeModal = () => setActiveModal(null);

  const insertHtmlAtSelection = (html: string) => {
    restoreSelection();
    document.execCommand('insertHTML', false, html);
    emitChange();
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      const editorEl = editorRef.current;
      const sel = window.getSelection();
      if (!editorEl || !sel || sel.rangeCount === 0 || !sel.anchorNode || !editorEl.contains(sel.anchorNode)) {
        return;
      }
      const startNode = sel.getRangeAt(0).startContainer;

      const blockTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE'];
      let found: HTMLElement | null = null;
      for (const tag of blockTags) {
        found = findAncestorTag(startNode, tag);
        if (found) break;
      }
      setCurrentFormatTag(found ? found.tagName : 'P');

      try {
        setActiveFormats({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strike: document.queryCommandState('strikeThrough'),
        });
      } catch {}

      if (!sel.isCollapsed && sel.toString().trim()) {
        pendingSelectionTextRef.current = sel.toString();
      }

      const ulEl = findAncestorTag(startNode, 'UL');
      setCurrentUlStyle(ulEl ? ulEl.style.listStyleType || 'disc' : null);
      const olEl = findAncestorTag(startNode, 'OL');
      setCurrentOlStyle(olEl ? olEl.style.listStyleType || 'decimal' : null);

      const anchorEl = findAncestorTag(startNode, 'A') as HTMLAnchorElement | null;
      const editorRect = editorEl.getBoundingClientRect();
      if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect();
        editingLinkRef.current = anchorEl;
        setLinkPopup({ top: rect.bottom - editorRect.top + 4, left: Math.max(0, rect.left - editorRect.left), mode: 'edit' });
      } else if (!sel.isCollapsed && sel.toString().trim()) {
        editingLinkRef.current = null;
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        if (rect.width || rect.height) {
          setLinkPopup({ top: rect.bottom - editorRect.top + 4, left: Math.max(0, rect.left - editorRect.left), mode: 'new' });
        } else {
          setLinkPopup(null);
        }
      } else {
        setLinkPopup(null);
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const currentFormatLabel = FORMAT_BLOCKS.find((f) => f.value === currentFormatTag)?.label || 'Paragraph';

  return (
    <div data-required={required} className=" border border-parchment-border rounded-lg bg-parchment-raised overflow-visible relative">
      <div className="flex items-center justify-end border-b border-ink-900 bg-parchment-raised px-3 py-1.5">
        <div className="w-32">
          <CustomSelect
            value={mode === 'markdown' ? 'Markdown' : 'WYSIWYG'}
            options={['WYSIWYG', 'Markdown']}
            onChange={(val) => setMode(val === 'Markdown' ? 'markdown' : 'wysiwyg')}
          />
        </div>
      </div>

      {mode === 'wysiwyg' ? (
        <>
          <div ref={toolbarRef} className="flex flex-wrap items-center gap-1 border-b border-ink-900 bg-parchment-raised px-2.5 py-2 relative">
            <ToolbarBtn icon={Undo2} label="Undo" onClick={() => exec('undo')} />
            <ToolbarBtn icon={Redo2} label="Redo" onClick={() => exec('redo')} />
            <div className="w-px h-5 bg-terracotta/30 mx-1" />

            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { const next = !showFormatMenu; closeAllMenus(); setShowFormatMenu(next); }}
                className="flex items-center gap-1  px-2.5 py-1.5 text-xs font-medium text-ink-900 hover:bg-terracotta/40 hover:text-ink-900 transition-colors"
              >
                {currentFormatLabel} <ChevronDown size={12} />
              </button>
              {showFormatMenu && (
                <div className="absolute left-0 z-[130] mt-1 w-44 rounded-lg bg-parchment-raised p-1 shadow-card">
                  {FORMAT_BLOCKS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { exec('formatBlock', f.value); setShowFormatMenu(false); }}
                      className={`flex w-full items-center justify-between gap-2  px-3 py-1.5 text-left transition-colors ${currentFormatTag === f.value ? 'bg-terracotta/30 text-ink-900' : 'text-ink-900 hover:bg-terracotta/40 hover:text-ink-900'}`}
                    >
                      <span className={f.preview}>{f.label}</span>
                      {currentFormatTag === f.value && <Check size={12} className="shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-terracotta/30 mx-1" />

            <ToolbarBtn icon={Bold} label="Bold" onClick={() => exec('bold')} active={activeFormats.bold} />
            <ToolbarBtn icon={Italic} label="Italic" onClick={() => exec('italic')} active={activeFormats.italic} />
            <ToolbarBtn icon={Underline} label="Underline" onClick={() => exec('underline')} active={activeFormats.underline} />
            <ToolbarBtn icon={Strikethrough} label="Strikethrough" onClick={() => exec('strikeThrough')} active={activeFormats.strike} />
            <ToolbarBtn icon={ClearFormatSVG} label="Clear formatting" onClick={() => exec('removeFormat')} />

            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { const next = !showColorMenu; closeAllMenus(); setShowColorMenu(next); }}
                className={`flex items-center gap-1  p-1.5 transition-colors ${showColorMenu || currentColor !== '#FAF9F6' ? 'bg-parchment-raised/20 text-ink-900' : 'text-ink-900 hover:bg-terracotta/40 hover:text-ink-900'}`}
                title="Text Color"
              >
                <div className="flex flex-col items-center">
                  <Baseline size={15} />
                  <div className="h-0.5 w-4 rounded-full mt-0.5" style={{ backgroundColor: currentColor }} />
                </div>
                <ChevronDown size={10} />
              </button>
              {showColorMenu && (
              <div className="absolute left-0 z-[130] mt-1 w-48 rounded-lg bg-parchment-raised p-2 shadow-card">
                  <div className="grid grid-cols-5 gap-1.5 mb-2">
                    {PALETTE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setCurrentColor(c); exec('foreColor', c); setShowColorMenu(false); }}
                        style={{ backgroundColor: c }}
                        className="h-6 w-6 rounded-full flex items-center justify-center border border-parchment-border hover:scale-110 transition-transform"
                      >
                        {currentColor === c && <Check size={12} className={c === '#FAF9F6' ? 'text-ink-900' : 'text-ink-900'} />}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-ink-900 pt-1.5">
                    <button type="button" onClick={() => { setCurrentColor('#FAF9F6'); exec('foreColor', '#FAF9F6'); setShowColorMenu(false); }} className="p-1 text-ink-900/50 hover:text-ink-900"><Ban size={14} /></button>
                    <button type="button" onClick={() => { setShowColorMenu(false); setCustomColorTarget('text'); setActiveModal('customColor'); }} className="p-1 text-ink-900/50 hover:text-ink-900"><Palette size={14} /></button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { const next = !showBgColorMenu; closeAllMenus(); setShowBgColorMenu(next); }}
                className={`flex items-center gap-1  p-1.5 transition-colors ${showBgColorMenu || currentBgColor ? 'bg-parchment-raised/20 text-ink-900' : 'text-ink-900 hover:bg-terracotta/40 hover:text-ink-900'}`}
                title="Background Color"
              >
                <div className="flex flex-col items-center">
                  <Highlighter size={15} />
                  <div className="h-0.5 w-4 rounded-full mt-0.5" style={{ backgroundColor: currentBgColor || 'transparent', border: currentBgColor ? 'none' : '1px solid currentColor' }} />
                </div>
                <ChevronDown size={10} />
              </button>
              {showBgColorMenu && (
              <div className="absolute left-0 z-[130] mt-1 w-48 rounded-lg bg-parchment-raised p-2 shadow-card">
                  <div className="grid grid-cols-5 gap-1.5 mb-2">
                    {PALETTE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setCurrentBgColor(c); exec('hiliteColor', c); setShowBgColorMenu(false); }}
                        style={{ backgroundColor: c }}
                        className="h-6 w-6 rounded-full flex items-center justify-center border border-parchment-border hover:scale-110 transition-transform"
                      >
                        {currentBgColor === c && <Check size={12} className={c === '#FAF9F6' ? 'text-ink-900' : 'text-ink-900'} />}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-ink-900 pt-1.5">
                    <button type="button" onClick={() => { setCurrentBgColor(null); exec('hiliteColor', 'transparent'); setShowBgColorMenu(false); }} className="p-1 text-ink-900/50 hover:text-ink-900"><Ban size={14} /></button>
                    <button type="button" onClick={() => { setShowBgColorMenu(false); setCustomColorTarget('bg'); setActiveModal('customColor'); }} className="p-1 text-ink-900/50 hover:text-ink-900"><Palette size={14} /></button>
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-terracotta/30 mx-1" />

            <ToolbarBtn icon={LinkIcon} label="Insert Link" onClick={() => openModal('link')} />
            <ToolbarBtn icon={AlignLeft} label="Align Left" onClick={() => exec('justifyLeft')} />
            <ToolbarBtn icon={AlignCenter} label="Align Center" onClick={() => exec('justifyCenter')} />
            <ToolbarBtn icon={AlignRight} label="Align Right" onClick={() => exec('justifyRight')} />

            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { const next = !showUnorderedListMenu; closeAllMenus(); setShowUnorderedListMenu(next); }}
                className="flex items-center gap-0.5  p-1.5 text-ink-900/50 hover:bg-terracotta/40 hover:text-ink-900 transition-colors"
                title="Unordered List Style"
              >
                <List size={15} />
                <ChevronDown size={10} />
              </button>
              {showUnorderedListMenu && (
              <div className="absolute left-0 z-[130] mt-1 flex items-center gap-1.5 rounded-lg bg-parchment-raised p-2 shadow-card max-w-[calc(100vw-2rem)]">
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyListStyle('ul', 'disc')} className={`relative p-2  bg-parchment-raised hover:bg-terracotta text-ink-900 hover:text-ink-900 border transition-colors ${currentUlStyle === 'disc' ? 'border-terracotta-soft text-ink-900' : 'border-ink-900'}`}>
                    <UnorderedListDiscSVG />
                    {currentUlStyle === 'disc' && <Check size={10} className="absolute -top-1 -right-1 rounded-full bg-terracotta-soft p-0.5 text-ink-900" />}
                  </button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyListStyle('ul', 'circle')} className={`relative p-2  bg-parchment-raised hover:bg-terracotta text-ink-900 hover:text-ink-900 border transition-colors ${currentUlStyle === 'circle' ? 'border-terracotta-soft text-ink-900' : 'border-ink-900'}`}>
                    <UnorderedListCircleSVG />
                    {currentUlStyle === 'circle' && <Check size={10} className="absolute -top-1 -right-1 rounded-full bg-terracotta-soft p-0.5 text-ink-900" />}
                  </button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyListStyle('ul', 'square')} className={`relative p-2  bg-parchment-raised hover:bg-terracotta text-ink-900 hover:text-ink-900 border transition-colors ${currentUlStyle === 'square' ? 'border-terracotta-soft text-ink-900' : 'border-ink-900'}`}>
                    <UnorderedListSquareSVG />
                    {currentUlStyle === 'square' && <Check size={10} className="absolute -top-1 -right-1 rounded-full bg-terracotta-soft p-0.5 text-ink-900" />}
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { const next = !showOrderedListMenu; closeAllMenus(); setShowOrderedListMenu(next); }}
                className="flex items-center gap-0.5  p-1.5 text-ink-900/50 hover:bg-terracotta/40 hover:text-ink-900 transition-colors"
                title="Ordered List Style"
              >
                <ListOrdered size={15} />
                <ChevronDown size={10} />
              </button>
              {showOrderedListMenu && (
              <div className="absolute left-0 z-[130] mt-1 grid grid-cols-3 gap-1.5 rounded-lg bg-parchment-raised p-2.5 shadow-card w-52 max-w-[calc(100vw-2rem)]">
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyListStyle('ol', 'decimal')} className={`relative p-2  bg-parchment-raised hover:bg-terracotta text-ink-900 hover:text-ink-900 border flex items-center justify-center transition-colors ${currentOlStyle === 'decimal' ? 'border-terracotta-soft text-ink-900' : 'border-ink-900'}`}>
                    <OrderedListDecimalSVG />
                    {currentOlStyle === 'decimal' && <Check size={10} className="absolute -top-1 -right-1 rounded-full bg-terracotta-soft p-0.5 text-ink-900" />}
                  </button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyListStyle('ol', 'lower-alpha')} className={`relative p-2  bg-parchment-raised hover:bg-terracotta text-ink-900 hover:text-ink-900 border flex items-center justify-center transition-colors ${currentOlStyle === 'lower-alpha' ? 'border-terracotta-soft text-ink-900' : 'border-ink-900'}`}>
                    <OrderedListLowerAlphaSVG />
                    {currentOlStyle === 'lower-alpha' && <Check size={10} className="absolute -top-1 -right-1 rounded-full bg-terracotta-soft p-0.5 text-ink-900" />}
                  </button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyListStyle('ol', 'lower-greek')} className={`relative p-2  bg-parchment-raised hover:bg-terracotta text-ink-900 hover:text-ink-900 border flex items-center justify-center transition-colors ${currentOlStyle === 'lower-greek' ? 'border-terracotta-soft text-ink-900' : 'border-ink-900'}`}>
                    <OrderedListLowerGreekSVG />
                    {currentOlStyle === 'lower-greek' && <Check size={10} className="absolute -top-1 -right-1 rounded-full bg-terracotta-soft p-0.5 text-ink-900" />}
                  </button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyListStyle('ol', 'lower-roman')} className={`relative p-2  bg-parchment-raised hover:bg-terracotta text-ink-900 hover:text-ink-900 border flex items-center justify-center transition-colors ${currentOlStyle === 'lower-roman' ? 'border-terracotta-soft text-ink-900' : 'border-ink-900'}`}>
                    <OrderedListLowerRomanSVG />
                    {currentOlStyle === 'lower-roman' && <Check size={10} className="absolute -top-1 -right-1 rounded-full bg-terracotta-soft p-0.5 text-ink-900" />}
                  </button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyListStyle('ol', 'upper-alpha')} className={`relative p-2  bg-parchment-raised hover:bg-terracotta text-ink-900 hover:text-ink-900 border flex items-center justify-center transition-colors ${currentOlStyle === 'upper-alpha' ? 'border-terracotta-soft text-ink-900' : 'border-ink-900'}`}>
                    <OrderedListUpperAlphaSVG />
                    {currentOlStyle === 'upper-alpha' && <Check size={10} className="absolute -top-1 -right-1 rounded-full bg-terracotta-soft p-0.5 text-ink-900" />}
                  </button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyListStyle('ol', 'upper-roman')} className={`relative p-2  bg-parchment-raised hover:bg-terracotta text-ink-900 hover:text-ink-900 border flex items-center justify-center transition-colors ${currentOlStyle === 'upper-roman' ? 'border-terracotta-soft text-ink-900' : 'border-ink-900'}`}>
                    <OrderedListUpperRomanSVG />
                    {currentOlStyle === 'upper-roman' && <Check size={10} className="absolute -top-1 -right-1 rounded-full bg-terracotta-soft p-0.5 text-ink-900" />}
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                ref={moreToolsBtnRef}
                type="button"
                title="More Tools"
                onMouseDown={(e) => e.preventDefault()}
                onClick={toggleMoreTools}
                className={`flex items-center justify-center  p-1.5 transition-colors ${showMoreTools ? 'bg-parchment-raised/20 text-ink-900' : 'text-ink-900/50 hover:bg-terracotta/40 hover:text-ink-900'}`}
              >
                <MoreHorizontal size={15} />
              </button>
              {showMoreTools && (
                <div
                  className={
                    moreToolsOpenRight ? 'absolute left-0 top-full z-[130] mt-1 flex flex-nowrap items-center gap-1 rounded-lg bg-parchment-raised p-2 shadow-card w-max max-w-[calc(100vw-1.5rem)] overflow-x-auto' : 'absolute right-0 top-full z-[130] mt-1 w-60 max-w-[calc(100vw-2rem)] rounded-lg bg-parchment-raised p-2 shadow-card grid grid-cols-4 gap-1'
                  }
                >
                  <ToolbarBtn icon={Indent} label="Indent" onClick={() => exec('indent')} />
                  <ToolbarBtn icon={Outdent} label="Outdent" onClick={() => exec('outdent')} />
                  <ToolbarBtn icon={ImageIcon} label="Insert Image" onClick={() => openModal('image')} />
                  <ToolbarBtn icon={Video} label="Insert Media" onClick={() => openModal('media')} />
                  <ToolbarBtn icon={TableIcon} label="Insert Table" onClick={() => openModal('table')} />
                  <ToolbarBtn icon={Code} label="Code Sample" onClick={() => openModal('code')} />
                  <ToolbarBtn icon={Quote} label="Blockquote" onClick={() => exec('formatBlock', 'blockquote')} />
                  <ToolbarBtn icon={Minus} label="Horizontal Rule" onClick={() => exec('insertHorizontalRule')} />
                  <ToolbarBtn icon={Code2} label="Source Code" onClick={() => openModal('source')} />
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={emitChange}
              onBlur={emitChange}
              data-placeholder={placeholder || 'Write your description...'}
              className="description-editable min-h-[220px] max-h-[450px] overflow-y-auto px-5 py-4 text-sm text-ink-900 font-normal focus:outline-none 
              [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:my-4 [&_h1]:text-ink-900 [&_h1]:tracking-tight
              [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:my-3 [&_h2]:text-ink-900 [&_h2]:tracking-tight
              [&_h3]:text-xl [&_h3]:font-bold [&_h3]:my-2 [&_h3]:text-ink-900
              [&_h4]:text-lg [&_h4]:font-bold [&_h4]:my-2 [&_h4]:text-ink-900
              [&_h5]:text-base [&_h5]:font-bold [&_h5]:my-2 [&_h5]:text-ink-900
              [&_h6]:text-sm [&_h6]:font-bold [&_h6]:my-2 [&_h6]:text-ink-900
              [&_p]:mb-3 [&_p]:leading-relaxed
              [&_a]:text-terracotta-text [&_a]:underline [&_a]:font-medium
              [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6
              [&_blockquote]:border-l-2 [&_blockquote]:border-terracotta-soft [&_blockquote]:bg-terracotta/[0.06] [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:italic [&_blockquote]:text-ink-900
              [&_pre]:bg-ink-900 [&_pre]:text-terracotta-soft [&_pre]:border [&_pre]:border-ink-900 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:my-2 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap
              [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:border [&_table]:border-parchment-border [&_table]:rounded-lg
              [&_th]:border [&_th]:border-parchment-border [&_th]:bg-terracotta/[0.12] [&_th]:p-2 [&_th]:text-left [&_th]:font-bold
              [&_td]:border [&_td]:border-parchment-border [&_td]:p-2"
            />

            {linkPopup && (
              <div
                className="absolute z-[140] rounded-xl bg-parchment-raised shadow-card"
                style={{ top: linkPopup.top, left: linkPopup.left }}
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (linkPopup.mode === 'edit' && editingLinkRef.current) {
                      openLinkEditPopup(editingLinkRef.current);
                    } else {
                      openModal('link');
                    }
                  }}
                  className="block px-3 py-1.5 text-xs font-medium text-ink-900 font-bold hover:bg-terracotta/40 hover:text-ink-900  transition-colors"
                >
                  Link...
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-ink-900 bg-parchment-raised px-4 py-2">
            <span className="text-[11px] uppercase tracking-wider text-ink-900/40 font-mono">{currentFormatTag.toLowerCase()}</span>
            <span className="text-[11px] uppercase tracking-wider text-ink-900/40 font-mono">{wordCount} words</span>
          </div>
        </>
      ) : (
        <>
          <textarea
            value={mdText}
            onChange={(e) => setMdText(e.target.value)}
            rows={8}
            placeholder={placeholder}
            className="block w-full resize-y bg-transparent px-4 py-3.5 text-sm text-ink-900 placeholder-ink-900/40 focus:outline-none font-mono"
          />
        </>
      )}

      {activeModal === 'customColor' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-ink-900/70 ">
          <div className="w-80 rounded-2xl bg-parchment-raised p-4 shadow-card">
            <div className="flex items-center justify-between border-b border-ink-900 pb-2 mb-3">
              <h4 className="text-xs font-semibold text-ink-900 font-bold">{customColorTarget === 'bg' ? 'Background Color' : 'Color Picker'}</h4>
              <button type="button" onClick={closeModal} className="text-ink-900/50 hover:text-ink-900"><X size={16} /></button>
            </div>
            <div className="flex gap-3 mb-4">
              <input
                type="color"
                value={customHex.startsWith('#') ? customHex : `#${customHex}`}
                onChange={(e) => setCustomHex(e.target.value.replace('#', ''))}
                className="h-28 w-28 cursor-pointer rounded border-0 bg-transparent"
              />
              <div className="flex-1 space-y-1.5 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-ink-900/50">R</span>
                  <input type="text" value={customR} onChange={(e) => setCustomR(e.target.value)} className="w-full bg-parchment-raised border border-parchment-border rounded px-2 py-1 text-ink-900" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-ink-900/50">G</span>
                  <input type="text" value={customG} onChange={(e) => setCustomG(e.target.value)} className="w-full bg-parchment-raised border border-parchment-border rounded px-2 py-1 text-ink-900" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-ink-900/50">B</span>
                  <input type="text" value={customB} onChange={(e) => setCustomB(e.target.value)} className="w-full bg-parchment-raised border border-parchment-border rounded px-2 py-1 text-ink-900" />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-ink-900/50">#</span>
                  <input type="text" value={customHex} onChange={(e) => setCustomHex(e.target.value)} className="w-full bg-parchment-raised border border-parchment-border rounded px-2 py-1 text-ink-900" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-ink-900 pt-3">
              <button type="button" onClick={closeModal} className="px-3 py-1 text-xs text-ink-900/50 hover:text-ink-900">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  const hex = customHex.startsWith('#') ? customHex : `#${customHex}`;
                  if (customColorTarget === 'bg') {
                    setCurrentBgColor(hex);
                    exec('hiliteColor', hex);
                  } else {
                    setCurrentColor(hex);
                    exec('foreColor', hex);
                  }
                  closeModal();
                }}
                className="px-4 py-1 text-xs bg-terracotta-soft hover:bg-terracotta text-ink-900 rounded font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'link' && (
        <EditorModal title="Insert/Edit Link" onClose={closeModal} onSave={() => {
          if (linkUrl.trim()) {
            const wantBlank = linkTarget === '_blank';
            if (editingLinkRef.current) {
              const a = editingLinkRef.current;
              a.setAttribute('href', linkUrl.trim());
              a.textContent = linkText.trim() || linkUrl.trim();
              if (linkTitle.trim()) a.setAttribute('title', linkTitle.trim()); else a.removeAttribute('title');
              if (wantBlank) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer'); }
              else { a.removeAttribute('target'); a.removeAttribute('rel'); }
              emitChange();
              editingLinkRef.current = null;
            } else {
              const targetAttr = wantBlank ? ' target="_blank" rel="noopener noreferrer"' : '';
              const titleAttr = linkTitle.trim() ? ` title="${linkTitle.trim()}"` : '';
              insertHtmlAtSelection(`<a href="${linkUrl.trim()}"${targetAttr}${titleAttr}>${linkText.trim() || linkUrl.trim()}</a>`);
            }
          }
          closeModal();
        }}>
          <div className="mb-3">
            <label className="block text-xs text-ink-900/50 mb-1">URL</label>
            <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="w-full bg-parchment-raised border border-parchment-border rounded-lg  p-2.5 text-xs text-ink-900" placeholder="https://..." />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-ink-900/50 mb-1">Text to display</label>
            <input type="text" value={linkText} onChange={(e) => setLinkText(e.target.value)} className="w-full bg-parchment-raised border border-parchment-border rounded-lg  p-2.5 text-xs text-ink-900" />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-ink-900/50 mb-1">Title</label>
            <input type="text" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} className="w-full bg-parchment-raised border border-parchment-border rounded-lg  p-2.5 text-xs text-ink-900" />
          </div>
          <div>
            <label className="block text-xs text-ink-900/50 mb-1">Open link in...</label>
            <CustomSelect
              value={linkTarget === '_blank' ? 'New tab' : 'Current tab'}
              options={['New tab', 'Current tab']}
              onChange={(val) => setLinkTarget(val === 'New tab' ? '_blank' : '_self')}
            />
          </div>
        </EditorModal>
      )}

      {activeModal === 'code' && (
        <EditorModal title="Insert Code Sample" onClose={closeModal} onSave={() => {
          const escaped = codeText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          insertHtmlAtSelection(`<pre><code class="language-${codeLanguage.toLowerCase()}">${escaped}</code></pre>`);
          closeModal();
        }}>
          <div className="mb-3">
            <label className="block text-xs text-ink-900/50 mb-1">Language</label>
            <CustomSelect value={codeLanguage} options={CODE_LANGUAGES} onChange={setCodeLanguage} />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-ink-900/50 mb-1">Code</label>
            <textarea rows={6} value={codeText} onChange={(e) => setCodeText(e.target.value)} className="w-full bg-parchment-raised border border-parchment-border rounded-lg  p-3 text-xs font-mono text-ink-900" />
          </div>
        </EditorModal>
      )}
      {activeModal === 'image' && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-ink-900/70 ">
          <div className="relative w-full max-w-lg rounded-lg bg-parchment-raised shadow-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-900 px-5 py-3.5">
              <h4 className="text-sm font-semibold text-ink-900">Insert/Edit Image</h4>
              <button type="button" onClick={closeModal} className="text-ink-900/40 hover:text-ink-900"><X size={18} /></button>
            </div>
            <div className="flex">
              <div className="w-28 shrink-0 border-r border-ink-900 py-3">
                <button
                  type="button"
                  onClick={() => setImageTab('general')}
                  className={`block w-full text-left px-4 py-2 text-xs font-medium transition-colors ${imageTab === 'general' ? 'text-terracotta-text border-l-2 border-terracotta-soft bg-parchment-raised' : 'text-ink-900/50 hover:text-ink-900'}`}
                >
                  General
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab('upload')}
                  className={`block w-full text-left px-4 py-2 text-xs font-medium transition-colors ${imageTab === 'upload' ? 'text-terracotta-text border-l-2 border-terracotta-soft bg-parchment-raised' : 'text-ink-900/50 hover:text-ink-900'}`}
                >
                  Upload
                </button>
              </div>
              <div className="flex-1 p-5 min-w-0">
                {imageTab === 'general' ? (
                  <>
                    <div className="mb-3">
                      <label className="block text-xs text-ink-900/50 mb-1">Source</label>
                      <input type="url" value={imageSrc} onChange={(e) => setImageSrc(e.target.value)} className="w-full bg-parchment-raised border border-parchment-border rounded-lg  p-2.5 text-xs text-ink-900" placeholder="https://..." />
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs text-ink-900/50 mb-1">Alternative description</label>
                      <input type="text" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} className="w-full bg-parchment-raised border border-parchment-border rounded-lg  p-2.5 text-xs text-ink-900" />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-ink-900/50 mb-1">Width</label>
                        <input type="text" inputMode="numeric" value={imageWidth} onChange={(e) => handleImageWidthChange(e.target.value)} className="w-full bg-parchment-raised border border-parchment-border rounded-lg  p-2.5 text-xs text-ink-900" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-ink-900/50 mb-1">Height</label>
                        <input type="text" inputMode="numeric" value={imageHeight} onChange={(e) => handleImageHeightChange(e.target.value)} className="w-full bg-parchment-raised border border-parchment-border rounded-lg  p-2.5 text-xs text-ink-900" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setImageAspectLocked((p) => !p)}
                        title={imageAspectLocked ? 'Rasio terkunci' : 'Rasio bebas'}
                        className="mb-0.5 shrink-0  p-2 text-ink-900/50 hover:bg-terracotta/40 hover:text-ink-900 transition-colors"
                      >
                        {imageAspectLocked ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                    </div>
                    {imageSrc && (
                      <img src={imageSrc} alt="preview" className="mt-3 max-h-28  border border-parchment-border rounded-lg object-contain" />
                    )}
                  </>
                ) : (
                  <label
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleImageFile(file);
                    }}
                    className="flex flex-col items-center justify-center gap-2  border border-dashed border-white/15 bg-parchment-raised px-3 py-10 text-xs text-ink-900/50 hover:bg-parchment-raised hover:text-ink-900 cursor-pointer transition-colors text-center"
                  >
                    <UploadCloud size={22} />
                    <span>{imageUploading ? 'Uploading...' : 'Drop an image here'}</span>
                    <span className="mt-1 inline-block  bg-terracotta px-3 py-1.5 text-[11px] font-medium text-ink-900 font-bold">
                      Browse for an image
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={imageUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await handleImageFile(file);
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-ink-900 px-5 py-3">
              <button type="button" onClick={closeModal} className="px-4 py-2 text-xs font-bold uppercase text-ink-900/50 hover:text-ink-900 transition-colors">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  if (imageSrc.trim()) {
                    const widthAttr = imageWidth.trim() ? ` width="${imageWidth.trim()}"` : '';
                    const heightAttr = imageHeight.trim() ? ` height="${imageHeight.trim()}"` : '';
                    insertHtmlAtSelection(`<img src="${imageSrc.trim()}" alt="${imageAlt.trim()}"${widthAttr}${heightAttr} style="max-width:100%;border-radius:8px;" />`);
                  }
                  closeModal();
                }}
                className="rounded-lg bg-terracotta hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px shadow-card px-5 py-2 text-xs font-bold uppercase text-ink-900 transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'media' && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-ink-900/70 ">
          <div className="relative w-full max-w-lg rounded-lg bg-parchment-raised shadow-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-900 px-5 py-3.5">
              <h4 className="text-sm font-semibold text-ink-900">Insert/Edit Media</h4>
              <button type="button" onClick={closeModal} className="text-ink-900/40 hover:text-ink-900"><X size={18} /></button>
            </div>
            <div className="flex">
              <div className="w-28 shrink-0 border-r border-ink-900 py-3">
                {(['general', 'embed', 'advanced'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setMediaTab(tab)}
                    className={`block w-full text-left px-4 py-2 text-xs font-medium capitalize transition-colors ${mediaTab === tab ? 'text-terracotta-text border-l-2 border-terracotta-soft bg-parchment-raised' : 'text-ink-900/50 hover:text-ink-900'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex-1 p-5 min-w-0">
                {mediaTab === 'general' && (
                  <>
                    <div className="mb-3">
                      <label className="block text-xs text-ink-900/50 mb-1">Source</label>
                      <input type="url" value={mediaSrc} onChange={(e) => setMediaSrc(e.target.value)} className="w-full bg-parchment-raised border border-parchment-border rounded-lg  p-2.5 text-xs text-ink-900" placeholder="https://..." />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-ink-900/50 mb-1">Width</label>
                        <input type="text" inputMode="numeric" value={mediaWidth} onChange={(e) => handleMediaWidthChange(e.target.value)} className="w-full bg-parchment-raised border border-parchment-border rounded-lg  p-2.5 text-xs text-ink-900" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-ink-900/50 mb-1">Height</label>
                        <input type="text" inputMode="numeric" value={mediaHeight} onChange={(e) => handleMediaHeightChange(e.target.value)} className="w-full bg-parchment-raised border border-parchment-border rounded-lg  p-2.5 text-xs text-ink-900" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setMediaAspectLocked((p) => !p)}
                        title={mediaAspectLocked ? 'Rasio terkunci' : 'Rasio bebas'}
                        className="mb-0.5 shrink-0  p-2 text-ink-900/50 hover:bg-terracotta/40 hover:text-ink-900 transition-colors"
                      >
                        {mediaAspectLocked ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                    </div>
                  </>
                )}
                {mediaTab === 'embed' && (
                  <div>
                    <label className="block text-xs text-ink-900/50 mb-1">Paste your embed code below:</label>
                    <textarea
                      rows={7}
                      value={mediaEmbed}
                      onChange={(e) => setMediaEmbed(e.target.value)}
                      className="w-full bg-parchment-raised border border-parchment-border rounded-lg  p-3 text-xs font-mono text-ink-900 resize-none"
                    />
                  </div>
                )}
                {mediaTab === 'advanced' && (
                  <>
                    <div className="mb-3">
                      <label className="block text-xs text-ink-900/50 mb-1">Alternative source URL</label>
                      <input type="url" value={mediaAltSrc} onChange={(e) => setMediaAltSrc(e.target.value)} className="w-full bg-parchment-raised border border-parchment-border rounded-lg  p-2.5 text-xs text-ink-900" />
                    </div>
                    <div>
                      <label className="block text-xs text-ink-900/50 mb-1">Media poster (Image URL)</label>
                      <input type="url" value={mediaPoster} onChange={(e) => setMediaPoster(e.target.value)} className="w-full bg-parchment-raised border border-parchment-border rounded-lg  p-2.5 text-xs text-ink-900" />
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-ink-900 px-5 py-3">
              <button type="button" onClick={closeModal} className="px-4 py-2 text-xs font-bold uppercase text-ink-900/50 hover:text-ink-900 transition-colors">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  if (mediaEmbed.trim()) {
                    insertHtmlAtSelection(mediaEmbed.trim());
                  } else if (mediaSrc.trim()) {
                    const widthAttr = mediaWidth.trim() ? ` width="${mediaWidth.trim()}"` : '';
                    const heightAttr = mediaHeight.trim() ? ` height="${mediaHeight.trim()}"` : '';
                    const posterAttr = mediaPoster.trim() ? ` poster="${mediaPoster.trim()}"` : '';
                    const altSourceTag = mediaAltSrc.trim() ? `<source src="${mediaAltSrc.trim()}" />` : '';
                    insertHtmlAtSelection(`<video src="${mediaSrc.trim()}" controls${widthAttr}${heightAttr}${posterAttr} style="max-width:100%;border-radius:8px;">${altSourceTag}</video>`);
                  }
                  closeModal();
                }}
                className="rounded-lg bg-terracotta hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px shadow-card px-5 py-2 text-xs font-bold uppercase text-ink-900 transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'table' && (
        <EditorModal title="Insert Table" onClose={closeModal} onSave={() => {
          const rows = Math.max(1, parseInt(tableRows, 10) || 1);
          const cols = Math.max(1, parseInt(tableCols, 10) || 1);
          const headerCells = Array.from({ length: cols }, (_, i) => `<th>Header ${i + 1}</th>`).join('');
          let bodyRows = `<tr>${headerCells}</tr>`;
          for (let r = 0; r < rows - 1; r++) {
            const cells = Array.from({ length: cols }, () => `<td>&nbsp;</td>`).join('');
            bodyRows += `<tr>${cells}</tr>`;
          }
          insertHtmlAtSelection(`<table><tbody>${bodyRows}</tbody></table><p><br/></p>`);
          closeModal();
        }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-ink-900/50 mb-1">Rows</label>
              <input type="number" min={1} value={tableRows} onChange={(e) => setTableRows(e.target.value)} className="w-full bg-parchment-raised border border-parchment-border rounded-lg  p-2.5 text-xs text-ink-900" />
            </div>
            <div>
              <label className="block text-xs text-ink-900/50 mb-1">Columns</label>
              <input type="number" min={1} value={tableCols} onChange={(e) => setTableCols(e.target.value)} className="w-full bg-parchment-raised border border-parchment-border rounded-lg  p-2.5 text-xs text-ink-900" />
            </div>
          </div>
          <p className="mt-3 text-[11px] text-ink-900/40">Baris pertama otomatis jadi header tabel.</p>
        </EditorModal>
      )}

      {activeModal === 'source' && (
        <EditorModal title="Source Code" onClose={closeModal} onSave={() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = sanitizeHtml(sourceText);
            onChange(editorRef.current.innerHTML);
            const text = editorRef.current.textContent?.trim() || '';
            setWordCount(text ? text.split(/\s+/).length : 0);
          }
          closeModal();
        }}>
          <textarea
            rows={12}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            className="w-full bg-parchment-raised border border-parchment-border rounded-lg  p-3 text-xs font-mono text-ink-900 resize-none"
          />
        </EditorModal>
      )}
    </div>
  );
}

function ToolbarBtn({ icon: Icon, label, onClick, active }: { icon: React.ComponentType<{ size?: number }>; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex items-center justify-center  p-1.5 transition-colors ${active ? 'bg-parchment-raised/20 text-ink-900' : 'text-ink-900/50 hover:bg-terracotta/40 hover:text-ink-900'}`}
    >
      <Icon size={15} />
    </button>
  );
}

function EditorModal({ title, onClose, onSave, children }: { title: string; onClose: () => void; onSave: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-ink-900/70 ">
      <div className="relative w-full max-w-md rounded-lg bg-parchment-raised p-5 shadow-card">
        <div className="flex items-center justify-between mb-4 border-b border-ink-900 pb-3">
          <h4 className="text-sm font-semibold text-ink-900">{title}</h4>
          <button type="button" onClick={onClose} className="text-ink-900/40 hover:text-ink-900"><X size={18} /></button>
        </div>
        {children}
        <div className="mt-5 flex justify-end gap-2 border-t border-ink-900 pt-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase text-ink-900/50 hover:text-ink-900 transition-colors">Cancel</button>
          <button type="button" onClick={onSave} className="rounded-lg bg-terracotta hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-px shadow-card px-5 py-2 text-xs font-bold uppercase text-ink-900 transition-all">Save</button>
        </div>
      </div>
    </div>
  );
}