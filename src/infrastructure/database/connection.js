// ============================================================
// Infrastructure: SQLite Database Connection
// ============================================================
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..', '..');
const DB_PATH = join(ROOT, 'data', 'wifi_billing.db');

/** @returns {import('better-sqlite3').Database} */
export function getDatabase() {
  const db = new Database(DB_PATH, { readonly: false });
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

/** @returns {import('better-sqlite3').Database} */
export function getReadonlyDatabase() {
  const db = new Database(DB_PATH, { readonly: true });
  db.pragma('journal_mode = WAL');
  return db;
}
