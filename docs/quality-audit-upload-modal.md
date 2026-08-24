# Full-Stack Quality Audit — Upload Modal

## Ringkasan eksekutif

Upload modal Voltra1 telah diperbaiki pada branch kerja lokal dari repository `Vann1945/Voltra1`. Perubahan memusatkan alur publish menjadi lebih ringkas melalui struktur essentials, release files, dan optional details; menambahkan drag-and-drop untuk cover image dan file release utama; menambahkan preview grid, batas enam cover image, validasi tipe dan ukuran client-side, dukungan `.jar` pada pemilih file, progressive disclosure untuk release notes dan opsi lanjutan, serta dialog keyboard behavior yang lebih aman. Typecheck, unit/API tests, production build, dan `git diff --check` lulus. Pengujian authenticated end-to-end di browser masih `BLOCKED` karena environment lokal tidak memiliki sesi pengguna maupun backend/data produksi.

> Status keseluruhan: **siap untuk code review dan pengujian authenticated staging**, tetapi belum dapat dinyatakan fully verified untuk upload Cloudinary/tiDB end-to-end tanpa kredensial dan data uji.

## Cakupan dan keterbatasan

Audit mencakup `src/components/UploadModal.tsx`, helper baru `src/lib/uploadValidation.ts`, test baru `tests/upload-modal.utils.test.ts`, endpoint `api/upload-image.ts`, build configuration, serta observasi browser pada halaman marketplace dan dialog autentikasi. Baseline proyek dibaca dari `docs/audit-baseline.md`; baseline tersebut mencatat bahwa authenticated upload, persistence database, dan endpoint eksternal belum dapat diuji pada environment lokal.

Pemeriksaan browser dilakukan pada viewport desktop sandbox. Halaman Explore dan dialog Sign in dapat dibuka. Entry point publish/upload tidak tersedia sebelum autentikasi, sehingga drag-and-drop, upload progress pada provider eksternal, modal mobile, dan focus trap tidak dapat diklik secara langsung dalam sesi ini. Tidak ada perubahan terhadap schema database, authentication policy, storage credential, atau deployment production.

## Status temuan

| ID | Prioritas | Area | Ringkasan | Status | Bukti |
|---|---:|---|---|---|---|
| UM-001 | P2 | UI/UX | Modal sebelumnya menampilkan banyak field opsional dalam satu layar general sehingga tinggi, padat, dan sulit dipindai. | FIXED | Struktur essentials dan optional disclosure pada `src/components/UploadModal.tsx`. |
| UM-002 | P2 | Interaction | Upload cover image hanya menyediakan tombol file picker dan tidak memberi drop target yang jelas. | FIXED | Dropzone keyboard-accessible dengan drag-over state dan preview grid. |
| UM-003 | P1 | Validation | Batas tipe/ukuran cover image belum diberi feedback awal yang konsisten sebelum request. | FIXED | `getCoverFileError` pada `src/lib/uploadValidation.ts`, terhubung ke upload flow. |
| UM-004 | P2 | Release workflow | Upload file release dan input URL berada dalam kontrol yang sama tetapi tidak menjelaskan bahwa file dapat di-drop. | FIXED | Release card dengan placeholder `Paste URL or drop file`, drag state, dan dukungan `.jar`. |
| UM-005 | P2 | Accessibility | Dialog belum memiliki deskripsi terhubung, focus entry yang eksplisit, focus trap, atau error announcement yang jelas. | FIXED | `aria-describedby`, initial focus, Tab trap, Escape, `role=alert`, dan label aksi ikon. |
| UM-006 | P2 | Responsive | Modal sudah bottom-sheet di mobile, tetapi layout dan density lama berpotensi membuat sesi publish terlalu panjang untuk layar kecil. | FIXED | Padding responsive, card compact, sticky footer existing, dan optional sections yang collapsed-capable. Visual mobile langsung masih BLOCKED tanpa sesi authenticated. |
| UM-007 | P1 | E2E/storage | Upload aktual ke ImageKit/Cloudinary signed flow belum dapat diverifikasi tanpa sesi, credential provider, dan data backend. | BLOCKED | Browser sandbox unauthenticated; test yang tersedia hanya memverifikasi 401 pada `/api/upload-image`. |
| UM-008 | P2 | Cancellation | Upload per file belum memiliki cancel/resumable transfer karena kontrak client/provider saat ini memakai XHR/fetch yang tidak diekspos sebagai abortable task. | WONT_FIX_JUSTIFIED | Menambah cancel tanpa mengubah kontrak provider berisiko meninggalkan signed upload atau state setengah jadi; perlu desain API/task lifecycle tersendiri. |

