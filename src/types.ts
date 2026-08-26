export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  role: 'user' | 'admin' | 'banned' | 'suspended';
  createdAt: string;
  profileBorder?: string;
}

export interface AddonSocial {
  platform: string;
  url: string;
}

export interface AddonCollaborator {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  profileBorder?: string;
}

export interface AddonVersion {
  id: string;
  addonId: string;
  version: string;
  downloadUrl: string;
  changelog?: string;
  compatibilityNotes?: string;
  createdAt: string;
}

export interface Addon {
  id: string;
  title: string;
  description: string;
  category: 'Bukkit Plugins' | 'Modpack' | 'Customization' | 'Add-Ons' | 'Shaders' | 'Mods' | 'Resource Packs' | 'Data Pack' | 'World' | 'Skin Pack';
  projectClass: 'Bukkit Plugins' | 'Modpack' | 'Customization' | 'Add-Ons' | 'Shaders' | 'Mods' | 'Resource Packs' | 'Data Pack' | 'World' | 'Skin Pack';
  additionalCategory?: string;
  imageUrl: string;
  imageUrls?: string[];
  panoramaUrl: string;
  downloadUrl: string;
  demoUrl?: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string | null;
  authorBorder?: string;
  createdAt: string;
  likesCount: number;
  downloadsCount?: number;
  tags: string[];
  averageRating?: number;
  ratingCount?: number;
  status?: 'pending' | 'approved' | 'rejected';
  isFeatured?: boolean;
  versions?: AddonVersion[];
  versionHistory?: string;
  compatibilityNotes?: string;
  changelog?: string;
  license?: string;
  distributionPref?: string;
  unlisted?: boolean;
  allowComments?: boolean;
  socials?: AddonSocial[];
  collaborators?: AddonCollaborator[];
}

export interface Like {
  userId: string;
  addonId: string;
  createdAt: string;
}

export interface Review {
  id: string;
  addonId: string;
  userId: string;
  userName: string;
  userPhoto?: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface Report {
  id: string;
  addonId: string;
  userId: string;
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

// Navigation types — dipindah dari App.tsx (Vite) supaya bisa dipakai
// bareng oleh komponen client & App Router pages tanpa import silang.
export type ViewState =
  | 'landing'
  | 'streak'
  | 'home'
  | 'profile'
  | 'bookmarks'
  | 'library'
  | 'settings'
  | 'admin'
  | { type: 'addon', id: string }
  | { type: 'author', id: string }
  | { type: 'reset-password', token: string, uid: string };

export const slugify = (text: string) =>
  text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

export const categoryToSlug = (category?: string): string => {
  if (!category) return 'add-ons';
  const normalized = category.trim().toLowerCase().replace(/\s+/g, '-');
  if (normalized === 'add-on' || normalized === 'addon' || normalized === 'add-ons') return 'add-ons';
  if (normalized === 'resource-pack' || normalized === 'resource-packs' || normalized === 'texture-pack' || normalized === 'texture-packs') return 'texture-pack';
  return slugify(category) || 'add-ons';
};
