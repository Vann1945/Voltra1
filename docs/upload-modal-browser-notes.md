# Upload Modal Browser Notes

Tanggal: 2026-08-24 GMT+7

Pada viewport desktop sandbox, halaman utama Voltra Marketplace termuat dengan empty state yang jelas dan navigasi yang rapi. Tombol `Sign in` membuka dialog autentikasi terpisah. Publish/upload modal tidak dapat dibuka dari kondisi unauthenticated, sehingga verifikasi visual langsung terhadap modal dan alur upload authenticated belum dapat dilakukan tanpa akun atau data backend.

Dialog autentikasi memiliki tombol close, field email/password, fallback reCAPTCHA, dan provider OAuth. Keterbatasan ini dicatat sebagai `BLOCKED` untuk pengujian browser end-to-end authenticated; typecheck, build, dan API unauthenticated tests tetap dapat dijalankan secara lokal.
