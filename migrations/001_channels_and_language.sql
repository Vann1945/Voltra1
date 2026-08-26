-- Voltra1 channel and language migration.
-- Run after the existing users/addons schema is present.

CREATE TABLE IF NOT EXISTS channels (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  avatar_url VARCHAR(2000) NULL,
  cover_url VARCHAR(2000) NULL,
  owner_id VARCHAR(64) NOT NULL,
  status ENUM('draft', 'published', 'suspended') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_channels_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_channels_owner_status (owner_id, status),
  INDEX idx_channels_status_updated (status, updated_at)
);

CREATE TABLE IF NOT EXISTS channel_admins (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  channel_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  role ENUM('owner', 'admin') NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_channel_admin (channel_id, user_id),
  CONSTRAINT fk_channel_admins_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
  CONSTRAINT fk_channel_admins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_channel_admins_user (user_id)
);

CREATE TABLE IF NOT EXISTS channel_updates (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  channel_id VARCHAR(64) NOT NULL,
  title VARCHAR(120) NOT NULL,
  body TEXT NOT NULL,
  media_url VARCHAR(2000) NULL,
  publish_at DATETIME NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_channel_updates_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
  CONSTRAINT fk_channel_updates_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_channel_updates_feed (channel_id, status, publish_at, created_at)
);

-- Safe on databases where the preference column is not present. If your TiDB
-- version does not support ADD COLUMN IF NOT EXISTS, run this statement once
-- through the migration runner's idempotent schema step instead.
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(2) NOT NULL DEFAULT 'id';