## Perbaikan yang diterapkan

### Struktur dan visual

Modal sekarang menggunakan header publish yang lebih ringkas dengan judul, deskripsi singkat, tombol close, dan navigasi tiga langkah yang memiliki label ringkas pada desktop serta nomor yang tetap terbaca pada mobile. Surface memakai border, radius, shadow, dan warna yang mengikuti token Voltra1; tidak ada sistem warna baru atau dependency visual baru.

Area general dipecah menjadi beberapa card yang mudah dipindai. Essentials mengelompokkan title dan category. Tags menggunakan counter `0/20` dan token preview. Release files memprioritaskan file atau URL versi aktif, menyembunyikan changelog dan compatibility notes di disclosure, dan mempertahankan versi kedua sebagai opsi. Demo video, comments, unlisted, serta panorama dipindahkan ke satu disclosure optional agar tidak memenuhi layar awal.

### Fitur upload baru

Cover images sekarang mendukung pemilihan beberapa file melalui input yang sama dan drag-and-drop. Pengguna melihat preview grid hingga enam gambar, penanda `Main` pada gambar pertama, aksi remove per gambar, progres batch, dan feedback ketika limit tercapai. Hanya JPG, PNG, dan WebP yang diterima pada client; setiap cover dibatasi maksimal 4 MB agar selaras dengan batas base64 endpoint image yang ada.

File release utama dapat dipilih dari file picker atau di-drop pada area URL versi pertama. Allowed extension yang ditampilkan pada input mencakup `.mcaddon`, `.mcpack`, `.mcworld`, `.mctemplate`, `.zip`, dan `.jar`, konsisten dengan validasi `uploadAddonFile`. URL manual tetap tersedia sehingga fitur baru tidak menggantikan alur lama.

### Accessibility dan interaction

Dialog memiliki `aria-labelledby` dan `aria-describedby`, tombol close dengan accessible name, focus awal ke tombol close, keyboard Escape ketika tidak sedang submit, serta focus trap ketika pengguna menekan Tab. Dropzone cover memiliki role button, `tabIndex`, dukungan Enter/Space, dan focus ring. Error validasi pada footer memakai `role="alert"`, sedangkan upload progress memakai `aria-live="polite"`. Animasi modal tetap menghormati `useReducedMotion` yang sudah digunakan proyek.

## Verifikasi

| Pemeriksaan | Command/Metode | Hasil | Catatan |
|---|---|---|---|
| Dependency install | `npm ci --no-audit --no-fund` | PASS | Install berhasil; npm menampilkan warning dependency deprecated yang tidak berasal dari perubahan modal. |
| Typecheck | `npm run lint` | PASS | `tsc --noEmit` selesai tanpa error. |
| Unit/API tests | `npx vitest run` | PASS | 2 test files, 9 tests passed. Ada stderr expected dari security tests yang menguji unauthenticated requests. |
| Helper regression | `tests/upload-modal.utils.test.ts` | PASS | Tag normalization, tipe cover, dan batas 4 MB diverifikasi. |
| Production build | `npm run build` | PASS | Vite 6.4.3 berhasil menghasilkan dist production. |
| Diff hygiene | `git diff --check` | PASS | Tidak ada whitespace error. |
| Browser Explore | `http://localhost:3000/` | PASS | Halaman marketplace dan empty state termuat. |
| Browser auth gate | Klik Sign in | PASS | Dialog autentikasi termuat; publish tidak dapat dilanjutkan tanpa sesi. |
| Browser authenticated upload | Manual | BLOCKED | Tidak ada akun/sesi dan data backend lokal. |
| Provider upload | ImageKit/Cloudinary | BLOCKED | Credential provider dan authenticated request tidak tersedia pada environment audit. |

