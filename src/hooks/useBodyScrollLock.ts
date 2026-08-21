import { useEffect } from 'react';

// Bug UX yang ada di semua modal (Auth, Upload, Report, dll): background
// halaman masih bisa di-scroll selagi modal terbuka. Di mobile ini bikin
// pengalaman jadi kacau — jari nge-scroll modal malah ikut nge-scroll
// konten di belakangnya. Kunci scroll body selama modal terbuka, dan
// kembalikan seperti semula begitu ditutup/unmount.
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = 'hidden';
    // Kompensasi lebar scrollbar yang hilang biar layout tidak "geser"
    // (content-shift) saat modal dibuka/ditutup.
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isLocked]);
}
