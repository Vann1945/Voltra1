USE voltramarketplace;

-- Query listing utama (api/addons.ts) selalu filter `status` + sort
-- `created_at` bersamaan. Index gabungan ini memungkinkan TiDB memenuhi
-- filter DAN urutan dari satu index scan, alih-alih dua operasi terpisah —
-- penting untuk endpoint dengan traffic tertinggi di aplikasi ini.
ALTER TABLE addons ADD INDEX idx_addons_status_created (status, created_at);
