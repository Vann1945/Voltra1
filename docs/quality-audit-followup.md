# Full-Stack Quality Audit — Follow-up Upload, Panorama, dan Profile Settings

## Ringkasan eksekutif

Perbaikan lanjutan pada Voltra1 telah diterapkan untuk menjawab bug upload, panorama yang sulit dipakai, modal yang terlalu penuh, penomoran visual yang mengganggu, alur yang tidak langsung lanjut, serta UI Profile Settings yang kurang terstruktur. Upload modal sekarang menghapus nomor langkah yang terlihat, otomatis berpindah dari Essentials ketika field wajib sudah lengkap, otomatis berpindah dari Description setelah editor ditinggalkan dalam keadaan terisi, menampilkan panorama sebagai media card yang terlihat, dan mengompres image/panorama secara bounded sebelum request base64. Profile Settings sekarang memakai panel yang lebih terstruktur dengan counter karakter, validasi URL/nama, validasi ukuran dan tipe foto, upload feedback yang benar, serta dialog border yang memiliki focus management.

> Status: **typecheck, test, build, dan static hygiene lulus**. Authenticated upload, panorama provider, dan browser visual pada Profile Settings tetap perlu staging credentials untuk verifikasi end-to-end.

## Cakupan dan baseline

Repository yang diperbaiki adalah `Vann1945/Voltra1` pada clone lokal `/home/ubuntu/voltra1`, branch `main`, dengan perubahan lokal yang belum dipush. Baseline sebelumnya sudah memiliki redesign awal pada `UploadModal.tsx`, helper upload validation, dan test helper. Follow-up ini membangun di atas perubahan tersebut.

Audit meliputi `src/components/UploadModal.tsx`, `src/components/UserProfile.tsx`, `src/lib/uploadValidation.ts`, `api/upload-image.ts`, dan test yang berhubungan dengan upload/auth. Browser smoke test pada port lokal baru berhasil memuat public marketplace shell; autentikasi dan backend data tidak tersedia sehingga modal publish dan profile authenticated tidak dapat dibuka langsung.

## Status temuan

| ID | Prioritas | Temuan | Root cause | Perbaikan | Status |
|---|---:|---|---|---|---|
| FUP-001 | P1 | Panorama sering tidak terpakai karena kontrol berada di area optional dan proses image dapat melampaui batas payload base64. | Panorama tersembunyi di disclosure; kompresi tidak menjamin output di bawah batas request. | Panorama dipindah ke media card yang selalu terlihat; tersedia picker, drag-and-drop, keyboard fallback, ratio/width validation, dan recursive bounded WebP compression maksimal 4 MB. | FIXED secara statis; provider E2E BLOCKED |
| FUP-002 | P1 | Modal terasa penuh dan pengguna harus memahami nomor step sebelum melanjutkan. | Step marker numerik dan banyak field optional tampil sekaligus. | Nomor visual dihapus; label step dipadatkan menjadi Essentials, Description, dan Publish settings; optional details tetap progressive disclosure. | FIXED |
| FUP-003 | P2 | Pengisian tidak langsung membawa pengguna ke bagian berikutnya. | Perpindahan hanya bergantung pada tombol Continue. | Auto-advance satu kali setelah Essentials valid; Description auto-advance saat kehilangan focus dengan konten terisi; tombol dan step navigation tetap menjadi fallback. | FIXED |
| FUP-004 | P2 | Modal dapat menyimpan state lama setelah ditutup dan bisa tertutup ketika upload masih berjalan. | Draft dan progress tidak di-reset secara terpusat; close handler tidak menjaga upload state. | `handleClose` mereset draft/progress/step dan menolak close saat publish atau upload aktif. | FIXED |
| FUP-005 | P2 | Profile Settings terlalu menyatu dengan profile hero dan upload foto memberi feedback spinner yang kurang jelas. | Form memakai layout lama, label kecil, tanpa counter/validasi client, dan loader berbasis shimmer tidak konsisten. | Panel Profile Settings baru dengan hierarchy, counter nama/bio, maxLength, validasi URL, tipe/ukuran foto, progress bar, dan tombol Upload berlabel. | FIXED |
| FUP-006 | P2 | Border chooser dan delete dialog belum cukup kuat untuk keyboard interaction. | Dialog belum memasang semantics dan focus behavior lengkap. | Border chooser memakai `role=dialog`, `aria-modal`, `aria-labelledby`, Escape, initial focus, dan focus trap; delete dialog diberi semantics serupa. | FIXED sebagian; delete-dialog focus trap staging follow-up |
| FUP-007 | P2 | Upload profile/panorama/cover bergantung pada provider eksternal dan session authenticated. | Tidak ada credentials, session, atau fixture backend di sandbox. | Validation dan request guard diperketat tanpa memindahkan secret; kebutuhan staging test dicatat. | BLOCKED untuk E2E |

## Perbaikan teknis

### Upload dan panorama

Fungsi `convertToWebp` sekarang menerima `maxBytes` dan melakukan encoding berulang dengan kualitas serta canvas yang diturunkan sampai output berada di bawah batas aman atau dikembalikan sebagai error yang dapat dimengerti. Panorama memakai dimensi maksimum 1.800 px dan kualitas awal 0,76 agar tidak langsung menabrak batas base64 endpoint. Validasi panorama tetap menolak tipe selain JPG/PNG/WebP, file di atas 20 MB, lebar kurang dari 1.200 px, dan rasio kurang dari 16:10.

