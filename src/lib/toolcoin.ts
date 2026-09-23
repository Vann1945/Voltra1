import type { Addon } from '@/types';

export interface ToolcoinCatalogItem {
  id: string;
  title: string;
  creator?: string;
  type?: string;
  thumbnail?: string;
  panorama?: string;
  images?: string[];
  tags?: string[];
  author_photo?: string | null;
  key?: string;
  description?: string;
  manifest_uuid?: string;
  created_at?: string;
  updated_at?: string;
  available?: boolean | number;
  modules?: Array<{
    pack_type?: string;
    manifest_uuid?: string;
    key?: string;
    title?: string;
  }>;
}

export interface ToolcoinCatalogPage {
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
  items: ToolcoinCatalogItem[];
  downloadBase: string;
}

type AddonCategory = Addon['category'];

const TYPE_TO_CATEGORY: Record<string, AddonCategory> = {
  addon: 'Add-Ons',
  behaviorpack: 'Add-Ons',
  behavior_pack: 'Add-Ons',
  resourcepack: 'Resource Packs',
  resource_pack: 'Resource Packs',
  world_template: 'World',
  world: 'World',
  skinpack: 'Skin Pack',
  skin_pack: 'Skin Pack',
  mashup: 'Customization',
  mash_up: 'Customization',
  'mash-ups': 'Customization',
  persona: 'Customization',
};

const TOOLCOIN_PAGE_SIZE_DEFAULT = 20;

const catalogPageCache = new Map<string, { at: number; data: ToolcoinCatalogPage }>();
const catalogItemCache = new Map<string, { at: number; data: ToolcoinCatalogItem | null }>();
const CATALOG_CLIENT_TTL = 120_000;
const CATALOG_ITEM_TTL = 30_000;

function catalogCacheKey(options: {
  page: number;
  limit: number;
  category: string;
  q: string;
  sort: string;
  creator: string;
  tag: string;
}) {
  return JSON.stringify([
    options.page,
    options.limit,
    options.category,
    options.q,
    options.sort,
    options.creator,
    options.tag,
  ]);
}

function mapCategory(type?: string, title?: string, tags?: string[]): AddonCategory {
  // pack_type from DB wins — never guess skin into Add-Ons
  const key = (type || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (key && TYPE_TO_CATEGORY[key]) return TYPE_TO_CATEGORY[key];
  const blob = `${type || ''} ${title || ''} ${(tags || []).join(' ')}`.toLowerCase();
  if (/\bskin\s*pack\b|\bskinpack\b/.test(blob)) return 'Skin Pack';
  if (/\bmash[- ]?up\b|\bpersona\b|realism reimagined|comic\s*verse/i.test(blob)) {
    return 'Customization';
  }
  if (/resource\s*pack|texture\s*pack/i.test(blob) && !/behavior/i.test(blob)) return 'Resource Packs';
  if (/\bworld\s*template\b|\bworld\b|\bmap\b/i.test(blob) && !/addon|add-on|behavior/i.test(blob)) {
    return 'World';
  }
  return 'Add-Ons';
}

export function clientToolcoinBase(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TOOLCOIN_API_URL) {
    return process.env.NEXT_PUBLIC_TOOLCOIN_API_URL.replace(/\/$/, '').trim();
  }
  if (typeof process !== 'undefined' && process.env.TOOLCOIN_API_URL) {
    // server components only; still useful when mapping on server
    return process.env.TOOLCOIN_API_URL.replace(/\/$/, '').trim();
  }
  if (typeof window !== 'undefined' && (window as any).__TOOLCOIN_API_URL__) {
    return String((window as any).__TOOLCOIN_API_URL__).replace(/\/$/, '').trim();
  }
  return '';
}

/**
 * Absolute media URL for covers/thumbnails.
 * Relative /api/thumbnail/... must hit ToolCoin (Railway), not the Vercel host —
 * otherwise detail cover is a black box.
 * When no public API base is set, route through same-origin media proxy.
 */
