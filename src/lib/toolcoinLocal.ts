const BM_KEY = 'voltra_toolcoin_bookmarks';
const LIKE_KEY = 'voltra_toolcoin_likes';
const FEATURED_KEY = 'voltra_toolcoin_featured';

function readSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x) => typeof x === 'string' && x));
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* quota / private mode */
  }
}

export function getToolcoinBookmarks(): Set<string> {
  return readSet(BM_KEY);
}

export function toggleToolcoinBookmark(id: string): boolean {
  const s = readSet(BM_KEY);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  writeSet(BM_KEY, s);
  return s.has(id);
}

export function getToolcoinLikes(): Set<string> {
  return readSet(LIKE_KEY);
}

export function toggleToolcoinLike(id: string): boolean {
  const s = readSet(LIKE_KEY);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  writeSet(LIKE_KEY, s);
  return s.has(id);
}

export function getToolcoinFeatured(): Set<string> {
  return readSet(FEATURED_KEY);
}

export function toggleToolcoinFeatured(id: string): boolean {
  const s = readSet(FEATURED_KEY);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  writeSet(FEATURED_KEY, s);
  return s.has(id);
}
