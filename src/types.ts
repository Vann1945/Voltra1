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

export interface Addon {
  id: string;
  title: string;
  description: string;
  category: 'Resource Pack' | 'Behavior Pack' | 'World' | 'Skin Pack' | 'Mod';
  imageUrl: string;
  imageUrls?: string[];
  downloadUrl: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  likesCount: number;
  tags: string[];
  averageRating?: number;
  ratingCount?: number;
  downloadsCount?: number;
  status?: 'pending' | 'approved' | 'rejected';
  isFeatured?: boolean;
  versionHistory?: string;
  compatibilityNotes?: string;
  changelog?: string;
  demoUrl?: string;
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
  rating: number;
  text: string;
  createdAt: string;
}

export interface Report {
  id: string;
  addonId: string;
  userId: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
}