function resolveMediaUrl(url: string, base: string): string {
  const u = (url || '').trim();
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u;
  if (u.startsWith('/')) {
    const b = (base || clientToolcoinBase() || '').replace(/\/$/, '');
    if (b) return `${b}${u}`;
    // same-origin proxy so images still load without NEXT_PUBLIC_TOOLCOIN_API_URL
    if (u.startsWith('/api/thumbnail/') || u.startsWith('/api/fetch-pack')) {
      return `/api/toolcoin/media${u.slice(4)}`; // /api/toolcoin/media/thumbnail/...
    }
    return u;
  }
  return u;
}

/** Gallery for detail carousel: pack_icon (thumb) then cover1, cover2… Never panorama. */
function collectCoverGallery(item: ToolcoinCatalogItem, base: string): string[] {
  const panorama = (item.panorama || '').trim();
  const panoKey = panorama ? panorama.split('?')[0] : '';
  const seen = new Set<string>();
  const out: string[] = [];

  const add = (url?: string | null) => {
    const u = (url || '').trim();
    if (!u) return;
    if (panorama && (u === panorama || u === panoKey || u.startsWith(panoKey))) return;
    if (/panorama/i.test(u)) return;
    // Skip our procedural SVG placeholders in the gallery list
    if (/\/api\/thumbnail\//i.test(u) || /thumbnail\/[^/]+\.svg/i.test(u)) return;
    const abs = resolveMediaUrl(u, base);
    if (!abs || seen.has(abs)) return;
    if (/\/api\/thumbnail\//i.test(abs)) return;
    seen.add(abs);
    out.push(abs);
  };

  // 1) pack icon / thumbnail field
  add(item.thumbnail);
  // 2) large covers in API order (thumbnail_0, screenshot1, …) — already excludes packicon server-side
  if (Array.isArray(item.images)) {
    for (const u of item.images) {
      if (typeof u === 'string') add(u);
    }
  }
  return out;
}

function isGarbageTag(s: string): boolean {
  const low = s.toLowerCase().trim();
  if (!low || low.length < 2) return true;
  // UUID / hex ids (what showed as "enc code" on cards)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(s) && s.length >= 20) return true;
  if (/^[0-9a-f-]{16,}$/i.test(s)) return true;
  // pure hex blob
  if (/^[0-9a-f]{12,}$/i.test(s)) return true;
  // mostly digits / uuid fragments
  if ((s.match(/[0-9a-f]/gi) || []).length / s.length > 0.85 && s.length > 10) return true;
  return false;
}

function cleanTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const skip = new Set([
    'official', 'marketplace', 'addon', 'add-on', 'add_on', 'resourcepack',
    'resource pack', 'behaviorpack', 'behavior pack', 'world', 'skinpack',
    'skin pack', 'none', 'null', 'pack', 'content', 'unknown',
  ]);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tags) {
    if (typeof t !== 'string') continue;
    let s = t.trim();
    if (!s || isGarbageTag(s)) continue;
    const low = s.toLowerCase();
    if (low.startsWith('creator:') || low.startsWith('partner:')) continue;
    if (low.startsWith('minerelevant')) continue;
    if (skip.has(low)) continue;
    // contenttype.foo → Foo
    if (s.includes('.')) {
      const rest = s.split('.').pop() || s;
      s = rest
        .replace(/[_-]+/g, ' ')
        .replace(/[a-z]/g, (c) => c.toUpperCase());
    }
    if (isGarbageTag(s)) continue;
    const key = s.toLowerCase();
    if (seen.has(key) || key.length < 2 || key.length > 32) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= 8) break;
  }
  return out;
}

