## Audit visual preview 22 Agustus 2026

Preview lokal Home berhasil dimuat pada `http://localhost:3000/` dan tidak menghasilkan 404. Setelah menunggu render stabil, struktur halaman terlihat jelas: navbar, hero Marketplace, search/filter bar, dan empty state. Palet oranye sudah tampak konsisten dan judul hero terbaca.

Temuan utama: screenshot awal sempat tampak sangat pudar karena skeleton/animasi loading belum selesai, tetapi setelah render stabil kontras hero dan search baik. Empty state masih menampilkan `0 add-ons found`, yang wajar karena API lokal tidak menyediakan data. Tombol `CLEAR FILTERS` menggunakan aksen oranye dan terbaca. Navbar dan search/filter masih memiliki banyak kontrol rapat pada lebar mobile sehingga perlu dipantau pada viewport kecil.

Perbaikan yang telah dilakukan dalam iterasi ini mencakup pengurangan shadow/glass yang terlalu kuat, konsolidasi font ke Inter, radius kartu yang lebih konsisten, penghapusan scale hover pada AddonCard, CTA oranye, serta token dark/OLED yang tidak lagi memakai abu-abu hard-coded.
