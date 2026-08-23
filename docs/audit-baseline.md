# Baseline Audit Notes

Tanggal audit: 2026-08-24 (GMT+7)
Repository: `Vann1945/Voltra1`, branch `main`, clean clone.

## Verifikasi baseline

| Pemeriksaan | Command/Metode | Hasil |
|---|---|---|
| Install | `npm ci --no-audit --no-fund` | Berhasil |
| Typecheck | `npm run lint` | Berhasil, tanpa error |
| Production build | `npm run build` | Berhasil, Vite 6.4.3 |
| Visual Explore | `http://localhost:3000/` | Halaman termuat; empty state menampilkan 0 projects karena API/data lokal tidak tersedia |
| Visual Streak | `http://localhost:3000/streak` | Halaman termuat; layout desktop terlihat rapi tetapi memakai sistem visual terpisah dari marketplace |

## Temuan awal

- Quick Actions pada menu mobile di `Navbar.tsx` memuat tombol `Library` selain Streak; bottom navigation mobile juga menjadikan `Library` sebagai tab utama. Desktop primary navigation dan profile menu juga memuat Library.
- Route `/library` dan alias `/bookmarks` masih dipetakan ke `BookmarksPage`; mekanisme saved/liked memakai bookmark persistence terpisah dan sebaiknya tidak dihapus hanya karena entri navigasi Library dihilangkan.
- Copy aksi simpan di `AddonCard.tsx`, `AddonDetail.tsx`, dan `UserProfile.tsx` masih menggunakan istilah Library sehingga perlu distandardisasi menjadi Saved/Bookmarks jika Library dikeluarkan dari Quick Actions.
- `src/index.css` memiliki token marketplace dan token Streak yang terpisah, termasuk alias/kelas `glass` dan `neumorph`, sehingga konsistensi lintas halaman perlu diperkuat tanpa menghilangkan dukungan tema light/dark/OLED.
- `StreakApp.tsx` menggunakan `fetchRemoteHabit()` yang gagal secara diam-diam ketika API/session tidak tersedia; baseline tetap usable karena localStorage fallback, tetapi feedback sinkronisasi perlu diperbaiki agar tidak menyesatkan.
- UI baseline secara visual: warna netral dingin + terracotta, spacing umumnya lega, tetapi ada beberapa label kecil dan teks yang terlalu rapat pada area status/stats; akan ditinjau pada audit komponen dan viewport.

## Batasan baseline

- Data backend/akun tidak tersedia di lingkungan lokal, sehingga alur autentikasi, upload, operasi admin, persistence database, dan endpoint eksternal belum dapat diverifikasi secara end-to-end pada baseline.

## Verifikasi visual pascaperbaikan pertama

- Explore sekarang menampilkan `Saved` pada navigasi desktop, bukan `Library`.
- Empty state tidak lagi menampilkan tombol `Clear filters` saat tidak ada kriteria aktif; copy menjelaskan bahwa belum ada proyek yang dipublikasikan.
- Streak sekarang menampilkan status `Saved on this device` ketika endpoint habit tidak tersedia/akun belum login, sehingga kegagalan sinkronisasi tidak lagi diam-diam.
- Background/surface Streak tetap terlihat valid pada light theme setelah token `--color-cool-bg`/`--color-cool-surface` diganti ke token paper/parchment yang tersedia.
- Keterbatasan: viewport browser sandbox desktop; uji mobile nyata dan alur authenticated belum dilakukan karena tidak ada sesi pengguna/data backend lokal.
