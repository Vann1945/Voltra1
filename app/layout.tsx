import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/hooks/useToast';
import { AppShellProvider } from '@/providers/AppShellProvider';
import { AppChrome } from '@/providers/AppChrome';

// Self-hosted lewat next/font: nggak ada request render-blocking ke
// fonts.googleapis.com lagi (itu yang paling makan waktu di LCP mobile),
// filenya di-preload otomatis dan di-subset cuma huruf latin.
// Nama variable-nya sengaja beda dari --font-mono (token Tailwind di
// globals.css) supaya nggak circular waktu di-reference di sana.
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const SITE_URL = 'https://voltra-marketplace.web.id';
const SITE_TITLE = 'Voltra Marketplace';
const SITE_DESCRIPTION =
  'Browse hundreds of Minecraft add-ons, texture packs, and resource packs made by creators from around the world. New drops every week, all free to download.';

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: 'VisualCraft',
  alternates: { canonical: SITE_URL },
  icons: { icon: '/favicon/icon-oled.svg' },
  openGraph: {
    type: 'website',
    siteName: SITE_TITLE,
    url: SITE_URL,
    title: 'Voltra Marketplace — Minecraft Add-ons & Texture Packs',
    description: SITE_DESCRIPTION,
    images: [{ url: `${SITE_URL}/favicon/icon-oled.png`, width: 1200, height: 630 }],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Voltra Marketplace — Minecraft Add-ons & Texture Packs',
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/favicon/icon-oled.png`],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body>
        <ToastProvider>
          <AppShellProvider>
            <AppChrome>{children}</AppChrome>
          </AppShellProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
