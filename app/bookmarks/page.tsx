import { LibraryRouteContent } from '@/routes/LibraryRouteContent';

// Alias historis: /bookmarks & /library merender konten yang sama
// (persis seperti getInitialView di App.tsx versi Vite).
export default function BookmarksRoute() {
  return <LibraryRouteContent />;
}
