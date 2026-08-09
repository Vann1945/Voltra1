USE voltramarketplace;

-- Rate limiting berbasis DB supaya konsisten walau serverless function
-- restart/cold-start terus (in-memory counter akan reset tiap invocation baru,
-- jadi tidak bisa diandalkan di Vercel).
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key VARCHAR(191) NOT NULL PRIMARY KEY,
  count INT UNSIGNED NOT NULL DEFAULT 1,
  window_start BIGINT NOT NULL,
  KEY idx_rate_limits_window (window_start)
);
