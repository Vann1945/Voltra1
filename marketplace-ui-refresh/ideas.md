# Arah Desain UI/UX — Marketplace UI Refresh

## Tiga Pendekatan

| Tema | Pengantar Singkat | Probabilitas |
| --- | --- | --- |
| **Kebun Terukur** | Marketplace terasa seperti katalog ruang yang tenang dan terpercaya: hijau alami, struktur editorial, serta informasi keputusan yang sangat jelas. | 0,07 |
| **Pasar Pagi** | Antarmuka hangat dan taktil dengan aksen tanah liat, ritme kartu asimetris, serta rasa eksplorasi yang ringan. | 0,03 |
| **Studio Tenang** | Sistem monokrom netral yang sangat ringkas, dengan fokus pada data dan pencarian cepat sebagai pusat pengalaman. | 0,09 |

## Pendekatan Terpilih — Kebun Terukur

### Design Movement

**Contemporary editorial hospitality** yang disederhanakan untuk marketplace mobile. Pendekatan ini memakai ketenangan visual fotografi ruang dan disiplin informasi produk digital, bukan panel besar atau dekorasi berlebihan.

### Core Principles

1. **Satu tujuan utama per area.** Header hanya untuk menemukan ruang; kartu hanya untuk membandingkan; menu hanya untuk aksi akun.
2. **Informasi sebelum ornamen.** Harga, jarak, ketersediaan, dan rating tampil sebagai unit yang mudah dipindai.
3. **Kedalaman ringan.** Permukaan putih hangat, garis batas transparan, dan bayangan rendah dipakai untuk hierarki, tidak untuk efek dramatis.
4. **Gerak yang terasa responsif.** Interaksi memakai transform dan opacity, durasi singkat, serta kurva easing yang lincah; animasi hanya hadir ketika memperjelas perubahan state.

### Color Philosophy

Sebagian besar tampilan menggunakan **kanvas oat pucat** dan putih hangat agar konten ruang terasa lapang. Evergreen gelap memberi rasa stabil dan mudah dibaca; **terracotta bata** menjadi aksen kepemilikan untuk tindakan penting, status aktif, dan penilaian. Rasio targetnya 60% netral terang, 30% evergreen / warna gambar alam, dan 10% terracotta.

### Layout Paradigm

Mobile memakai alur vertikal berjenjang: navigasi padat di atas, pita pencarian terpisah, hero editorial asimetris, lalu deret listing yang seperti catatan katalog. Pada desktop, panel filter tetap berada di sisi kiri dan koleksi listing mengalir di kanan; tidak ada kumpulan kartu generik yang dipusatkan tanpa konteks.

### Signature Elements

1. **Pill pencarian berprofil rendah** dengan filter kontekstual dan label status jelas.
2. **Rating desimal berkoma** seperti `4,8`, disandingkan jumlah ulasan, tanpa klaim testimonial atau ulasan fiktif.
3. **Bingkai editorial tipis** pada gambar listing, dengan foto sebagai sumber warna dan tekstur utama.

### Interaction Philosophy

Setiap aksi menampilkan umpan balik segera: tombol mengecil saat ditekan, tab berpindah dengan indikator geser, dan sheet menu memiliki area sentuh besar serta alternatif tombol untuk semua gestur. Input rating menerima titik atau koma, lalu normalisasi tampilannya konsisten menjadi koma sesuai konteks Indonesia.

### Animation

Interaksi berfrekuensi tinggi memakai transisi 120–180 ms. Drawer, modal, dan bottom sheet memakai 220–300 ms dengan `cubic-bezier(0.23, 1, 0.32, 1)`, serta hanya mengubah transform dan opacity. Kartu dapat bergeser sedikit saat hover di desktop dan menekan 0,97 saat tap. Mode reduced-motion menghapus gerak non-esensial.

### Typography System

**DM Sans** dipakai untuk antarmuka dan data karena mudah dibaca pada ukuran kecil; **DM Serif Display** dipakai khusus untuk judul editorial dan tidak lebih dari satu tingkat heading per layar. Hierarki dibatasi pada empat ukuran: 12, 14, 16, dan 30 px; dua bobot utama: 500 dan 700.

### Brand Essence

**Marketplace ruang yang membuat orang menemukan, menilai, dan mengelola tempat dengan cepat tanpa kehilangan rasa percaya.** Kepribadian: tenang, cermat, hangat.

### Brand Voice

Bahasa antarmuka ringkas, konkret, dan berorientasi keputusan; CTA menjelaskan konsekuensi aksinya.

> “Temukan ruang yang pas untuk rencana hari ini.”

> “Nilai pengalamanmu dengan skor yang presisi.”

### Wordmark & Logo

Mark berbentuk **pintu terbuka yang menyatu dengan penanda arah**, menggambarkan penemuan ruang dan akses. Simbol digunakan tanpa menumpukan nama merek dalam font bawaan.

### Signature Brand Color

**Bata Senja — `#B9553C`**. Warna ini hanya digunakan untuk tindakan inti, indikator aktif, dan elemen kepercayaan agar tetap terasa milik produk ini.

## Keputusan Audit Awal dari Referensi

| Temuan | Dampak | Arah Perbaikan |
| --- | --- | --- |
| Bottom sheet terlalu tinggi dan memberi terlalu banyak prioritas yang sama pada setiap aksi. | Konten di belakang hilang, pemindaian tindakan menjadi lambat. | Menu dipadatkan, dikelompokkan berdasarkan tugas, dan memiliki hierarki aksi primer–sekunder–destruktif. |
| Navigasi bawah di belakang modal masih terbaca. | Fokus visual terbagi dan state terasa bertumpuk. | Backdrop dibuat lebih konsisten dengan blur ringan dan kontras yang aman; sheet menjadi satu-satunya fokus. |
| Gaya tombol, border, dan daftar bercampur. | Tampilan terasa seperti beberapa sistem UI yang berbeda. | Token radius, shadow, ukuran ikon, dan spacing 8-pt diseragamkan. |
| Kualitas rating belum disampaikan dengan presisi lokal. | Informasi reputasi kurang informatif. | Tampilkan dan masukkan rating dalam format desimal berkoma, dengan validasi 0,0–5,0. |

## Style Decisions

1. **DM Serif Display** hanya muncul pada headline editorial utama di setiap layar. Nama listing, harga, lokasi, ketersediaan, rating, navigasi, dan aksi memakai **DM Sans** agar komparasi marketplace lebih cepat.
2. Pada desktop, rel kiri menjadi alat **discovery dan penyaringan**. Aksi akun, ruang milik pengguna, dan unggah listing berada pada menu sekunder sehingga tidak mengganggu pencarian.
3. Urutan data di kartu listing dikunci menjadi **lokasi → harga → ketersediaan → nilai dalam format koma → aksi penilaian**. Tidak ada rating agregat atau jumlah ulasan yang dibuat-buat; nilai baru muncul setelah pengguna mengisi skor.
