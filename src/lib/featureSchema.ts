import { getPool } from './db';

let schemaPromise: Promise<void> | null = null;

export function ensureFeatureTables(): Promise<void> {
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    const pool = getPool();
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS addon_versions (
        id VARCHAR(100) NOT NULL PRIMARY KEY,
        addon_id VARCHAR(100) NOT NULL,
        version VARCHAR(80) NOT NULL,
        download_url VARCHAR(2000) NOT NULL,
        changelog TEXT NULL,
        compatibility_notes VARCHAR(1000) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY addon_versions_addon_version (addon_id, version),
        KEY addon_versions_addon_id (addon_id)
      )
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id VARCHAR(200) NOT NULL PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        addon_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY bookmarks_user_addon (user_id, addon_id),
        KEY bookmarks_addon_id (addon_id)
      )
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS addon_collaborators (
        id VARCHAR(100) NOT NULL PRIMARY KEY,
        addon_id VARCHAR(100) NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY addon_collaborators_addon_user (addon_id, user_id),
        KEY addon_collaborators_addon_id (addon_id),
        KEY addon_collaborators_user_id (user_id)
      )
    `);
  })().catch(error => {
    schemaPromise = null;
    throw error;
  });

  return schemaPromise;
}