Panorama dipindah dari optional accordion ke `Header media` card yang terlihat pada langkah Essentials. Card mendukung drag-and-drop, Enter/Space, preview 21:9, remove action, progress bar, dan file picker yang konsisten. Cover upload tetap membatasi enam image dan empat MB per image, sedangkan file release tetap mendukung URL manual maupun upload file termasuk `.jar`.

### Modal flow

Nomor visual seperti `1`, `2`, `3`, dan badge `Step 1 of 3` dihapus dari tampilan. Navigasi tetap dapat diklik dan memiliki label semantik tanpa angka. `generalReady` memicu satu kali auto-advance ke Description ketika title, release URL, cover image, dan setiap version valid. Description berpindah ke Publish settings ketika pengguna meninggalkan editor dalam keadaan berisi; pengguna masih dapat kembali dengan Back atau memilih tab step secara langsung.

Close behavior sekarang tersentralisasi. Modal tidak dapat ditutup ketika loading, upload cover, panorama, atau release masih berjalan. Ketika benar-benar ditutup, draft, version list, progress, error, success state, disclosure state, dan auto-advance guard di-reset sehingga modal berikutnya dimulai dalam keadaan bersih.

### Profile Settings

Profile editor sekarang menjadi panel terpisah di dalam profile card dengan judul, helper text, badge editing, counter display name/bio, field URL yang responsif, tombol Upload berlabel, dan progress bar yang konsisten. Client memvalidasi nama tidak kosong, URL foto hanya HTTP/HTTPS, dan foto hanya JPG/PNG/WebP di bawah empat MB sebelum request.

Border chooser diperbaiki secara visual menjadi grid touch-friendly tiga kolom pada mobile dan lima kolom pada layar lebih luas. Modal border memiliki Escape, initial focus, focus trap, `aria-pressed` pada opsi, dan close button dengan accessible name. Empty states profile menggunakan surface dan spacing yang lebih konsisten; heading section tidak lagi uppercase berlebihan atau memakai shadow/filter dekoratif yang tidak diperlukan.

## Hasil verifikasi

| Pemeriksaan | Command/Metode | Hasil |
|---|---|---|
| Typecheck | `npm run lint` | PASS — `tsc --noEmit` selesai tanpa error |
| Unit/API test | `npx vitest run` | PASS — 2 test files, 9 tests passed |
| Production build | `npm run build` | PASS — Vite build berhasil |
| Diff hygiene | `git diff --check` | PASS |
| Static audit triage | `project_audit_scan.py` | PASS untuk tidak ada secret/debug baru pada area perubahan; sinyal lama di repository tetap perlu review terpisah |
| Public browser shell | `http://localhost:3001/` | PASS — marketplace shell dan empty state termuat |
| Authenticated modal | Browser manual | BLOCKED — tidak ada session pengguna |
| Panorama provider upload | Browser/API staging | BLOCKED — tidak ada provider credentials dan backend fixture |
| Profile Settings authenticated | Browser manual | BLOCKED — route membutuhkan login/data |

Stderr dari API tests berisi log expected untuk request unauthenticated yang sengaja menguji HTTP 401; test suite tetap lulus.

## Audit UI/UX

| Lensa | Hasil |
|---|---|
| Cognitive load | Nomor visual dihapus, optional fields dipindah, media dan release dibagi ke card dengan copy singkat. |
| Flow | Essentials → Description → Publish settings; auto-advance berjalan satu kali dan tombol tetap tersedia sebagai fallback. |
| Responsive | Profile form dan panorama/upload controls memakai layout mobile-first; authenticated visual viewport belum bisa diuji langsung. |
| Accessibility | Dialog semantics, Escape, focus trap, labels, `aria-live`, `role=alert`, keyboard dropzones, dan `aria-pressed` ditambahkan. |
| Visual consistency | Surface, radius, border, shadow, icon style, dan accent memakai token Voltra1 yang sudah ada. |
| Feedback | Upload progress, disabled state, toast existing, preview, success, dan validation error tersedia. |
| Safety | Secret tetap server-side; client validation hanya mempercepat feedback dan tidak menggantikan server validation. |

Implementasi mengikuti prinsip dialog modal, keyboard access, focus visibility, reflow, status messaging, dan target size dari [WCAG 2.2][1] serta pola dialog dari [WAI-ARIA Authoring Practices][2].

## Risiko tersisa dan tindak lanjut

Authenticated staging tetap wajib dilakukan sebelum production release. Gunakan creator account non-admin, fixture panorama valid 16:10 atau lebih lebar, file cover di bawah dan di atas empat MB, file release valid/invalid, throttled network, session expiry, duplicate click, partial failure, refresh setelah publish, dan modal reopen.

Implementasi belum menambahkan resumable/cancel transfer karena provider flow saat ini tidak mengekspos abortable task. Menambahkan tombol cancel tanpa task lifecycle dapat meninggalkan signed upload atau state setengah jadi. Item ini tetap ditahan sebagai pekerjaan API/provider terpisah.

Static audit masih menemukan beberapa unsafe cast dan hardcoded URL lama di area lain repository. Tidak ada yang diperlukan untuk memperbaiki bug upload/profile pada pass ini; item tersebut sebaiknya masuk audit hardening terpisah agar scope dan regression surface tidak melebar.

## Referensi

[1]: https://www.w3.org/TR/WCAG22/ — W3C, Web Content Accessibility Guidelines 2.2.
[2]: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ — WAI-ARIA Authoring Practices, Dialog Modal Pattern.
