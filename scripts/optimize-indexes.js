import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  if (!process.env.TIDB_HOST) {
    console.log('Skipping index optimization: TIDB_HOST is not set (not in production/preview).');
    return;
  }

  console.log('Connecting to TiDB for index optimization...');
  const pool = mysql.createPool({
    host: process.env.TIDB_HOST,
    port: Number(process.env.TIDB_PORT || 4000),
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DATABASE,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    waitForConnections: true,
    connectionLimit: 1,
  });

  const queries = [
    // Addons table: frequently filtered by status, author_id, and ordered by created_at
    "CREATE INDEX idx_addons_status_created_at ON addons(status, created_at);",
    "CREATE INDEX idx_addons_author_id ON addons(author_id);",
    
    // Reviews table: frequently queried by addon_id and ordered by created_at
    "CREATE INDEX idx_reviews_addon_id_created_at ON reviews(addon_id, created_at);",
    
    // Reports table: queried by user_id and ordered by created_at, or addon_id + user_id + status
    "CREATE INDEX idx_reports_user_id_created_at ON reports(user_id, created_at);",
    "CREATE INDEX idx_reports_addon_user_status ON reports(addon_id, user_id, status);",
    
    // Likes table: queried by user_id
    "CREATE INDEX idx_likes_user_id ON likes(user_id);",
    
    // Habits table: queried by user_id
    "CREATE INDEX idx_habits_user_id ON habits(user_id);"
  ];

  for (const q of queries) {
    try {
      console.log(`Executing: ${q}`);
      await pool.execute(q);
      console.log('Success.');
    } catch (err) {
      // Ignore "Duplicate key name" errors if the index already exists
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('Index already exists, skipping.');
      } else {
        console.error(`Failed: ${err.message}`);
      }
    }
  }

  await pool.end();
  console.log('Optimization complete.');
}

run().catch(console.error);
