USE voltramarketplace;

CREATE TABLE users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NULL,
  photo_url TEXT NULL,
  role ENUM('user','admin','banned','suspended') NOT NULL DEFAULT 'user',
  bio TEXT NULL,
  profile_border VARCHAR(50) NOT NULL DEFAULT 'none',
  password_hash VARCHAR(255) NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verify_token VARCHAR(255) NULL,
  verify_token_expires BIGINT NULL,
  reset_token VARCHAR(255) NULL,
  reset_token_expires BIGINT NULL,
  linked_providers JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_verify_token (verify_token),
  KEY idx_users_reset_token (reset_token)
);

CREATE TABLE addons (
  id CHAR(36) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description LONGTEXT NULL,
  category VARCHAR(100) NULL,
  additional_category VARCHAR(100) NULL,
  project_class VARCHAR(100) NULL,
  image_url TEXT NULL,
  image_urls JSON NULL,
  tags JSON NULL,
  download_url TEXT NULL,
  demo_url TEXT NULL,
  license VARCHAR(100) NULL,
  distribution_pref VARCHAR(100) NULL,
  socials JSON NULL,
  author_id CHAR(36) NOT NULL,
  author_name VARCHAR(255) NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  unlisted BOOLEAN NOT NULL DEFAULT FALSE,
  allow_comments BOOLEAN NOT NULL DEFAULT TRUE,
  likes_count INT UNSIGNED NOT NULL DEFAULT 0,
  downloads_count INT UNSIGNED  NOT NULL DEFAULT 0,
  rating_count INT UNSIGNED  NOT NULL DEFAULT 0,
  average_rating DECIMAL(3,2)  NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_addons_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_addons_author (author_id),
  KEY idx_addons_status (status),
  KEY idx_addons_category (category),
  KEY idx_addons_created (created_at),
  -- Index gabungan: query listing utama SELALU filter status + sort created_at
  -- bersamaan (lihat api/addons.ts). Index terpisah di atas cuma bisa
  -- membantu salah satu, TiDB tetap perlu extra sort/scan. Index gabungan ini
  -- memungkinkan filter+sort dipenuhi dari satu index scan saja.
  KEY idx_addons_status_created (status, created_at)
);

CREATE TABLE likes (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  addon_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_likes_addon FOREIGN KEY (addon_id) REFERENCES addons(id) ON DELETE CASCADE,
  UNIQUE KEY uq_likes_user_addon (user_id, addon_id),
  KEY idx_likes_addon (addon_id)
);

CREATE TABLE reviews (
  id CHAR(36) NOT NULL PRIMARY KEY,
  addon_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  user_name VARCHAR(255) NULL,
  user_photo TEXT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_addon FOREIGN KEY (addon_id) REFERENCES addons(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_reviews_user_addon (user_id, addon_id),
  KEY idx_reviews_addon (addon_id, created_at)
);

CREATE TABLE reports (
  id CHAR(36) NOT NULL PRIMARY KEY,
  addon_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending','resolved') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reports_addon FOREIGN KEY (addon_id) REFERENCES addons(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_reports_status (status),
  KEY idx_reports_addon (addon_id)
);
