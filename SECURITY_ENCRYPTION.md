# Enkripsi API Key Berlapis (Lapisan Kedua)

Dokumen ini menjelaskan cara **mengaktifkan** sistem enkripsi tambahan untuk
secret paling sensitif di aplikasi ini. Sistem ini OPSIONAL dan **aman untuk
di-deploy tanpa diaktifkan dulu** — semua kode otomatis fallback ke env var
polos (`TIDB_PASSWORD`, dst) kalau versi terenkripsi belum di-setup. Tidak
ada risiko "kunci lupa lock semua orang keluar" selama Anda mengikuti urutan
di bawah ini dengan hati-hati.

## Kenapa perlu?

Env var di Vercel sudah dienkripsi Vercel saat disimpan (lapisan pertama).
Lapisan kedua ini melindungi dari skenario tambahan: kalau ada dependency
nakal, kesalahan konfigurasi log, atau error yang tidak sengaja menampilkan
`process.env` mentah — secret yang dilindungi lapisan kedua tetap berupa
ciphertext yang tidak berguna tanpa `ENCRYPTION_MASTER_KEY` terpisah.

## Secret yang sudah didukung lapisan kedua

| Secret asli | Nama env var terenkripsi | Dibaca di |
|---|---|---|
| `TIDB_PASSWORD` | `TIDB_PASSWORD_ENC` | `src/lib/db.ts` |
| `SMTP_PASS` | `SMTP_PASS_ENC` | `src/lib/email.ts` |
| `CLOUDINARY_API_SECRET` | `CLOUDINARY_API_SECRET_ENC` | `api/upload-sign.ts` |
| `RECAPTCHA_SECRET_KEY` | `RECAPTCHA_SECRET_KEY_ENC` | `src/lib/recaptcha.server.ts` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | `FIREBASE_ADMIN_PRIVATE_KEY_ENC` | `src/lib/firebaseAdmin.ts` |
| `AUTH_SECRET` | `AUTH_SECRET_ENC` | `auth.config.ts` **dan** `src/lib/apiAuth.ts` (harus dua-duanya konsisten) |

## Cara mengaktifkan (per secret, bertahap)

**1. Generate kunci master (SEKALI SAJA untuk seluruh aplikasi):**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Simpan hasilnya sebagai env var **`ENCRYPTION_MASTER_KEY`** di Vercel
(Project Settings → Environment Variables). **JANGAN** commit nilai ini ke
git dengan alasan apa pun.

**2. Enkripsi tiap secret yang ingin dilindungi:**

```bash
export ENCRYPTION_MASTER_KEY="<nilai dari langkah 1>"
npx tsx scripts/encrypt-secret.ts "nilai-password-tidb-anda-yang-asli"
```

Script akan mencetak string berformat `v1:...` — inilah yang disimpan.

**3. Tambahkan sebagai env var baru di Vercel** (JANGAN hapus yang lama
dulu — lihat langkah 4):

```
TIDB_PASSWORD_ENC = v1:AbCd...==:EfGh...==:IjKl...==
```

**4. Deploy, lalu verifikasi aplikasi masih berjalan normal.** Kode akan
otomatis memakai versi terenkripsi begitu env var `_ENC`-nya ada.

**5. Setelah yakin semuanya berjalan lancar**, boleh hapus env var
plaintext lama (`TIDB_PASSWORD`, dst) dari Vercel — tapi ini opsional,
tidak wajib, dan tidak masalah kalau dibiarkan sebagai fallback jangka
panjang.

## Rotasi kunci master

Kalau `ENCRYPTION_MASTER_KEY` perlu diganti (mis. dicurigai bocor):
1. Generate kunci baru.
2. Dekripsi semua secret pakai kunci lama, enkripsi ulang pakai kunci baru
   (lakukan di mesin lokal yang aman, bukan lewat log/CI manapun).
3. Update `ENCRYPTION_MASTER_KEY` dan semua env var `*_ENC` di Vercel
   bersamaan dalam satu deploy.

## Peringatan penting

- Kalau `ENCRYPTION_MASTER_KEY` hilang SETELAH env var plaintext lama sudah
  dihapus, secret yang terenkripsi TIDAK BISA dipulihkan. Simpan salinan
  `ENCRYPTION_MASTER_KEY` di password manager tim yang aman, terpisah dari
  Vercel itu sendiri.
- `AUTH_SECRET_ENC` dipakai di DUA tempat (`auth.config.ts` dan
  `src/lib/apiAuth.ts`) — pastikan keduanya selalu baca dengan cara yang
  sama persis, atau sesi login akan gagal didekode di salah satu sisi.
