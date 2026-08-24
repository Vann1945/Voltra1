# Laporan Implementasi Voltra1 Marketplace

**Status:** Selesai diimplementasikan dan diverifikasi pada checkout lokal `Vann1945/Voltra1`.

## Ringkasan

Perubahan telah diterapkan pada alur Marketplace, koleksi Bookmark, Settings, Streak, detail add-on, upload, dan API pembuatan add-on. Fokus utama implementasi adalah memperjelas istilah add-on, menampilkan status pending secara langsung, memindahkan preferensi tampilan ke Settings, memperbaiki refresh setelah publish, menghilangkan tombol Next pada carousel detail, serta menjaga Streak dapat digunakan tanpa login.

## Perubahan fungsional

| Area | Implementasi |
|---|---|
| Home Marketplace | Hero diubah menjadi **Voltra Marketplace** dengan subjudul **Find Some New Add-on**. Istilah `project/projects` pada area Marketplace diganti menjadi `add-on/add-ons`. |
| Pending card | Card grid dan list menampilkan badge **Pending** ketika `addon.status === 'pending'`; status juga terlihat pada kartu compact/list. |
| Membuka card | Klik card tetap menuju halaman detail add-on secara langsung. Area demo tetap menjadi bagian terpisah di halaman detail, tidak menjadi preview pembuka card. |
| Upload real-time | `UploadModal` menerima callback `onPublished`; setelah respons publish berhasil, `App` memanggil `refetchAddons()` sehingga add-on baru segera masuk ke data Marketplace tanpa refresh manual. |
| Bookmark | `Saved projects` diubah menjadi **Bookmark**, termasuk heading, tab, empty state, toast, dan label aksi. |
| Settings | Route `/settings` baru dibuat. Kontrol **Grid/List** dan **Light/Dark/OLED** dipusatkan di halaman ini dan tersedia tanpa login. |
| Quick Action | Menu mobile sekarang memiliki item **Streak** tanpa syarat login, dan Settings tersedia dari menu tersebut. |
| Streak anonymous | Jalur Streak tetap local-first dan dapat menyimpan progres di perangkat tanpa login. Verifikasi browser menunjukkan tombol Complete mengubah streak dari 0 menjadi 1 tanpa membuka auth. |
| Carousel card/detail | Tombol arrow Previous/Next pada media detail dihapus. Navigasi gambar dilakukan dengan swipe/pointer gesture; indikator gambar tetap tersedia sebagai fallback langsung. |
| Panorama | Label `Interactive preview` dan `Explore the panorama` diubah menjadi **Panorama** dengan instruksi geser yang lebih ringkas. |
| Border/focus | Avatar border diberi stacking context `isolate` dan layer konten yang stabil. Global focus diberi `scroll-padding`/`scroll-margin` agar border/focus tidak tertutup sticky navigation dan tidak memaksa pengguna mengikuti posisi elemen. |
| API atomicity | Pembuatan add-on dan `addon_versions` sekarang dilakukan dalam satu transaksi database dengan rollback dan release koneksi, sehingga kegagalan insert versi tidak meninggalkan record pending parsial. |

## Verifikasi

| Pemeriksaan | Hasil |
|---|---:|
| `npm run lint` / TypeScript `tsc --noEmit` | Lulus |
| `npm run build` | Lulus; Vite berhasil mentransformasi 2.150 module |
| `npx vitest run` | Lulus; 2 test files, 9 tests |
| `git diff --check` | Lulus |
| Browser `/settings` anonymous | Lulus; Grid/List dan Light/Dark/OLED terlihat |
| Browser `/streak` anonymous | Lulus; Complete mengubah streak lokal 0 menjadi 1 |
| Browser `/` Marketplace | Lulus; copy hero dan istilah add-on terlihat, `0 add-ons` tampil pada empty state |

## Catatan validasi

Pengujian publish end-to-end dengan akun dan database produksi tidak dijalankan karena membutuhkan sesi autentikasi serta data backend nyata. Namun, jalur tanpa autentikasi tetap diuji melalui suite API yang sudah tersedia, dan perubahan transaksi telah lolos TypeScript, build produksi, serta seluruh test suite lokal.

## File penting

Perubahan utama berada di `src/App.tsx`, `src/components/SettingsPage.tsx`, `src/components/Marketplace.tsx`, `src/components/AddonCard.tsx`, `src/components/AddonDetail.tsx`, `src/components/Navbar.tsx`, `src/components/BookmarksPage.tsx`, `src/components/UploadModal.tsx`, `src/components/PanoramaViewer.tsx`, `src/components/borderEffects.tsx`, `src/index.css`, dan `api/addons.ts`.