export function toolcoinItemToAddon(item: ToolcoinCatalogItem, toolcoinBaseUrl = ''): Addon {
  const category = mapCategory(item.type, item.title, item.tags);
  const base = toolcoinBaseUrl.replace(/\/$/, '');
  const gallery = collectCoverGallery(item, base);
  const panoramaUrl = item.panorama && String(item.panorama).trim()
    ? resolveMediaUrl(String(item.panorama).trim(), base)
    : '';

  // Card thumb: prefer real pack icon / first real gallery frame — never procedural SVG if avoidable
  const isSvgPlaceholder = (u: string) =>
    /\/api\/thumbnail\//i.test(u) || /thumbnail\/[^/]+\.svg/i.test(u);
  let imageUrl = item.thumbnail ? resolveMediaUrl(item.thumbnail.trim(), base) : '';
  if (!imageUrl || isSvgPlaceholder(imageUrl)) {
    const real = gallery.find((u) => u && !isSvgPlaceholder(u));
    imageUrl = real || gallery[0] || imageUrl || '';
  }
  // If gallery empty but images[] raw has http URLs, pull them in
  if ((!gallery.length || gallery.every(isSvgPlaceholder)) && Array.isArray(item.images)) {
    for (const u of item.images) {
      if (typeof u !== 'string' || !u.trim()) continue;
      const abs = resolveMediaUrl(u.trim(), base);
      if (abs && !isSvgPlaceholder(abs) && !gallery.includes(abs)) gallery.push(abs);
    }
    if (!imageUrl || isSvgPlaceholder(imageUrl)) {
      const real = gallery.find((u) => u && !isSvgPlaceholder(u));
      if (real) imageUrl = real;
    }
  }

  const authorName = (item.creator || '').trim() || 'Marketplace Creator';
  let authorPhoto: string | null = item.author_photo
    ? resolveMediaUrl(String(item.author_photo).trim(), base)
    : null;
  // Keep real creator icons; only drop procedural pack thumbnails used as pfp
  if (authorPhoto && /\/api\/thumbnail\//i.test(authorPhoto)) {
    authorPhoto = null;
  }

  // Always same-origin proxy — avoids CORS and never exposes Railway URL in the browser
  const packId = String(item.id || '').replace(/^toolcoin:/i, '');
  const downloadUrl = packId
    ? `/api/toolcoin/media/fetch-pack/${encodeURIComponent(packId)}`
    : '';

  // Marketplace-style tags only (no synthetic official/marketplace noise)
  const tags = cleanTags(item.tags);

  return {
    id: item.id,
    title: item.title || 'Untitled',
    description: item.description || '',
    category,
    projectClass: category,
    imageUrl,
    imageUrls: gallery,
    panoramaUrl: panoramaUrl || undefined,
    downloadUrl,
    authorId: `toolcoin:${authorName.toLowerCase().replace(/\s+/g, '-')}`,
    authorName,
    authorPhoto,
    authorBorder: 'none',
    createdAt: (item.created_at || item.updated_at || '').trim() || new Date(0).toISOString(),
    likesCount: 0,
    downloadsCount: 0,
    tags,
    averageRating: 0,
    ratingCount: 0,
    status: 'approved',
    isFeatured: Boolean((item as any).is_featured || (item as any).featured),
    allowComments: false,
    source: 'toolcoin',
    marketplaceKey: item.key,
    toolcoinType: item.type,
    toolcoinModules: item.modules,
  } as Addon;
}

