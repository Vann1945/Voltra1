const DEFAULT_PUBLIC_SITE_URL = 'https://voltra-marketplace.web.id';

export function getPublicSiteUrl(): string {
  const configured = process.env.PUBLIC_SITE_URL || process.env.VITE_APP_URL;
  if (!configured) return DEFAULT_PUBLIC_SITE_URL;

  try {
    const url = new URL(configured);
    return url.protocol === 'https:' ? url.origin : DEFAULT_PUBLIC_SITE_URL;
  } catch {
    return DEFAULT_PUBLIC_SITE_URL;
  }
}