## Audit UI/UX dan accessibility

| Lensa | Hasil |
|---|---|
| Flow | Tiga langkah dipertahankan agar kontrak form tidak berubah, tetapi langkah pertama diringkas dan opsi lanjutan dipindahkan ke disclosure. |
| Visual hierarchy | Essentials, tags, release files, dan optional details memiliki grouping dan heading yang jelas. |
| Spacing | Perubahan memakai spacing utility yang dominan 8/16/24 px dan radius token yang konsisten. |
| Color | Menggunakan token paper/parchment/terracotta yang sudah ada; aksen dibatasi pada CTA, status, dan progress. |
| Typography | Copy instruksi dipendekkan; ukuran tetap pada skala kecil/base/heading yang digunakan design system proyek. |
| Feedback | Progress, toast existing, success state, drag-over state, disabled state, dan inline alert tersedia. |
| Keyboard | Close, step navigation, dropzone, form fields, details disclosure, dan footer dapat dijangkau; focus trap dipasang pada dialog. |
| Mobile | Modal tetap full-height/bottom-sheet dengan safe-area footer existing; authenticated viewport test masih BLOCKED. |
| Reduced motion | Transisi modal mengikuti `useReducedMotion`; tidak ditambah animasi wajib baru. |

Audit mengikuti prinsip dialog, status message, keyboard access, focus visibility, reflow, dan target interaction dari [WCAG 2.2][1] serta pola widget dialog dari [WAI-ARIA Authoring Practices][2].

## Audit API dan keamanan

Endpoint `/api/upload-image` tetap mensyaratkan `requireUser`, rate-limit per user, batas payload base64, pemeriksaan alphabet base64, pemeriksaan image signature, dan server-side credential isolation. Regression test yang tersedia mengonfirmasi request image tanpa auth menghasilkan HTTP 401. Perubahan ini tidak melemahkan validasi server-side dan tidak memindahkan credential ke browser.

Signed release upload tetap memakai flow provider yang sudah ada. Karena endpoint sign dan provider upload memerlukan authenticated configuration eksternal, keberhasilan upload provider tidak diklaim terverifikasi. Audit staging berikutnya perlu menguji actor authenticated, malformed payload, oversize payload, unauthorized/forbidden resource, timeout, retry, dan duplicate submission sesuai prinsip [OWASP API Security][3].

## Audit stabilitas

Putaran yang dijalankan berfokus pada sepuluh lensa: functional, state/error, responsive, visual consistency, typography, spacing/layout, accessibility, API/security, data/concurrency, dan performance/operability. Tidak ada temuan baru pada typecheck, unit/API test, production build, atau diff hygiene setelah perbaikan terakhir. Siklus authenticated visual tidak dapat ditutup dua putaran karena akses sesi dan provider tidak tersedia; area tersebut tetap `BLOCKED`, bukan dianggap lulus.

## Risiko tersisa dan tindak lanjut

Risiko terbesar adalah belum adanya bukti end-to-end untuk file upload nyata, persistence add-on, dan modal pada mobile authenticated viewport. Sebelum merge atau deploy production, jalankan staging dengan akun creator non-admin, provider storage sandbox, fixture file valid/invalid, dan network throttling. Uji minimal satu batch multi-cover, satu file release `.jar` atau `.mcpack`, partial failure, session expiry, refresh setelah publish, dan duplicate click pada CTA.

Peningkatan berikutnya yang aman adalah membuat upload task abortable dan resumable di level service/provider, bukan menambahkan tombol cancel yang hanya mengubah state UI. Audit juga merekomendasikan peninjauan ulang warning dependency deprecated dan roadmap rate limiting upload yang tercatat di README, tetapi keduanya berada di luar perubahan UI modal ini.

## Referensi

[1]: https://www.w3.org/TR/WCAG22/ — W3C, Web Content Accessibility Guidelines (WCAG) 2.2.
[2]: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ — WAI-ARIA Authoring Practices, Dialog (Modal) Pattern.
[3]: https://owasp.org/API-Security/ — OWASP, API Security.