export async function fetchToolcoinCatalogItem(
  id: string,
  signal?: AbortSignal
): Promise<ToolcoinCatalogItem | null> {
  if (!id) return null;
  const cacheKey = id.trim().toLowerCase();
  const cached = catalogItemCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CATALOG_ITEM_TTL) return cached.data;

  const downloadBase = clientToolcoinBase();
  const params = new URLSearchParams({
    item: id,
    limit: '1',
    page: '1',
    category: 'all',
    sort: 'default',
    enrich: '1',
  });
  const urls = [
    `/api/toolcoin/catalog?${params.toString()}`,
    downloadBase ? `${downloadBase}/api/catalog?${params.toString()}` : '',
  ].filter(Boolean);

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal,
        credentials: url.startsWith('/') ? 'same-origin' : 'omit',
      });
      if (!res.ok) continue;
      const data = await res.json();
      const item = data.item || (Array.isArray(data.items) ? data.items[0] : null);
      if (item?.id) {
        const typed = item as ToolcoinCatalogItem;
        catalogItemCache.set(cacheKey, { at: Date.now(), data: typed });
        catalogItemCache.set(String(typed.id).toLowerCase(), { at: Date.now(), data: typed });
        return typed;
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err;
    }
  }
  // Short negative cache so a temporary miss recovers quickly on refresh
  catalogItemCache.set(cacheKey, { at: Date.now() - (CATALOG_ITEM_TTL - 5_000), data: null });
  return null;
}

export async function fetchToolcoinCatalogPage(options: {
  page?: number;
  limit?: number;
  category?: string;
  q?: string;
  sort?: string;
  creator?: string;
  tag?: string;
  signal?: AbortSignal;
}): Promise<ToolcoinCatalogPage> {
  const page = options.page ?? 1;
  const limit = options.limit ?? TOOLCOIN_PAGE_SIZE_DEFAULT;
  const category = options.category ?? 'all';
  const q = options.q ?? '';
  const sort = options.sort ?? 'default';
  const creator = options.creator ?? '';
  const tag = options.tag ?? '';
  const downloadBase = clientToolcoinBase();

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    category,
    sort,
  });
  if (q) params.set('q', q);
  if (creator) params.set('creator', creator);
  if (tag) params.set('tag', tag);

  const cacheKey = catalogCacheKey({ page, limit, category, q, sort, creator, tag });
  const cached = catalogPageCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CATALOG_CLIENT_TTL) return cached.data;

  const tryUrls = [
    `/api/toolcoin/catalog?${params.toString()}`,
    downloadBase ? `${downloadBase}/api/catalog?${params.toString()}` : '',
  ].filter(Boolean);

  for (const url of tryUrls) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: options.signal,
        credentials: url.startsWith('/') ? 'same-origin' : 'omit',
      });
      if (!res.ok) {
        if (res.status === 503) {
          console.warn('[toolcoin] TOOLCOIN_API_URL missing on Vercel');
        }
        continue;
      }
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      const result: ToolcoinCatalogPage = {
        total: typeof data.total === 'number' ? data.total : items.length,
        page: data.page ?? page,
        limit: data.limit ?? limit,
        has_more: Boolean(data.has_more),
        items,
        downloadBase,
      };
      catalogPageCache.set(cacheKey, { at: Date.now(), data: result });
      return result;
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err;
      console.warn('[toolcoin] catalog fetch failed', url, err);
    }
  }

  return { total: 0, page, limit, has_more: false, items: [], downloadBase };
}

export function mergeAddons(...lists: Addon[][]): Addon[] {
  const seen = new Set<string>();
  const out: Addon[] = [];
  for (const list of lists) {
    const arr = Array.isArray(list) ? list : [];
    for (const a of arr) {
      if (!a?.id || seen.has(a.id)) continue;
      seen.add(a.id);
      out.push(a);
    }
  }
  return out;
}

/** "Action And Stuff" matches "Actions & Stuff" */
export function matchesLooseQuery(text: string, query: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/&/g, ' ')
      .replace(/\b(and|or|the|a|an)\b/g, ' ')
      .replace(/[^a-z0-9.]+/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2);
  const tokens = norm(query);
  if (!tokens.length) return true;
  const hayTokens = norm(text);
  const hay = hayTokens.join(' ');
  return tokens.every(
    (t) =>
      hay.includes(t) ||
      hay.includes(t.replace(/s$/, '')) ||
      hayTokens.some((h) => h.startsWith(t) || t.startsWith(h))
  );
}

export function clearToolcoinClientCache() {
  catalogPageCache.clear();
  catalogItemCache.clear();
}
